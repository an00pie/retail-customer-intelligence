-- ==============================================================================
-- Hive Schema & Table Definitions for Customer Intelligence Platform
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS retail_dw;
USE retail_dw;

-- ------------------------------------------------------------------------------
-- 1. Raw External Tables (Mapping to HDFS Raw Zone)
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS raw_transactions;
CREATE EXTERNAL TABLE raw_transactions (
    invoice STRING,
    stock_code STRING,
    description STRING,
    quantity INT,
    invoice_date STRING,
    price DOUBLE,
    customer_id STRING,
    country STRING
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION 'hdfs://localhost:9000/retail/raw/transactions'
TBLPROPERTIES ("skip.header.line.count"="1");


DROP TABLE IF EXISTS raw_products;
CREATE EXTERNAL TABLE raw_products (
    product_id STRING,
    product_name STRING,
    category STRING,
    price DOUBLE,
    rating DOUBLE,
    review_count INT,
    review_text STRING,
    scraped_at STRING
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ','
STORED AS TEXTFILE
LOCATION 'hdfs://localhost:9000/retail/raw/products'
TBLPROPERTIES ("skip.header.line.count"="1");

-- ------------------------------------------------------------------------------
-- 2. Cleaned Transactions Table (Stored as Parquet for performance)
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS clean_transactions;
CREATE TABLE clean_transactions (
    invoice STRING,
    stock_code STRING,
    description STRING,
    quantity INT,
    invoice_date TIMESTAMP,
    price DOUBLE,
    total_amount DOUBLE,
    customer_id STRING,
    country STRING
)
STORED AS PARQUET;

-- ------------------------------------------------------------------------------
-- 3. Customer RFM Base Aggregates Table
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS rfm_aggregates;
CREATE TABLE rfm_aggregates (
    customer_id STRING,
    first_purchase_date TIMESTAMP,
    last_purchase_date TIMESTAMP,
    recency_days INT,
    tenure_days INT,
    frequency INT,
    total_spend DOUBLE,
    avg_order_value DOUBLE
)
STORED AS PARQUET;

-- ------------------------------------------------------------------------------
-- 4. Category-Level Scraped Enrichment Table
-- ------------------------------------------------------------------------------

DROP TABLE IF EXISTS category_enrichment;
CREATE TABLE category_enrichment (
    category STRING,
    product_count INT,
    avg_price DOUBLE,
    avg_rating DOUBLE,
    total_reviews INT
)
STORED AS PARQUET;
