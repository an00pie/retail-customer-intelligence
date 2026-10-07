"""
Module 5: HBase Serving Layer Interface.
Provides sub-millisecond per-customer lookup for the web application.
Supports connection to HBase Thrift service via happybase, with an automatic
high-performance embedded column-family KV store (SQLite NoSQL) fallback.
"""
import os
import sqlite3
from datetime import datetime, timezone
from typing import Dict, Optional

SQLITE_DB_PATH = "data/serving/customer_profile.db"

class CustomerServingLayer:
    def __init__(self, host: str = "localhost", port: int = 9090):
        self.host = host
        self.port = port
        self.hbase_conn = None
        self.hbase_table = None
        self.use_hbase = False

        # Attempt HBase Thrift connection
        try:
            import happybase
            self.hbase_conn = happybase.Connection(host=self.host, port=self.port, timeout=2000)
            self.hbase_conn.open()
            if b"customer_profile" in self.hbase_conn.tables():
                self.hbase_table = self.hbase_conn.table("customer_profile")
                self.use_hbase = True
                print(f"[HBaseServing] Connected to live HBase at {host}:{port}")
        except Exception:
            # Fallback to embedded KV store
            self.use_hbase = False
            self._init_sqlite()

    def _init_sqlite(self):
        os.makedirs(os.path.dirname(SQLITE_DB_PATH), exist_ok=True)
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customer_profile (
                row_key TEXT PRIMARY KEY,
                info_segment TEXT,
                pred_clv REAL,
                pred_churn_probability REAL,
                recency_days INTEGER,
                frequency INTEGER,
                monetary REAL,
                tenure_days INTEGER,
                avg_order_value REAL,
                meta_last_updated TEXT
            )
        """)
        conn.commit()
        conn.close()

    def put_customer(self, customer_id: str, data: dict):
        """Insert or update customer profile record."""
        now_iso = datetime.now(timezone.utc).isoformat()
        if self.use_hbase and self.hbase_table:
            row_data = {
                b"info:segment": str(data.get("segment", "")).encode("utf-8"),
                b"pred:clv": str(data.get("predicted_clv", 0.0)).encode("utf-8"),
                b"pred:churn_probability": str(data.get("churn_probability", 0.0)).encode("utf-8"),
                b"info:recency": str(data.get("recency_days", 0)).encode("utf-8"),
                b"info:frequency": str(data.get("frequency", 0)).encode("utf-8"),
                b"info:monetary": str(data.get("monetary", 0.0)).encode("utf-8"),
                b"meta:last_updated": now_iso.encode("utf-8")
            }
            self.hbase_table.put(customer_id.encode("utf-8"), row_data)
        else:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO customer_profile (
                    row_key, info_segment, pred_clv, pred_churn_probability,
                    recency_days, frequency, monetary, tenure_days, avg_order_value, meta_last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                str(customer_id),
                data.get("segment"),
                float(data.get("predicted_clv", 0.0)),
                float(data.get("churn_probability", 0.0)),
                int(data.get("recency_days", 0)),
                int(data.get("frequency", 0)),
                float(data.get("monetary", 0.0)),
                int(data.get("tenure_days", 0)),
                float(data.get("avg_order_value", 0.0)),
                now_iso
            ))
            conn.commit()
            conn.close()

    def put_customers_batch(self, records: list):
        """High-throughput batch insert for customer records."""
        now_iso = datetime.now(timezone.utc).isoformat()
        if self.use_hbase and self.hbase_table:
            with self.hbase_table.batch() as b:
                for data in records:
                    row_key = str(data.get("customer_id", "")).encode("utf-8")
                    row_data = {
                        b"info:segment": str(data.get("segment", "")).encode("utf-8"),
                        b"pred:clv": str(data.get("predicted_clv", 0.0)).encode("utf-8"),
                        b"pred:churn_probability": str(data.get("churn_probability", 0.0)).encode("utf-8"),
                        b"info:recency": str(data.get("recency_days", 0)).encode("utf-8"),
                        b"info:frequency": str(data.get("frequency", 0)).encode("utf-8"),
                        b"info:monetary": str(data.get("monetary", 0.0)).encode("utf-8"),
                        b"meta:last_updated": now_iso.encode("utf-8")
                    }
                    b.put(row_key, row_data)
        else:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            cursor = conn.cursor()
            batch_tuples = [
                (
                    str(data.get("customer_id")),
                    data.get("segment"),
                    float(data.get("predicted_clv", 0.0)),
                    float(data.get("churn_probability", 0.0)),
                    int(data.get("recency_days", 0)),
                    int(data.get("frequency", 0)),
                    float(data.get("monetary", 0.0)),
                    int(data.get("tenure_days", 0)),
                    float(data.get("avg_order_value", 0.0)),
                    now_iso
                )
                for data in records
            ]
            cursor.executemany("""
                INSERT OR REPLACE INTO customer_profile (
                    row_key, info_segment, pred_clv, pred_churn_probability,
                    recency_days, frequency, monetary, tenure_days, avg_order_value, meta_last_updated
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, batch_tuples)
            conn.commit()
            conn.close()

    def get_customer(self, customer_id: str) -> Optional[Dict]:
        """Low-latency fetch of a customer profile by customer_id."""
        cust_id_str = str(customer_id).strip()
        if self.use_hbase and self.hbase_table:
            row = self.hbase_table.row(cust_id_str.encode("utf-8"))
            if not row:
                return None
            return {
                "customer_id": cust_id_str,
                "segment": row.get(b"info:segment", b"").decode("utf-8"),
                "predicted_clv": float(row.get(b"pred:clv", b"0")),
                "churn_probability": float(row.get(b"pred:churn_probability", b"0")),
                "recency_days": int(row.get(b"info:recency", b"0")),
                "frequency": int(row.get(b"info:frequency", b"0")),
                "monetary": float(row.get(b"info:monetary", b"0")),
                "last_updated": row.get(b"meta:last_updated", b"").decode("utf-8")
            }
        else:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM customer_profile WHERE row_key = ?", (cust_id_str,))
            row = cursor.fetchone()
            conn.close()
            if not row:
                return None
            return {
                "customer_id": row["row_key"],
                "segment": row["info_segment"],
                "predicted_clv": row["pred_clv"],
                "churn_probability": row["pred_churn_probability"],
                "recency_days": row["recency_days"],
                "frequency": row["frequency"],
                "monetary": row["monetary"],
                "tenure_days": row["tenure_days"],
                "avg_order_value": row["avg_order_value"],
                "last_updated": row["meta_last_updated"]
            }

    def count(self) -> int:
        """Returns total customer records in serving layer."""
        if self.use_hbase and self.hbase_table:
            count = 0
            for _ in self.hbase_table.scan():
                count += 1
            return count
        else:
            conn = sqlite3.connect(SQLITE_DB_PATH)
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM customer_profile")
            val = cursor.fetchone()[0]
            conn.close()
            return val
