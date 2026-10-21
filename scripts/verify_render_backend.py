#!/usr/bin/env python3
"""
scripts/verify_render_backend.py
Comprehensive probe for the live Render production backend:
https://retail-customer-intelligence.onrender.com
Tests legacy routes and modern /api/v1 routes.
"""
import urllib.request
import json
import sys

BASE_URL = sys.argv[1] if len(sys.argv) > 1 else "https://retail-customer-intelligence.onrender.com"

endpoints = [
    # Legacy routes
    ("GET", "/api/health", None),
    ("GET", "/api/customer/15485", None),
    ("GET", "/api/metrics", None),
    ("GET", "/api/analytics/revenue-orders?period=12m", None),
    ("POST", "/api/predict", {"recency_days": 25, "frequency": 6, "total_spend": 1250, "tenure_days": 300}),

    # Modern v1 routes
    ("GET", "/api/v1/dashboard/kpis", None),
    ("GET", "/api/v1/analytics/cohorts", None),
    ("GET", "/api/v1/analytics/retention-matrix", None),
    ("GET", "/api/v1/predictions/metrics", None),
    ("POST", "/api/v1/predictions/predict", {"recency_days": 25, "frequency": 6, "total_spend": 1250, "tenure_days": 300}),
    ("GET", "/api/v1/simulator/scenarios", None),
    ("GET", "/api/v1/datasets/history", None),
    ("GET", "/api/v1/recommendations", None),
    ("GET", "/api/v1/customers/15485", None),
]

def probe():
    print(f"=======================================================")
    print(f" Probing Live Render Backend: {BASE_URL}")
    print(f"=======================================================\n")
    
    results = {}
    v1_live_count = 0
    legacy_live_count = 0

    for method, path, body in endpoints:
        url = f"{BASE_URL}{path}"
        data = json.dumps(body).encode("utf-8") if body else None
        headers = {"Content-Type": "application/json"} if body else {}
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                status = resp.status
                content = json.loads(resp.read().decode("utf-8"))
                print(f"  [PASS] {method:4} {path:35} -> HTTP {status}")
                results[path] = {"status": status, "live": True}
                if path.startswith("/api/v1"):
                    v1_live_count += 1
                else:
                    legacy_live_count += 1
        except urllib.error.HTTPError as e:
            print(f"  [FAIL] {method:4} {path:35} -> HTTP {e.code} (Not Activated)")
            results[path] = {"status": e.code, "live": False}
        except Exception as e:
            print(f"  [ERR]  {method:4} {path:35} -> Connection Error: {e}")
            results[path] = {"status": 0, "live": False}

    print("\n-------------------------------------------------------")
    print(f" Legacy Routes Live:  {legacy_live_count}/5")
    print(f" Modern v1 Routes Live: {v1_live_count}/9")
    print(f" Deployment Status:    {'Fully Activated' if v1_live_count == 9 else 'Pending Manual Deploy on Render Dashboard'}")
    print("-------------------------------------------------------\n")
    return results

if __name__ == "__main__":
    probe()
