"""
Configuration settings for the Real E-Commerce Product Data Scraper.
Targeting authentic, public Shopify e-commerce store catalogs.
"""
import os
from datetime import datetime

# Target verified public Shopify retail stores across multiple retail departments
DEFAULT_STORES = [
    {
        "name": "Allbirds",
        "url": "https://allbirds.com",
        "department": "Footwear & Apparel",
    },
    {
        "name": "ColourPop",
        "url": "https://colourpop.com",
        "department": "Beauty & Cosmetics",
    },
    {
        "name": "Bulletproof",
        "url": "https://bulletproof.com",
        "department": "Health & Nutrition",
    },
    {
        "name": "UNTUCKit",
        "url": "https://untuckit.com",
        "department": "Shirts & Formal Wear",
    },
    {
        "name": "Taylor Stitch",
        "url": "https://taylorstitch.com",
        "department": "Denim & Outerwear",
    },
    {
        "name": "Death Wish Coffee",
        "url": "https://deathwishcoffee.com",
        "department": "Gourmet Coffee & Merchandise",
    },
]

# Scraper settings
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
REQUEST_TIMEOUT = 12  # seconds
DOWNLOAD_DELAY = 0.4  # polite crawl delay in seconds
PRODUCTS_PER_PAGE = 250  # maximum allowed by Shopify public endpoint
MAX_PAGES_PER_STORE = 2  # up to 500 products per store

# Output paths
BASE_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw", "products"))
TODAY_STR = datetime.now().strftime("%Y-%m-%d")
CURRENT_RUN_DIR = os.path.join(BASE_DATA_DIR, TODAY_STR)
