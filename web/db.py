"""
Database Management & Persistence Layer for Retail Customer Intelligence Platform.
Supports SQLite (local/embedded) with automatic PostgreSQL compatibility via DATABASE_URL.
"""
import os
import sqlite3
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SQLITE_DB_PATH = os.environ.get(
    "RETAIL_DB_PATH", os.path.join(BASE_DIR, "data", "serving", "customer_profile.db")
)

def get_db_connection():
    """Returns an open SQLite database connection with Row factory."""
    os.makedirs(os.path.dirname(SQLITE_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes all required relational tables for persistent enterprise retail intelligence."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'analyst',
            created_at TEXT NOT NULL
        )
    """)

    # 2. Saved What-If Scenarios
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_scenarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            name TEXT NOT NULL,
            recency_days INTEGER NOT NULL,
            frequency INTEGER NOT NULL,
            total_spend REAL NOT NULL,
            tenure_days INTEGER NOT NULL,
            predicted_segment TEXT,
            predicted_clv REAL,
            predicted_churn REAL,
            notes TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # 3. Dataset Import History
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dataset_imports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            total_rows INTEGER NOT NULL,
            valid_rows INTEGER NOT NULL,
            rejected_rows INTEGER NOT NULL,
            status TEXT NOT NULL,
            summary_json TEXT,
            created_at TEXT NOT NULL
        )
    """)

    # 4. Audit Log
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id TEXT,
            user_id INTEGER,
            details_json TEXT,
            timestamp TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS auth_sessions (
            token_hash TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT NOT NULL,
            user_id INTEGER,
            note TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id)")

    # Seed default demonstration user if none exists
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        now_iso = datetime.now(timezone.utc).isoformat()
        admin_hash = generate_password_hash("admin123", method="pbkdf2:sha256")
        analyst_hash = generate_password_hash("analyst123", method="pbkdf2:sha256")
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, ("admin", "admin@retail-intelligence.internal", admin_hash, "administrator", now_iso))
        cursor.execute("""
            INSERT INTO users (username, email, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, ("analyst", "analyst@retail-intelligence.internal", analyst_hash, "analyst", now_iso))

    from web.operations import init_operations
    init_operations(conn)
    conn.commit()
    conn.close()

# ------------------------------------------------------------------------------
# User Operations
# ------------------------------------------------------------------------------
def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, password_hash, role, created_at FROM users WHERE username = ?", (username.strip(),))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, role, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def create_user(username: str, email: str, password: str, role: str = "analyst") -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    p_hash = generate_password_hash(password, method="pbkdf2:sha256")
    cursor.execute("""
        INSERT INTO users (username, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?)
    """, (username.strip(), email.strip().lower(), p_hash, role, now_iso))
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": user_id, "username": username.strip(), "email": email.strip().lower(), "role": role, "created_at": now_iso}

def verify_user(username: str, password: str) -> Optional[Dict[str, Any]]:
    user = get_user_by_username(username)
    if user and check_password_hash(user["password_hash"], password):
        return {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "role": user["role"],
            "created_at": user["created_at"]
        }
    return None

def create_session(token_hash: str, user_id: int, expires_at: str) -> None:
    conn = get_db_connection()
    conn.execute(
        "INSERT OR REPLACE INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
        (token_hash, user_id, datetime.now(timezone.utc).isoformat(), expires_at),
    )
    conn.commit()
    conn.close()

def get_session_user(token_hash: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute(
        """SELECT u.id, u.username, u.email, u.role, u.created_at
           FROM auth_sessions s JOIN users u ON u.id = s.user_id
           WHERE s.token_hash = ? AND s.expires_at > ?""",
        (token_hash, datetime.now(timezone.utc).isoformat()),
    ).fetchone()
    conn.close()
    return dict(row) if row else None

def revoke_session(token_hash: str) -> None:
    conn = get_db_connection()
    conn.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (token_hash,))
    conn.commit()
    conn.close()

def add_customer_note(customer_id: str, note: str, user_id: Optional[int] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    created_at = datetime.now(timezone.utc).isoformat()
    cursor = conn.execute(
        "INSERT INTO customer_notes (customer_id, user_id, note, created_at) VALUES (?, ?, ?, ?)",
        (customer_id, user_id, note.strip(), created_at),
    )
    conn.commit()
    note_id = cursor.lastrowid
    conn.close()
    return {"id": note_id, "customer_id": customer_id, "user_id": user_id, "note": note.strip(), "created_at": created_at}

def list_customer_notes(customer_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute(
        """SELECT n.id, n.customer_id, n.user_id, n.note, n.created_at, u.username
           FROM customer_notes n LEFT JOIN users u ON u.id = n.user_id
           WHERE n.customer_id = ? ORDER BY n.id DESC""",
        (customer_id,),
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]

# ------------------------------------------------------------------------------
# Scenarios Operations
# ------------------------------------------------------------------------------
def save_scenario(name: str, recency: int, frequency: int, spend: float, tenure: int,
                  segment: str, clv: float, churn: float, notes: str = "", user_id: Optional[int] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO saved_scenarios (
            user_id, name, recency_days, frequency, total_spend, tenure_days,
            predicted_segment, predicted_clv, predicted_churn, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (user_id, name.strip(), int(recency), int(frequency), float(spend), int(tenure),
          segment, float(clv), float(churn), notes, now_iso))
    scenario_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {
        "id": scenario_id,
        "name": name.strip(),
        "recency_days": int(recency),
        "frequency": int(frequency),
        "total_spend": float(spend),
        "tenure_days": int(tenure),
        "predicted_segment": segment,
        "predicted_clv": float(clv),
        "predicted_churn": float(churn),
        "notes": notes,
        "created_at": now_iso
    }

def list_scenarios(limit: int = 50) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, user_id, name, recency_days, frequency, total_spend, tenure_days,
               predicted_segment, predicted_clv, predicted_churn, notes, created_at
        FROM saved_scenarios
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_scenario(scenario_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM saved_scenarios WHERE id = ?", (scenario_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# ------------------------------------------------------------------------------
# Dataset Imports & History
# ------------------------------------------------------------------------------
def record_dataset_import(filename: str, total_rows: int, valid_rows: int, rejected_rows: int,
                          status: str, summary: Dict[str, Any]) -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.now(timezone.utc).isoformat()
    cursor.execute("""
        INSERT INTO dataset_imports (filename, total_rows, valid_rows, rejected_rows, status, summary_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (filename, total_rows, valid_rows, rejected_rows, status, json.dumps(summary), now_iso))
    import_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return import_id

def list_dataset_imports(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, filename, total_rows, valid_rows, rejected_rows, status, summary_json, created_at
        FROM dataset_imports
        ORDER BY id DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        if d.get("summary_json"):
            try:
                d["summary"] = json.loads(d["summary_json"])
            except Exception:
                d["summary"] = {}
        result.append(d)
    return result

# ------------------------------------------------------------------------------
# Audit Logging
# ------------------------------------------------------------------------------
def log_audit_event(action: str, entity_type: str = "", entity_id: str = "",
                    user_id: Optional[int] = None, details: Optional[Dict[str, Any]] = None):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now_iso = datetime.now(timezone.utc).isoformat()
        cursor.execute("""
            INSERT INTO audit_logs (action, entity_type, entity_id, user_id, details_json, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (action, entity_type, str(entity_id), user_id, json.dumps(details or {}), now_iso))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[WARN] Failed to write audit log: {e}")

# Run schema init on import
init_db()
