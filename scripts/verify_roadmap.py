"""Run existing and roadmap unit/API checks against a disposable serving database."""
import os
from pathlib import Path
import shutil
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='retail-roadmap-') as directory:
        database = Path(directory) / 'customer_profile.db'
        shutil.copy2(ROOT / 'data/serving/customer_profile.db', database)
        os.environ['RETAIL_DB_PATH'] = str(database)
        suite = unittest.TestSuite()
        loader = unittest.TestLoader()
        for pattern in ('test_platform.py', 'test_api_v1.py', 'test_frontend_integrity.py', 'test_operations.py', 'test_gemini.py'):
            suite.addTests(loader.discover(str(ROOT / 'tests'), pattern=pattern))
        result = unittest.TextTestRunner(verbosity=2).run(suite)
        sys.exit(0 if result.wasSuccessful() else 1)
