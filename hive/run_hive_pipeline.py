"""
Module 3: Hive Layer & Transformations via PySpark / Spark SQL.
Reads raw data from HDFS raw zone, cleans transactions, performs RFM and category aggregations,
and saves tables as optimized Parquet in HDFS / Warehouse.
"""
import os
import sys
from pyspark.sql import SparkSession
from pyspark.sql import functions as F

HDFS_BASE = "hdfs://localhost:9000"
RAW_TX_PATH = f"{HDFS_BASE}/retail/raw/transactions/transactions.csv"
RAW_PROD_PATH = f"{HDFS_BASE}/retail/raw/products/*/products.csv"

OUT_CLEAN_TX = f"{HDFS_BASE}/retail/warehouse/clean_transactions"
OUT_RFM_AGG = f"{HDFS_BASE}/retail/warehouse/rfm_aggregates"
OUT_CAT_ENRICH = f"{HDFS_BASE}/retail/warehouse/category_enrichment"

# Fallback local paths in case HDFS is accessed in local mode
LOCAL_TX_PATH = "data/raw/transactions/transactions.csv"
LOCAL_PROD_PATH = "data/raw/products/*/products.csv"

def get_spark_session():
    return (
        SparkSession.builder.appName("RetailIntelligence_HiveLayer")
        .master("local[*]")
        .config("spark.driver.memory", "4g")
        .config("spark.sql.shuffle.partitions", "8")
        .config("spark.sql.warehouse.dir", "spark-warehouse")
        .getOrCreate()
    )

def run_pipeline():
    spark = get_spark_session()
    spark.sparkContext.setLogLevel("WARN")
    print("=" * 60)
    print(" Starting Module 3: Hive / Warehouse Cleaning & Aggregations")
    print("=" * 60)

    # 1. Load Raw Transactions
    print(f"Reading raw transactions from HDFS ({RAW_TX_PATH})...")
    try:
        raw_tx_df = spark.read.option("header", "true").option("inferSchema", "false").csv(RAW_TX_PATH)
    except Exception as e:
        print(f"[WARN] Could not read from HDFS ({e}). Falling back to local file {LOCAL_TX_PATH}...")
        raw_tx_df = spark.read.option("header", "true").option("inferSchema", "false").csv(LOCAL_TX_PATH)

    print(f"Raw transactions count: {raw_tx_df.count():,}")

    # 2. Clean Transactions
    # Rule: customer_id not null, quantity > 0, price > 0, invoice not cancelled ('C%')
    clean_tx = (
        raw_tx_df
        .withColumn("cust_num", F.expr("try_cast(customer_id as double)"))
        .withColumn("qty_num", F.expr("try_cast(quantity as int)"))
        .withColumn("price_num", F.expr("try_cast(price as double)"))
        .filter(F.col("cust_num").isNotNull())
        .filter(F.col("qty_num") > 0)
        .filter(F.col("price_num") > 0)
        .filter(~F.col("invoice").startswith("C"))
        .withColumn("customer_id", F.expr("cast(cast(cust_num as bigint) as string)"))
        .withColumn("quantity", F.col("qty_num"))
        .withColumn("price", F.col("price_num"))
        .withColumn("invoice_date", F.to_timestamp(F.col("invoice_date"), "yyyy-MM-dd HH:mm:ss"))
        .withColumn("total_amount", F.round(F.col("quantity") * F.col("price"), 2))
        .drop("cust_num", "qty_num", "price_num")
    )

    clean_count = clean_tx.count()
    print(f"Cleaned transactions count: {clean_count:,}")

    # Save Clean Transactions to Parquet
    os.makedirs("data/warehouse/clean_transactions", exist_ok=True)
    os.makedirs("data/warehouse/rfm_aggregates", exist_ok=True)
    os.makedirs("data/warehouse/category_enrichment", exist_ok=True)

    print(f"Writing clean_transactions to local warehouse and HDFS ({OUT_CLEAN_TX})...")
    clean_tx.write.mode("overwrite").parquet("data/warehouse/clean_transactions")
    try:
        clean_tx.write.mode("overwrite").parquet(OUT_CLEAN_TX)
    except Exception as e:
        print(f"[WARN] HDFS write skipped: {e}")

    # 3. RFM Base Aggregates
    print("Computing customer RFM base aggregates...")
    max_date = clean_tx.select(F.max("invoice_date")).collect()[0][0]
    print(f"Reference snapshot date: {max_date}")

    customer_orders = clean_tx.groupBy("customer_id", "invoice").agg(
        F.min("invoice_date").alias("order_date"),
        F.sum("total_amount").alias("order_amount"),
    )

    rfm_df = customer_orders.groupBy("customer_id").agg(
        F.min("order_date").alias("first_purchase_date"),
        F.max("order_date").alias("last_purchase_date"),
        F.count("invoice").alias("frequency"),
        F.round(F.sum("order_amount"), 2).alias("total_spend"),
        F.round(F.avg("order_amount"), 2).alias("avg_order_value"),
    )

    rfm_df = (
        rfm_df.withColumn(
            "recency_days",
            F.datediff(F.lit(max_date), F.col("last_purchase_date")),
        )
        .withColumn(
            "tenure_days",
            F.datediff(F.lit(max_date), F.col("first_purchase_date")),
        )
    )

    print(f"Unique customer profiles in RFM table: {rfm_df.count():,}")
    rfm_df.show(5, truncate=False)

    print(f"Writing rfm_aggregates to local warehouse and HDFS ({OUT_RFM_AGG})...")
    rfm_df.write.mode("overwrite").parquet("data/warehouse/rfm_aggregates")
    try:
        rfm_df.write.mode("overwrite").parquet(OUT_RFM_AGG)
    except Exception as e:
        print(f"[WARN] HDFS write skipped: {e}")

    # 4. Scraped Products Category Enrichment
    print(f"Reading scraped products from ({RAW_PROD_PATH})...")
    try:
        raw_prod_df = spark.read.option("header", "true").option("inferSchema", "false").csv(RAW_PROD_PATH)
    except Exception as e:
        print(f"[WARN] HDFS read failed ({e}). Falling back to local products CSV...")
        raw_prod_df = spark.read.option("header", "true").option("inferSchema", "false").csv(LOCAL_PROD_PATH)

    cat_enrich_df = (
        raw_prod_df.filter(F.col("category").isNotNull())
        .withColumn("price_num", F.expr("try_cast(price as double)"))
        .withColumn("rating_num", F.expr("try_cast(rating as double)"))
        .withColumn("reviews_num", F.expr("try_cast(review_count as int)"))
        .groupBy("category")
        .agg(
            F.count("product_id").alias("product_count"),
            F.round(F.avg("price_num"), 2).alias("avg_category_price"),
            F.round(F.avg("rating_num"), 2).alias("avg_category_rating"),
            F.sum("reviews_num").alias("total_reviews"),
        )
    )

    print("Category Enrichment Summary:")
    cat_enrich_df.show(5, truncate=False)

    print(f"Writing category_enrichment to local warehouse and HDFS ({OUT_CAT_ENRICH})...")
    cat_enrich_df.write.mode("overwrite").parquet("data/warehouse/category_enrichment")
    try:
        cat_enrich_df.write.mode("overwrite").parquet(OUT_CAT_ENRICH)
    except Exception as e:
        print(f"[WARN] HDFS write skipped: {e}")

    print("[SUCCESS] Module 3 (Hive / Warehouse Layer) completed successfully!")
    spark.stop()

if __name__ == "__main__":
    run_pipeline()
