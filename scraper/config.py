"""
Configuration settings for the Product Data Scraper.
"""
import os
from datetime import datetime

# Base target URL for public retail catalog
BASE_URL = "https://books.toscrape.com"

# Scraper settings
USER_AGENT = "RetailIntelligenceBot/1.0 (+http://localhost/bot-info; retail-analytics-project)"
REQUEST_TIMEOUT = 10  # seconds
DOWNLOAD_DELAY = 0.5  # polite crawl delay in seconds
MAX_PAGES_PER_CATEGORY = 5  # configurable ceiling per category for runs

# Output paths
BASE_DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "raw", "products"))
TODAY_STR = datetime.now().strftime("%Y-%m-%d")
CURRENT_RUN_DIR = os.path.join(BASE_DATA_DIR, TODAY_STR)
