"""
CLI entry point to execute the scraper.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from scraper.spider import ProductScraper
from scraper.config import CURRENT_RUN_DIR

def main():
    parser = argparse.ArgumentParser(description="Run the Retail Intelligence Product Scraper.")
    parser.add_argument(
        "--categories",
        type=int,
        default=5,
        help="Max number of categories to scrape (default: 5 for fast ingestion, 0 for all).",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=CURRENT_RUN_DIR,
        help=f"Directory to store raw scraped outputs (default: {CURRENT_RUN_DIR})",
    )
    args = parser.parse_args()

    max_cats = args.categories if args.categories > 0 else None
    scraper = ProductScraper()
    output_path = scraper.run(max_categories=max_cats, output_dir=args.output_dir)
    print(f"\n[DONE] Products scraped and saved to: {output_path}")

if __name__ == "__main__":
    main()
