#!/bin/bash
# ==============================================================================
# HDFS Ingestion Script for Retail Intelligence Platform
# Lands raw transactions and scraped products into HDFS raw zone unmodified.
# ==============================================================================

set -e

# Identify current date partition
RUN_DATE=$(date +"%Y-%m-%d")
TX_SRC="data/raw/transactions/transactions.csv"
PROD_SRC_DIR="data/raw/products/${RUN_DATE}"
PROD_SRC="${PROD_SRC_DIR}/products.csv"

# Fallback to latest available scrape directory if current date is not found
if [ ! -f "$PROD_SRC" ]; then
    LATEST_PROD_DIR=$(find data/raw/products -mindepth 1 -maxdepth 1 -type d | sort -r | head -n 1)
    if [ -n "$LATEST_PROD_DIR" ] && [ -f "${LATEST_PROD_DIR}/products.csv" ]; then
        RUN_DATE=$(basename "$LATEST_PROD_DIR")
        PROD_SRC="${LATEST_PROD_DIR}/products.csv"
        echo "[INFO] Using latest scrape partition: ${RUN_DATE}"
    fi
fi

echo "=========================================="
echo " Starting HDFS Raw Ingestion"
echo " Partition Date: ${RUN_DATE}"
echo "=========================================="

# Check if HDFS CLI is available
if ! command -v hdfs &> /dev/null; then
    if [ -x "/usr/local/hadoop/bin/hdfs" ]; then
        export PATH="/usr/local/hadoop/bin:$PATH"
    else
        echo "[ERROR] 'hdfs' command not found. Ensure Hadoop is installed and on PATH."
        exit 1
    fi
fi

# Define HDFS Raw Zones
HDFS_TX_DIR="/retail/raw/transactions"
HDFS_PROD_DIR="/retail/raw/products/${RUN_DATE}"

echo "[1/4] Ensuring HDFS target directories exist..."
hdfs dfs -mkdir -p "${HDFS_TX_DIR}"
hdfs dfs -mkdir -p "${HDFS_PROD_DIR}"

echo "[2/4] Uploading raw transactions dataset to HDFS..."
if [ -f "$TX_SRC" ]; then
    hdfs dfs -put -f "$TX_SRC" "${HDFS_TX_DIR}/"
    echo "  [OK] Uploaded ${TX_SRC} -> ${HDFS_TX_DIR}/"
else
    echo "  [ERROR] Source ${TX_SRC} not found!"
    exit 1
fi

echo "[3/4] Uploading scraped products dataset to HDFS..."
if [ -f "$PROD_SRC" ]; then
    hdfs dfs -put -f "$PROD_SRC" "${HDFS_PROD_DIR}/"
    echo "  [OK] Uploaded ${PROD_SRC} -> ${HDFS_PROD_DIR}/"
else
    echo "  [WARN] Source ${PROD_SRC} not found yet. Run scraper first."
fi

echo "[4/4] Verifying HDFS contents:"
echo "------------------------------------------"
hdfs dfs -ls -R /retail/raw
echo "------------------------------------------"
echo "[SUCCESS] HDFS Ingestion completed successfully."
