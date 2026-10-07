-- ==============================================================================
-- Hive Data Cleaning & Aggregation Queries
-- ==============================================================================

USE retail_dw;

-- 1. Populate clean_transactions:
--    Filters null customers, cancellations, negative quantities/prices, and computes total_amount
INSERT OVERWRITE TABLE clean_transactions
SELECT
    invoice,
    stock_code,
    description,
    CAST(quantity AS INT) AS quantity,
    CAST(invoice_date AS TIMESTAMP) AS invoice_date,
    CAST(price AS DOUBLE) AS price,
    ROUND(CAST(quantity AS INT) * CAST(price AS DOUBLE), 2) AS total_amount,
    CAST(customer_id AS STRING) AS customer_id,
    country
FROM raw_transactions
WHERE customer_id IS NOT NULL
  AND TRIM(customer_id) != ''
  AND customer_id != 'Customer ID'
  AND quantity > 0
  AND price > 0
  AND invoice NOT LIKE 'C%';

-- 2. Populate rfm_aggregates:
--    Computes Recency, Frequency, Monetary, Tenure, and Average Order Value
WITH customer_orders AS (
    SELECT
        customer_id,
        invoice,
        MIN(invoice_date) AS order_time,
        SUM(total_amount) AS order_value
    FROM clean_transactions
    GROUP BY customer_id, invoice
),
customer_summary AS (
    SELECT
        customer_id,
        MIN(order_time) AS first_purchase_date,
        MAX(order_time) AS last_purchase_date,
        COUNT(DISTINCT invoice) AS frequency,
        ROUND(SUM(order_value), 2) AS total_spend,
        ROUND(AVG(order_value), 2) AS avg_order_value
    FROM customer_orders
    GROUP BY customer_id
),
reference_date AS (
    SELECT DATE_ADD(MAX(order_time), 1) AS max_date FROM customer_orders
)
INSERT OVERWRITE TABLE rfm_aggregates
SELECT
    cs.customer_id,
    cs.first_purchase_date,
    cs.last_purchase_date,
    DATEDIFF(ref.max_date, cs.last_purchase_date) AS recency_days,
    DATEDIFF(ref.max_date, cs.first_purchase_date) AS tenure_days,
    cs.frequency,
    cs.total_spend,
    cs.avg_order_value
FROM customer_summary cs
CROSS JOIN reference_date ref;

-- 3. Populate category_enrichment from scraped product catalog
INSERT OVERWRITE TABLE category_enrichment
SELECT
    category,
    COUNT(*) AS product_count,
    ROUND(AVG(price), 2) AS avg_price,
    ROUND(AVG(rating), 2) AS avg_rating,
    SUM(review_count) AS total_reviews
FROM raw_products
WHERE category IS NOT NULL
  AND category != 'category'
GROUP BY category;
