"""
Customer Intelligence Platform for Retail - Web Application & BI Hub
Module 6 & Module 7:
- Page 1: Customer Profile & Intelligence Lookup (HBase Serving Layer)
- Page 2: What-If Scenario Simulator (On-the-fly ML inference)
- Page 3: Executive Analytics & BI Dashboard (Tableau / Power BI integration)
"""
import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
import streamlit as st

# Ensure root is in path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from hbase.serving import CustomerServingLayer

st.set_page_config(
    page_title="Customer Intelligence Platform",
    page_icon="🛍️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling
st.markdown("""
<style>
    .metric-card {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 15px;
        border-left: 5px solid #2b5c8f;
        margin-bottom: 10px;
    }
    .badge-champions { background-color: #28a745; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; }
    .badge-loyal { background-color: #17a2b8; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; }
    .badge-atrisk { background-color: #ffc107; color: black; padding: 4px 10px; border-radius: 4px; font-weight: bold; }
    .badge-lost { background-color: #dc3545; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; }
</style>
""", unsafe_allow_html=True)

@st.cache_resource
def get_serving():
    return CustomerServingLayer()

@st.cache_resource
def load_models():
    clv_model = joblib.load("models/clv_regressor.joblib")
    churn_model = joblib.load("models/churn_classifier.joblib")
    kmeans = joblib.load("models/kmeans_segmentation.joblib")
    scaler = joblib.load("models/rfm_scaler.joblib")
    with open("models/segment_mapping.json", "r") as f:
        segment_mapping = json.load(f)
        # Convert keys to int
        segment_mapping = {int(k): v for k, v in segment_mapping.items()}
    return clv_model, churn_model, kmeans, scaler, segment_mapping

@st.cache_data
def load_predictions_data():
    csv_path = "data/warehouse/customer_predictions.csv"
    if os.path.exists(csv_path):
        return pd.read_csv(csv_path)
    return pd.DataFrame()

# Sidebar Navigation
st.sidebar.title("🛍️ Retail Intelligence")
page = st.sidebar.radio(
    "Navigation",
    ["Customer Lookup", "What-If Simulator", "Executive Dashboard (BI)"]
)

serving = get_serving()

# ==============================================================================
# Page 1: Customer Lookup
# ==============================================================================
if page == "Customer Lookup":
    st.title("🔍 Real-Time Customer Profile Lookup")
    st.markdown("Query the **HBase / NoSQL Serving Layer** for low-latency customer segmentation and lifetime value predictions.")

    col_search, col_samples = st.columns([2, 1])

    with col_samples:
        st.caption("Quick sample Customer IDs:")
        sample_cols = st.columns(4)
        sample_ids = ["15485", "13748", "13269", "18229"]
        selected_sample = None
        for i, sid in enumerate(sample_ids):
            if sample_cols[i].button(sid):
                selected_sample = sid

    with col_search:
        default_val = selected_sample if selected_sample else "15485"
        cust_input = st.text_input("Enter Customer ID", value=default_val, placeholder="e.g. 15485")

    if cust_input:
        profile = serving.get_customer(cust_input)
        if not profile:
            st.error(f"⚠️ Customer ID **'{cust_input}'** not found in serving database. Please try another ID (e.g., 15485, 13748, 13269).")
        else:
            segment = profile.get("segment", "Unknown")
            clv = profile.get("predicted_clv", 0.0)
            churn_p = profile.get("churn_probability", 0.0)

            # Header Badge
            badge_class = "badge-loyal"
            if "Champion" in segment:
                badge_class = "badge-champions"
            elif "At-Risk" in segment:
                badge_class = "badge-atrisk"
            elif "Lost" in segment:
                badge_class = "badge-lost"

            st.markdown(f"### Profile: Customer #{profile['customer_id']} &nbsp; <span class='{badge_class}'>{segment}</span>", unsafe_allow_html=True)
            st.caption(f"Last updated in serving layer: `{profile.get('last_updated', 'N/A')}`")

            # Metrics Row
            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Predicted 90-Day CLV", f"${clv:,.2f}")
            m2.metric("Churn Risk Probability", f"{churn_p * 100:.1f}%", delta=f"{'-High Risk' if churn_p > 0.5 else 'Active'}", delta_color="inverse")
            m3.metric("Recency", f"{profile.get('recency_days', 0)} days ago")
            m4.metric("Frequency", f"{profile.get('frequency', 0)} orders")

            m5, m6, m7, m8 = st.columns(4)
            m5.metric("Total Historical Spend", f"${profile.get('monetary', 0.0):,.2f}")
            m6.metric("Average Order Value", f"${profile.get('avg_order_value', 0.0):,.2f}")
            m7.metric("Customer Tenure", f"{profile.get('tenure_days', 0)} days")
            m8.metric("Serving Source", "HBase / KV Store")

            st.divider()

            # Strategic Recommendation
            st.subheader("💡 Targeted Action Recommendation")
            if "Champion" in segment:
                st.success("🌟 **VIP Treatment & Advocacy:** Grant early access to new collections, personalized thank-you perks, and high-tier rewards program membership.")
            elif "Loyal" in segment:
                st.info("🎯 **Upsell & Cross-Sell:** Recommend complementary categories and bundle deals to increase Average Order Value.")
            elif "At-Risk" in segment:
                st.warning("⏰ **Re-Engagement Campaign:** Deploy a time-sensitive win-back coupon and survey to identify friction points before total churn.")
            else:
                st.error("📉 **Win-Back or Re-Activate:** Target with aggressive discounts or low-cost automated email reactivation series.")

# ==============================================================================
# Page 2: What-If Simulator
# ==============================================================================
elif page == "What-If Simulator":
    st.title("🎛️ What-If Customer Scenario Simulator")
    st.markdown("Test simulated customer behavior to predict **RFM Segmentation, CLV, and Churn Probability** on the fly.")

    try:
        clv_model, churn_model, kmeans, scaler, segment_mapping = load_models()
        models_loaded = True
    except Exception as e:
        st.error(f"Could not load ML models: {e}")
        models_loaded = False

    if models_loaded:
        col_form, col_result = st.columns([1, 1])

        with col_form:
            st.subheader("Customer Behavior Parameters")
            recency = st.slider("Recency (Days since last purchase)", min_value=1, max_value=730, value=25)
            frequency = st.number_input("Purchase Frequency (Total order count)", min_value=1, max_value=200, value=6)
            monetary = st.number_input("Total Spend ($)", min_value=10.0, max_value=50000.0, value=1250.0, step=50.0)
            tenure = st.slider("Tenure (Days as customer)", min_value=1, max_value=730, value=300)
            avg_order = monetary / max(frequency, 1)
            st.info(f"Calculated Average Order Value: **${avg_order:,.2f}**")

        with col_result:
            st.subheader("Simulated Prediction Output")

            # Prepare Features
            features_df = pd.DataFrame([{
                "recency_days": recency,
                "frequency": frequency,
                "total_spend": monetary,
                "tenure_days": tenure,
                "avg_order_value": avg_order
            }])

            # Segmentation inference
            rfm_input_df = pd.DataFrame([[recency, frequency, monetary]], columns=["recency_days", "frequency", "total_spend"])
            rfm_scaled = scaler.transform(np.log1p(rfm_input_df))
            sim_cluster = kmeans.predict(rfm_scaled)[0]
            sim_segment = segment_mapping.get(sim_cluster, "Customer")

            # ML Predictions
            pred_clv = float(clv_model.predict(features_df)[0])
            pred_clv = max(0.0, pred_clv)
            pred_churn = float(churn_model.predict_proba(features_df)[0, 1])

            # Display Output Cards
            st.metric("Predicted Segment", sim_segment)
            st.metric("Estimated Next 90-Day Spend (CLV)", f"${pred_clv:,.2f}")
            st.metric(
                "Predicted Churn Probability",
                f"{pred_churn * 100:.1f}%",
                delta="High Risk" if pred_churn > 0.5 else "Low Risk",
                delta_color="inverse"
            )

            # Progress Bar for Churn
            st.caption("Churn Risk Index:")
            st.progress(min(1.0, pred_churn))

# ==============================================================================
# Page 3: Executive Dashboard (BI)
# ==============================================================================
elif page == "Executive Dashboard (BI)":
    st.title("📊 Executive Intelligence & BI Hub")
    st.markdown("Visual analytics summarizing customer segments, revenue impact, and churn exposure.")

    df = load_predictions_data()

    if df.empty:
        st.warning("Predictions dataset not found. Run Module 4 first.")
    else:
        # High Level KPIs
        k1, k2, k3, k4 = st.columns(4)
        total_customers = len(df)
        total_revenue = df["monetary"].sum()
        total_pred_clv = df["predicted_clv"].sum()
        avg_churn_risk = df["churn_probability"].mean()

        k1.metric("Total Analyzed Customers", f"{total_customers:,}")
        k2.metric("Total Historical Revenue", f"${total_revenue:,.2f}")
        k3.metric("Projected 90-Day Pipeline (CLV)", f"${total_pred_clv:,.2f}")
        k4.metric("Average Churn Risk", f"{avg_churn_risk * 100:.1f}%")

        st.divider()

        # Visualizations
        c1, c2 = st.columns(2)

        with c1:
            st.subheader("Customer Distribution by Segment")
            seg_counts = df["segment"].value_counts().reset_index()
            seg_counts.columns = ["Segment", "Customer Count"]
            st.bar_chart(data=seg_counts, x="Segment", y="Customer Count")

        with c2:
            st.subheader("Revenue Contribution by Segment")
            seg_rev = df.groupby("segment")["monetary"].sum().reset_index()
            seg_rev.columns = ["Segment", "Total Spend"]
            st.bar_chart(data=seg_rev, x="Segment", y="Total Spend")

        # Top At-Risk High Value Customers Table
        st.subheader("🚨 Priority Intervention: Top At-Risk High-Value Customers")
        st.caption("Customers with high historical spend but elevated churn probability requiring immediate retention action.")
        at_risk_df = df[df["segment"].isin(["At-Risk", "Champions"]) & (df["churn_probability"] > 0.4)].sort_values(
            by="monetary", ascending=False
        ).head(10)
        st.dataframe(
            at_risk_df[["customer_id", "segment", "monetary", "recency_days", "frequency", "churn_probability", "predicted_clv"]],
            use_container_width=True
        )

        st.divider()

        # Export & External BI Integration Center
        st.subheader("🔗 Tableau / Power BI Integration Center")
        st.markdown("""
        According to **Module 7**, Tableau and Power BI connect directly to the exported predictions dataset.
        Use the export buttons below or point your reporting tools to `data/warehouse/customer_predictions.csv`.
        """)

        col_dl1, col_dl2 = st.columns(2)
        with col_dl1:
            csv_bytes = df.to_csv(index=False).encode("utf-8")
            st.download_button(
                label="📥 Download customer_predictions.csv (for Tableau / Power BI)",
                data=csv_bytes,
                file_name="customer_predictions.csv",
                mime="text/csv"
            )

        with col_dl2:
            st.info("💡 **Power BI / Tableau Live Link:** File location on disk: `data/warehouse/customer_predictions.csv`")
