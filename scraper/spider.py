"""
Product Scraper Module.
Extracts product-level enrichment data (id, name, category, price, rating, review_count, sample reviews).
"""
import hashlib
import json
import logging
import os
import re
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
import pandas as pd

from scraper.config import (
    BASE_URL,
    USER_AGENT,
    REQUEST_TIMEOUT,
    DOWNLOAD_DELAY,
    MAX_PAGES_PER_CATEGORY,
    CURRENT_RUN_DIR,
    TODAY_STR,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ProductScraper")

RATING_MAP = {
    "One": 1.0,
    "Two": 2.0,
    "Three": 3.0,
    "Four": 4.0,
    "Five": 5.0,
}

class ProductScraper:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})

    def fetch(self, url: str) -> Optional[BeautifulSoup]:
        """Fetch URL with timeout, error handling and rate-limiting delay."""
        try:
            time.sleep(DOWNLOAD_DELAY)
            resp = self.session.get(url, timeout=REQUEST_TIMEOUT)
            if resp.status_code == 200:
                return BeautifulSoup(resp.content, "lxml")
            logger.warning(f"Failed to fetch {url} (HTTP {resp.status_code})")
            return None
        except requests.RequestException as e:
            logger.error(f"Error fetching {url}: {e}")
            return None

    def discover_categories(self) -> List[Dict[str, str]]:
        """Discover categories available in the retail catalog."""
        logger.info(f"Discovering categories from {self.base_url}...")
        soup = self.fetch(self.base_url)
        if not soup:
            return []

        categories = []
        nav_list = soup.select("ul.nav-list ul li a")
        for link in nav_list:
            cat_name = link.get_text(strip=True)
            cat_url = urljoin(self.base_url, link.get("href", ""))
            categories.append({"name": cat_name, "url": cat_url})

        logger.info(f"Discovered {len(categories)} categories.")
        return categories

    def parse_product_detail(self, product_url: str, category_name: str) -> Optional[Dict]:
        """Fetch and extract full product specifications and reviews."""
        soup = self.fetch(product_url)
        if not soup:
            return None

        try:
            name_el = soup.select_one(".product_main h1")
            product_name = name_el.get_text(strip=True) if name_el else "Unknown Product"

            # Price extraction (strip currency symbol)
            price_el = soup.select_one(".product_main .price_color")
            price = None
            if price_el:
                price_match = re.search(r"[\d.]+", price_el.get_text())
                if price_match:
                    price = float(price_match.group())

            # Rating extraction
            rating = None
            star_el = soup.select_one("p.star-rating")
            if star_el:
                for cls in star_el.get("class", []):
                    if cls in RATING_MAP:
                        rating = RATING_MAP[cls]
                        break

            # Product ID / SKU from table
            product_id = None
            review_count = 0
            table_rows = soup.select("table.table-striped tr")
            for row in table_rows:
                th = row.select_one("th")
                td = row.select_one("td")
                if th and td:
                    header_text = th.get_text(strip=True).lower()
                    val = td.get_text(strip=True)
                    if "upc" in header_text:
                        product_id = val
                    elif "number of reviews" in header_text:
                        try:
                            review_count = int(val)
                        except ValueError:
                            review_count = 0

            if not product_id:
                # Generate deterministic fallback key based on product name
                product_id = hashlib.md5(product_name.encode("utf-8")).hexdigest()[:12]

            # Description / sample reviews
            desc_el = soup.select_one("#product_description ~ p")
            product_desc = desc_el.get_text(strip=True) if desc_el else ""
            reviews = [product_desc] if product_desc else []

            return {
                "product_id": product_id,
                "product_name": product_name,
                "category": category_name,
                "price": price,
                "rating": rating,
                "review_count": review_count,
                "review_text": json.dumps(reviews),
                "scraped_at": datetime.now(timezone.utc).isoformat(),
            }
        except Exception as e:
            logger.error(f"Error parsing product {product_url}: {e}")
            return None

    def scrape_category(self, category_name: str, category_url: str, max_pages: int = MAX_PAGES_PER_CATEGORY) -> List[Dict]:
        """Scrape all products across paginated pages in a category."""
        logger.info(f"Scraping category: {category_name}")
        items = []
        current_page_url = category_url
        page_num = 1

        while current_page_url and page_num <= max_pages:
            logger.info(f"  Fetching page {page_num} of {category_name}...")
            soup = self.fetch(current_page_url)
            if not soup:
                break

            product_links = soup.select("h3 a")
            for link in product_links:
                prod_href = link.get("href", "")
                prod_url = urljoin(current_page_url, prod_href)
                product_data = self.parse_product_detail(prod_url, category_name)
                if product_data:
                    items.append(product_data)

            # Check next page
            next_li = soup.select_one("li.next a")
            if next_li:
                next_href = next_li.get("href", "")
                current_page_url = urljoin(current_page_url, next_href)
                page_num += 1
            else:
                break

        logger.info(f"Finished {category_name}: captured {len(items)} products.")
        return items

    def run(self, max_categories: Optional[int] = None, output_dir: str = CURRENT_RUN_DIR) -> str:
        """Run the scraper end-to-end and save outputs as JSON and CSV."""
        os.makedirs(output_dir, exist_ok=True)
        categories = self.discover_categories()
        if max_categories:
            categories = categories[:max_categories]

        all_products = []
        for cat in categories:
            prods = self.scrape_category(cat["name"], cat["url"])
            all_products.extend(prods)

        json_path = os.path.join(output_dir, "products.json")
        csv_path = os.path.join(output_dir, "products.csv")

        logger.info(f"Saving {len(all_products)} products to {json_path} and {csv_path}...")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(all_products, f, indent=2, ensure_ascii=False)

        df = pd.DataFrame(all_products)
        df.to_csv(csv_path, index=False)

        logger.info("Scrape completed successfully.")
        return csv_path
