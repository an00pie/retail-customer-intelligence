"""
Converts the raw Excel sheets of UCI Online Retail II to a clean unified CSV.
Standardizes column headers for HDFS raw ingestion and Hive external table compatibility.
"""
import os
import sys
import pandas as pd

RAW_XLSX_PATH = "data/raw/transactions/online_retail_II.xlsx"
OUTPUT_CSV_PATH = "data/raw/transactions/transactions.csv"

def convert_excel_to_csv():
    if not os.path.exists(RAW_XLSX_PATH):
        print(f"Error: {RAW_XLSX_PATH} not found.")
        sys.exit(1)

    print(f"Loading {RAW_XLSX_PATH}...")
    sheets = ["Year 2009-2010", "Year 2010-2011"]
    dfs = []
    for sheet in sheets:
        print(f"Reading sheet '{sheet}'...")
        df = pd.read_excel(RAW_XLSX_PATH, sheet_name=sheet)
        dfs.append(df)

    combined_df = pd.concat(dfs, ignore_index=True)
    print(f"Total raw records loaded: {len(combined_df):,}")

    # Standardize column names (lowercase snake_case for Hive compatibility)
    combined_df.columns = [
        "invoice",
        "stock_code",
        "description",
        "quantity",
        "invoice_date",
        "price",
        "customer_id",
        "country"
    ]

    # Clean and format invoice_date to ISO-8601 string for HDFS/Hive/Spark compatibility
    combined_df["invoice_date"] = pd.to_datetime(combined_df["invoice_date"]).dt.strftime("%Y-%m-%d %H:%M:%S")

    print(f"Writing CSV to {OUTPUT_CSV_PATH}...")
    combined_df.to_csv(OUTPUT_CSV_PATH, index=False)
    print(f"Successfully generated {OUTPUT_CSV_PATH} ({os.path.getsize(OUTPUT_CSV_PATH) / (1024*1024):.2f} MB)")

if __name__ == "__main__":
    convert_excel_to_csv()
