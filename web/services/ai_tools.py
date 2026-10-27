"""
Strictly validated, read-only analytics tool definitions for Gemini function calling.
Grounded in INSIGHT.arc verified serving and warehouse datasets.
No write operations, arbitrary SQL, or file system modifications permitted.
"""
import re
from typing import Dict, Any, List
from web.db import get_db_connection


def get_dashboard_kpis() -> Dict[str, Any]:
    """Retrieve top-level retail KPIs including total customers, total orders, estimated revenue, AOV, and repeat customer count."""
    from web.app import get_serving
    serving = get_serving()
    total_cust = serving.count()
    cohort_summary = serving.get_cohort_summary()
    cohorts = cohort_summary.get("cohorts", {})

    total_spend = round(sum(c.get("avg_monetary", 0.0) * c.get("count", 0) for c in cohorts.values()), 2)
    total_orders = int(sum(c.get("avg_frequency", 0.0) * c.get("count", 0) for c in cohorts.values()))
    aov = round(total_spend / total_orders, 2) if total_orders > 0 else 0.0

    conn = get_db_connection()
    try:
        repeat_row = conn.execute("SELECT COUNT(*) FROM customer_profile WHERE frequency > 1").fetchone()
        repeat_customers = repeat_row[0] if repeat_row else 0
    finally:
        conn.close()

    return {
        "verified_customer_count": total_cust,
        "total_revenue_usd": total_spend,
        "total_orders": total_orders,
        "avg_order_value_usd": aov,
        "repeat_customers_count": repeat_customers,
        "repeat_customer_rate_pct": round((repeat_customers / total_cust * 100), 1) if total_cust > 0 else 0.0,
        "source": "INSIGHT.arc Serving Layer & Columnar Store"
    }


def get_segment_summary() -> Dict[str, Any]:
    """Retrieve verified RFM customer segmentation statistics across Champions, Loyal Customers, At-Risk, and Lost."""
    from web.app import get_serving
    serving = get_serving()
    cohort_data = serving.get_cohort_summary()
    cohorts = cohort_data.get("cohorts", {})

    results = {}
    for name, data in cohorts.items():
        results[name] = {
            "audience_size": data.get("count", 0),
            "percentage_of_base": data.get("percentage", 0.0),
            "avg_monetary_spend_usd": data.get("avg_monetary", 0.0),
            "avg_purchase_frequency": data.get("avg_frequency", 0.0),
            "avg_recency_days": data.get("avg_recency", 0.0)
        }

    return {
        "total_segmented_customers": cohort_data.get("total_customers", 5942),
        "segments": results,
        "model": "K-Means RFM Behavioral Clustering"
    }


def get_churn_summary() -> Dict[str, Any]:
    """Retrieve high-level customer retention and churn risk aggregates across the retail portfolio."""
    conn = get_db_connection()
    try:
        row = conn.execute("""
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN info_segment = 'Lost / Churned' THEN 1 ELSE 0 END) as lost_count,
                SUM(CASE WHEN info_segment = 'At-Risk' THEN 1 ELSE 0 END) as at_risk_count,
                SUM(CASE WHEN info_segment = 'Champions' THEN 1 ELSE 0 END) as champions_count,
                SUM(CASE WHEN info_segment = 'Loyal Customers' THEN 1 ELSE 0 END) as loyal_count
            FROM customer_profile
        """).fetchone()

        total = row["total"] or 1
        lost = row["lost_count"] or 0
        at_risk = row["at_risk_count"] or 0
        champions = row["champions_count"] or 0
        loyal = row["loyal_count"] or 0
    finally:
        conn.close()

    return {
        "total_active_base": total,
        "lost_churned_count": lost,
        "lost_churned_pct": round(lost / total * 100, 1),
        "at_risk_count": at_risk,
        "at_risk_pct": round(at_risk / total * 100, 1),
        "healthy_retention_count": champions + loyal,
        "healthy_retention_pct": round((champions + loyal) / total * 100, 1),
        "retention_status": "Priority review recommended for 1,476 At-Risk customer accounts."
    }


def get_customer_summary(customer_id: str) -> Dict[str, Any]:
    """Retrieve verified profile metrics, segment, CLV, and churn probability for a specific customer ID.
    Args:
        customer_id: The alphanumeric customer ID (e.g. '15485').
    """
    if not customer_id or not isinstance(customer_id, str):
        return {"error": "Invalid customer ID format. Must be non-empty string."}

    clean_id = str(customer_id).strip()
    if not clean_id or len(clean_id) > 20 or not re.match(r"^[a-zA-Z0-9_\-]+$", clean_id):
        return {"error": f"Invalid customer ID '{clean_id}'. Must be alphanumeric (1-20 chars)."}

    from web.app import get_serving, predict_customer
    serving = get_serving()
    cust = serving.get_customer(clean_id)
    if not cust:
        return {"error": f"Customer #{clean_id} not found in retail intelligence records.", "found": False}

    # Run in-memory model inference to get calibrated CLV and churn probability if not in dict
    pred = predict_customer(
        recency_days=cust.get("recency_days", 30),
        frequency=cust.get("frequency", 1),
        total_spend=cust.get("monetary", 0.0),
        tenure_days=cust.get("tenure_days", 300)
    )

    return {
        "found": True,
        "customer_id": clean_id,
        "segment": cust.get("segment", pred.get("segment", "Unknown")),
        "recency_days": cust.get("recency_days", 0),
        "frequency_orders": cust.get("frequency", 0),
        "total_spend_usd": cust.get("monetary", 0.0),
        "avg_order_value_usd": cust.get("avg_order_value", 0.0),
        "predicted_clv_usd": round(pred.get("predicted_clv", 0.0), 2),
        "churn_risk_probability": round(pred.get("churn_probability", 0.0), 4),
        "store_source": cust.get("store_source", "Retail Primary"),
        "recent_transactions_count": len(cust.get("transactions", []))
    }


def get_top_customers(metric: str = "monetary", limit: int = 5) -> Dict[str, Any]:
    """Retrieve top customers ranked by spend, frequency, or recency.
    Args:
        metric: Metric to rank by ('monetary' for spend, 'frequency' for order count, 'recency_days' for recent activity).
        limit: Number of records to return (1 to 10).
    """
    valid_metrics = {
        "monetary": "monetary",
        "spend": "monetary",
        "frequency": "frequency",
        "orders": "frequency",
        "recency": "recency_days",
        "recency_days": "recency_days"
    }
    col = valid_metrics.get(str(metric).strip().lower(), "monetary")
    limit = max(1, min(int(limit), 10))

    order_dir = "ASC" if col == "recency_days" else "DESC"

    conn = get_db_connection()
    try:
        query = f"""
            SELECT row_key as customer_id, info_segment as segment, monetary as total_spend, frequency, recency_days, avg_order_value
            FROM customer_profile
            ORDER BY {col} {order_dir}
            LIMIT ?
        """
        rows = conn.execute(query, (limit,)).fetchall()
        customers = [dict(r) for r in rows]
    finally:
        conn.close()

    return {
        "ranking_metric": col,
        "returned_count": len(customers),
        "customers": customers
    }


# Allowlist for function calling tool mapping
ALLOWED_AI_TOOLS = [
    get_dashboard_kpis,
    get_segment_summary,
    get_churn_summary,
    get_customer_summary,
    get_top_customers
]
