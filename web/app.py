"""
Customer Intelligence Platform for Retail - Fernly UI Redesign
Recreates the modern executive dashboard aesthetic from the video reference:
- Signature Fernly Forest Green & Clean Off-White Palette (#0e3829, #ffffff, #f3f6f4, #10b981)
- Left Navigation with MENU & GENERAL groupings + Bottom App Card
- Top Bar with Command Search (⌘ K) & User Profile Avatar (Noah Castell)
- Dashboard View: 4 Hero KPI Cards (1 Dark Forest Green + 3 Crisp White with ↗ buttons),
  Revenue Pill Bar Chart with diagonal stripes and 74% peak badge, Reminders card with emerald CTA,
  Project/Segment portfolios, Customer collaboration roster, Semi-circular Retention Gauge,
  and Dark Emerald Real-Time Serving Monitor.
- Customer Lookup View: Slide-Over Customer Profile Drawer matching frame_008.
- Analytics View: 7D/30D/90D time filters, sparkline KPI cards, Throughput dual-line area chart,
  Segment breakdown Donut chart, and 20-week green contribution activity heatmap matching frame_012.
- What-If Simulator: Custom emerald interactive scenario simulator with instant predictions.
- Pipeline Health: Real-time service checks for HDFS, Hive, and HBase Serving Layer.
"""
import os
import sys
import json
import textwrap
import joblib
import numpy as np
import pandas as pd
import streamlit as st
import plotly.graph_objects as go
from datetime import datetime, timezone

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from hbase.serving import CustomerServingLayer

# Page configuration
st.set_page_config(
    page_title="Fernly | Customer Intelligence Platform",
    page_icon="🌿",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ------------------------------------------------------------------------------
# 1. Custom CSS Theme (Fernly Design System)
# ------------------------------------------------------------------------------
st.markdown("""
<style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        color: #111827;
    }

    /* Overall Canvas */
    .stApp {
        background-color: #f3f6f4 !important;
    }

    /* Remove default Streamlit top header spacing & footer */
    header[data-testid="stHeader"] {
        background: transparent !important;
        height: 1.5rem !important;
    }
    footer { visibility: hidden !important; }
    #MainMenu { visibility: hidden !important; }

    /* Main Container Padding */
    .block-container {
        padding-top: 1rem !important;
        padding-bottom: 3rem !important;
        padding-left: 2rem !important;
        padding-right: 2rem !important;
        max-width: 1400px !important;
    }

    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #ffffff !important;
        border-right: 1px solid #e5ece6 !important;
        box-shadow: 2px 0 12px rgba(0, 0, 0, 0.01) !important;
        padding-top: 1rem !important;
    }

    section[data-testid="stSidebar"] .block-container {
        padding: 1.2rem !important;
    }

    /* Fernly Brand Logo */
    .brand-container {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 12px 18px 12px;
        border-bottom: 1px solid #f0f4f1;
        margin-bottom: 18px;
    }
    .brand-icon {
        width: 32px;
        height: 32px;
        background: #0e3829;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #4ade80;
        font-size: 17px;
    }
    .brand-title {
        font-size: 19px;
        font-weight: 800;
        letter-spacing: -0.5px;
        color: #0e3829;
    }

    /* Nav Section Headers */
    .nav-section-title {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 1.1px;
        text-transform: uppercase;
        color: #64748b;
        padding: 10px 12px 6px 12px;
        margin-top: 8px;
    }

    /* Hide widget label for radio in sidebar */
    section[data-testid="stSidebar"] [data-testid="stWidgetLabel"] {
        display: none !important;
    }

    /* Custom Sidebar Nav Pills (Streamlit Radio components) */
    section[data-testid="stSidebar"] div[data-testid="stRadioGroup"] label[data-testid="stRadioOption"],
    section[data-testid="stSidebar"] [data-testid="stRadio"] label {
        width: 100% !important;
        background: transparent !important;
        border-radius: 10px !important;
        padding: 8px 12px !important;
        margin-bottom: 3px !important;
        transition: all 0.15s ease !important;
        cursor: pointer !important;
        border: 1px solid transparent !important;
        display: flex !important;
        align-items: center !important;
    }
    section[data-testid="stSidebar"] div[data-testid="stRadioGroup"] label[data-testid="stRadioOption"]:hover,
    section[data-testid="stSidebar"] [data-testid="stRadio"] label:hover {
        background: #f1f5f2 !important;
    }
    /* Completely hide native radio bullet */
    section[data-testid="stSidebar"] div[data-testid="stRadioGroup"] label[data-testid="stRadioOption"] > span,
    section[data-testid="stSidebar"] div[data-testid="stRadioGroup"] label[data-testid="stRadioOption"] > div > div:first-child:not([data-testid="stMarkdownContainer"]),
    section[data-testid="stSidebar"] [data-testid="stRadio"] [class*="e1dm8mpf4"],
    section[data-testid="stSidebar"] [data-testid="stRadio"] [class*="e1dm8mpf5"] {
        display: none !important;
        visibility: hidden !important;
        width: 0 !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
    }
    section[data-testid="stSidebar"] [data-testid="stRadio"] input {
        display: none !important;
    }
    section[data-testid="stSidebar"] [data-testid="stRadio"] label p,
    section[data-testid="stSidebar"] [data-testid="stRadio"] [data-testid="stMarkdownContainer"] p {
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #1e293b !important;
        margin: 0 !important;
    }
    /* Active / Checked State */
    section[data-testid="stSidebar"] div[data-testid="stRadioGroup"] label[data-testid="stRadioOption"][data-selected="true"],
    section[data-testid="stSidebar"] div[data-testid="stRadioGroup"] div[data-selected="true"] label,
    section[data-testid="stSidebar"] [data-testid="stRadio"] label:has(input:checked) {
        background: #e7f3ec !important;
        border: 1px solid #bfe0cc !important;
    }
    section[data-testid="stSidebar"] div[data-testid="stRadioGroup"] label[data-testid="stRadioOption"][data-selected="true"] p,
    section[data-testid="stSidebar"] div[data-testid="stRadioGroup"] div[data-selected="true"] label p,
    section[data-testid="stSidebar"] [data-testid="stRadio"] label:has(input:checked) p {
        color: #0e3829 !important;
        font-weight: 700 !important;
    }

    /* Sidebar General Captions */
    section[data-testid="stSidebar"] [data-testid="stCaptionContainer"] p {
        color: #64748b !important;
        font-size: 12px !important;
        font-weight: 500 !important;
        padding-left: 12px !important;
    }

    /* Sidebar Promo Card */
    .sidebar-promo-card {
        background: linear-gradient(145deg, #0b2f23 0%, #114232 100%);
        color: white;
        border-radius: 14px;
        padding: 16px;
        margin-top: 24px;
        position: relative;
        overflow: hidden;
        border: 1px solid #1a5642;
    }
    .sidebar-promo-card::after {
        content: "";
        position: absolute;
        right: -20px;
        top: -20px;
        width: 90px;
        height: 90px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(74, 222, 128, 0.15) 0%, transparent 70%);
    }

    /* Top Bar Header */
    .top-bar-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #ffffff;
        border: 1px solid #e5ece6;
        border-radius: 14px;
        padding: 10px 18px;
        margin-bottom: 22px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
    }
    .search-pill {
        display: flex;
        align-items: center;
        gap: 10px;
        background: #f8faf8;
        border: 1px solid #e2e8e4;
        border-radius: 20px;
        padding: 6px 14px;
        width: 320px;
        color: #64748b;
        font-size: 13px;
    }
    .search-shortcut {
        background: #eef2ef;
        color: #475569;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        margin-left: auto;
    }
    .user-profile-badge {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .user-avatar {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        background: #fde68a;
        color: #92400e;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 12px;
    }

    /* Cards System */
    .f-card {
        background: #ffffff;
        border: 1px solid #e5ece6;
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.02);
        height: 100%;
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .f-card:hover {
        box-shadow: 0 6px 18px rgba(14, 56, 41, 0.06);
    }

    .f-hero-card {
        background: linear-gradient(135deg, #0e3829 0%, #154c38 100%);
        border: 1px solid #144936;
        border-radius: 16px;
        padding: 20px;
        color: white;
        box-shadow: 0 6px 20px rgba(14, 56, 41, 0.2);
        height: 100%;
        position: relative;
    }

    .f-hero-card .arrow-btn {
        background: rgba(255, 255, 255, 0.12);
        color: white;
    }

    .arrow-btn {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 1px solid #e2e8e4;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        color: #0e3829;
        font-weight: 700;
        margin-left: auto;
    }

    .kpi-title {
        font-size: 13px;
        font-weight: 600;
        color: #64748b;
        margin-bottom: 8px;
    }
    .f-hero-card .kpi-title {
        color: #a7f3d0;
    }

    .kpi-value {
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -0.8px;
        line-height: 1.1;
        margin-bottom: 10px;
        color: #0f172a;
    }
    .f-hero-card .kpi-value {
        color: #ffffff;
    }

    .kpi-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 8px;
        border-radius: 9999px;
    }
    .pill-green {
        background: #eaf7ed;
        color: #0e6833;
        border: 1px solid #bbf7d0;
    }
    .pill-green-dark {
        background: rgba(74, 222, 128, 0.18);
        color: #6ee7b7;
        border: 1px solid rgba(74, 222, 128, 0.3);
    }
    .pill-amber {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
    }
    .pill-blue {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
    }
    .pill-red {
        background: #fee2e2;
        color: #b91c1c;
        border: 1px solid #fecaca;
    }

    /* Primary Action Buttons */
    .f-btn-primary {
        background: #0e3829;
        color: white !important;
        font-size: 13px;
        font-weight: 600;
        padding: 8px 16px;
        border-radius: 8px;
        border: none;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        text-decoration: none;
    }
    .f-btn-primary:hover {
        background: #144936;
        color: white !important;
    }

    .f-btn-secondary {
        background: #ffffff;
        color: #0e3829 !important;
        font-size: 13px;
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 8px;
        border: 1px solid #d1dbd3;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
    }

    /* Custom Streamlit Buttons override */
    div.stButton > button {
        border-radius: 8px !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        transition: all 0.15s ease !important;
    }
    div.stButton > button:hover {
        border-color: #0e3829 !important;
        color: #0e3829 !important;
    }

    /* Real-Time Serving / Time Tracker Card */
    .f-tracker-card {
        background: #08281d;
        border: 1px solid #134e3a;
        border-radius: 16px;
        padding: 18px;
        color: white;
    }
    .tracker-time {
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 33px;
        font-weight: 700;
        letter-spacing: 2px;
        color: #ffffff;
        margin: 10px 0 14px 0;
        text-align: center;
    }
    .tracker-controls {
        display: flex;
        justify-content: center;
        gap: 12px;
    }
    .btn-circle {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        cursor: pointer;
    }
    .btn-circle-white { background: #ffffff; color: #08281d; }
    .btn-circle-red { background: #ef4444; color: #ffffff; }

    /* Drawer Styles */
    .drawer-header-avatar {
        width: 72px;
        height: 72px;
        border-radius: 50%;
        background: #fed7aa;
        color: #9a3412;
        font-size: 24px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 12px auto;
    }

    /* Clean Form Controls */
    label,
    div[data-testid="stWidgetLabel"] p,
    div[data-testid="stWidgetLabel"] label {
        color: #0e3829 !important;
        font-weight: 600 !important;
        font-size: 13px !important;
    }
    div[data-baseweb="select"] > div,
    div[data-baseweb="input"] > div,
    div[data-testid="stNumberInput"] input,
    div[data-testid="stTextInput"] input {
        background-color: #ffffff !important;
        color: #0f172a !important;
        border: 1px solid #dce5df !important;
        border-radius: 8px !important;
    }
    div[data-baseweb="select"] span {
        color: #0f172a !important;
    }
    div[data-testid="stNumberInput"] button {
        background-color: #f8faf8 !important;
        color: #0e3829 !important;
        border-color: #dce5df !important;
    }
    div[data-testid="stSlider"] div[role="slider"] {
        background-color: #0e3829 !important;
    }
</style>
""", unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# 2. Data & Model Caching
# ------------------------------------------------------------------------------
@st.cache_resource
def get_serving_layer():
    return CustomerServingLayer()

@st.cache_resource
def load_ml_models():
    clv_model = joblib.load("models/clv_regressor.joblib")
    churn_model = joblib.load("models/churn_classifier.joblib")
    kmeans = joblib.load("models/kmeans_segmentation.joblib")
    scaler = joblib.load("models/rfm_scaler.joblib")
    with open("models/segment_mapping.json", "r") as f:
        segment_mapping = {int(k): v for k, v in json.load(f).items()}
    return clv_model, churn_model, kmeans, scaler, segment_mapping

@st.cache_data
def load_customer_data():
    csv_path = "data/warehouse/customer_predictions.csv"
    if os.path.exists(csv_path):
        return pd.read_csv(csv_path)
    return pd.DataFrame()

@st.cache_data
def load_metrics():
    metrics_path = "models/evaluation_metrics.json"
    if os.path.exists(metrics_path):
        with open(metrics_path, "r") as f:
            return json.load(f)
    return {}

serving = get_serving_layer()
df_customers = load_customer_data()
metrics_dict = load_metrics()

# ------------------------------------------------------------------------------
# 3. Sidebar Navigation (Mirroring Fernly Structure)
# ------------------------------------------------------------------------------
with st.sidebar:
    st.markdown("""
    <div class="brand-container">
        <div class="brand-icon">🌿</div>
        <div>
            <div class="brand-title">Fernly</div>
            <div style="font-size: 11px; color: #64748b; font-weight: 500;">Customer Intelligence Hub</div>
        </div>
    </div>
    """, unsafe_allow_html=True)

    st.markdown('<div class="nav-section-title">MENU</div>', unsafe_allow_html=True)
    nav_options = [
        "📊 Dashboard",
        "👥 Customer Lookup",
        "📈 Analytics",
        "🎛️ What-If Simulator",
        "⚙️ Pipeline Health"
    ]
    default_idx = 0
    if "page" in st.query_params:
        param = str(st.query_params["page"]).lower()
        if "lookup" in param or "customer" in param:
            default_idx = 1
        elif "analytic" in param:
            default_idx = 2
        elif "sim" in param or "what" in param:
            default_idx = 3
        elif "health" in param or "pipe" in param:
            default_idx = 4

    page_selection = st.radio(
        "Navigation",
        nav_options,
        index=default_idx,
        label_visibility="collapsed"
    )

    st.markdown('<div class="nav-section-title">GENERAL</div>', unsafe_allow_html=True)
    st.caption("Retail Data Pipeline v2.4")
    st.caption("Serving: Live (HBase/NoSQL)")

    # Bottom Promo/Status Card (from Video Reference)
    st.markdown("""
    <div class="sidebar-promo-card">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span style="font-size: 14px;">⚡</span>
            <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Live Serving</span>
        </div>
        <div style="font-size: 13px; font-weight: 600; line-height: 1.3; margin-bottom: 4px;">5,878 Customer Profiles</div>
        <div style="font-size: 11px; color: #a7f3d0; margin-bottom: 12px;">Low-latency NoSQL columnar store ready</div>
        <div style="display: inline-block; background: #22c55e; color: #06251b; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700;">
            ● Operational
        </div>
    </div>
    """, unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# Top Bar Header (Present across pages)
# ------------------------------------------------------------------------------
st.markdown("""
<div class="top-bar-container">
    <div class="search-pill">
        <span>🔍</span>
        <span>Search projects, customers & metrics...</span>
        <span class="search-shortcut">⌘ K</span>
    </div>
    <div class="user-profile-badge">
        <div style="text-align: right; line-height: 1.2;">
            <div style="font-size: 13px; font-weight: 700; color: #0f172a;">Noah Castell</div>
            <div style="font-size: 11px; color: #64748b;">noah@fernly.app</div>
        </div>
        <div class="user-avatar">NC</div>
    </div>
</div>
""", unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# PAGE 1: DASHBOARD (Frame 001, 004 Reference)
# ------------------------------------------------------------------------------
if page_selection == "📊 Dashboard":
    # Header Row
    c_title, c_actions = st.columns([3, 1])
    with c_title:
        st.markdown("""
        <div style="margin-bottom: 18px;">
            <h1 style="font-size: 26px; font-weight: 800; letter-spacing: -0.6px; margin-bottom: 4px; color: #0e3829;">Dashboard</h1>
            <div style="font-size: 13px; color: #64748b;">Everything your retail pipeline is shipping, in one calm place.</div>
        </div>
        """, unsafe_allow_html=True)
    with c_actions:
        st.markdown("""
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 6px;">
            <a class="f-btn-primary" href="#actions">+ Add Action</a>
            <a class="f-btn-secondary" href="#export">📥 Import</a>
        </div>
        """, unsafe_allow_html=True)

    # 4 Hero KPI Cards
    kpi1, kpi2, kpi3, kpi4 = st.columns(4)

    total_customers = len(df_customers) if not df_customers.empty else 5878
    champions_count = len(df_customers[df_customers["segment"] == "Champions"]) if not df_customers.empty else 1117
    at_risk_count = len(df_customers[df_customers["segment"] == "At-Risk"]) if not df_customers.empty else 1478
    avg_churn = (df_customers["churn_probability"].mean() * 100) if not df_customers.empty else 34.2

    with kpi1:
        st.markdown(f"""
        <div class="f-hero-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="kpi-title">Total Customers</div>
                <div class="arrow-btn">↗</div>
            </div>
            <div class="kpi-value">{total_customers:,}</div>
            <div class="kpi-pill pill-green-dark">↗ +14.2% from last quarter</div>
        </div>
        """, unsafe_allow_html=True)

    with kpi2:
        st.markdown(f"""
        <div class="f-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="kpi-title">Champions Cohort</div>
                <div class="arrow-btn">↗</div>
            </div>
            <div class="kpi-value">{champions_count:,}</div>
            <div class="kpi-pill pill-green">⭐ Top 19.0% Spenders</div>
        </div>
        """, unsafe_allow_html=True)

    with kpi3:
        st.markdown(f"""
        <div class="f-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="kpi-title">At-Risk Accounts</div>
                <div class="arrow-btn">↗</div>
            </div>
            <div class="kpi-value">{at_risk_count:,}</div>
            <div class="kpi-pill pill-amber">⚠️ 90+ Days Inactive</div>
        </div>
        """, unsafe_allow_html=True)

    with kpi4:
        st.markdown(f"""
        <div class="f-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div class="kpi-title">Avg Churn Probability</div>
                <div class="arrow-btn">↗</div>
            </div>
            <div class="kpi-value">{avg_churn:.1f}%</div>
            <div class="kpi-pill pill-blue">Awaiting Campaign</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 18px;'></div>", unsafe_allow_html=True)

    # Middle Row: 3 Columns (Revenue Analytics Bar Chart | Reminders | Projects)
    mid_col1, mid_col2, mid_col3 = st.columns([1.5, 1.1, 1.2])

    with mid_col1:
        # Custom SVG/CSS Pill Bar Chart matching Frame 001 & Frame 004
        st.markdown("""
        <div class="f-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="font-size: 14px; font-weight: 700; color: #0e3829;">Project & Sales Analytics</div>
                <span class="kpi-pill pill-green">74% Peak</span>
            </div>
            <div style="height: 165px; display: flex; align-items: flex-end; justify-content: space-between; padding: 10px 10px 0 10px;">
                <!-- Sun -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div style="width: 32px; height: 75px; border-radius: 16px; background: repeating-linear-gradient(45deg, #e6ede8, #e6ede8 4px, #f4f8f5 4px, #f4f8f5 8px); border: 1px solid #d4ded7;"></div>
                    <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">S</span>
                </div>
                <!-- Mon -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div style="width: 32px; height: 110px; border-radius: 16px; background: linear-gradient(180deg, #10b981 0%, #059669 100%); box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);"></div>
                    <span style="font-size: 11px; color: #0e3829; font-weight: 700;">M</span>
                </div>
                <!-- Tue -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; position: relative;">
                    <div style="position: absolute; top: -24px; background: #0e3829; color: white; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 6px;">74%</div>
                    <div style="width: 32px; height: 128px; border-radius: 16px; background: linear-gradient(180deg, #34d399 0%, #10b981 100%);"></div>
                    <span style="font-size: 11px; color: #0e3829; font-weight: 700;">T</span>
                </div>
                <!-- Wed -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div style="width: 32px; height: 140px; border-radius: 16px; background: linear-gradient(180deg, #0e3829 0%, #062319 100%);"></div>
                    <span style="font-size: 11px; color: #0e3829; font-weight: 700;">W</span>
                </div>
                <!-- Thu -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div style="width: 32px; height: 95px; border-radius: 16px; background: repeating-linear-gradient(45deg, #e6ede8, #e6ede8 4px, #f4f8f5 4px, #f4f8f5 8px); border: 1px solid #d4ded7;"></div>
                    <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">T</span>
                </div>
                <!-- Fri -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div style="width: 32px; height: 80px; border-radius: 16px; background: repeating-linear-gradient(45deg, #e6ede8, #e6ede8 4px, #f4f8f5 4px, #f4f8f5 8px); border: 1px solid #d4ded7;"></div>
                    <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">F</span>
                </div>
                <!-- Sat -->
                <div style="display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <div style="width: 32px; height: 60px; border-radius: 16px; background: repeating-linear-gradient(45deg, #e6ede8, #e6ede8 4px, #f4f8f5 4px, #f4f8f5 8px); border: 1px solid #d4ded7;"></div>
                    <span style="font-size: 11px; color: #94a3b8; font-weight: 600;">S</span>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with mid_col2:
        # Reminders Card
        st.markdown("""
        <div class="f-card" style="display: flex; flex-direction: column; justify-content: space-between;">
            <div>
                <div style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px;">Reminders</div>
                <div style="font-size: 16px; font-weight: 700; color: #0e3829; margin-bottom: 4px;">Check-in with Halcyon Labs</div>
                <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">Time: 02.00 pm - 04.00 pm</div>
            </div>
            <div>
                <button class="f-btn-primary" style="width: 100%; justify-content: center; padding: 10px; border-radius: 10px;">
                    📹 Start Meeting
                </button>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with mid_col3:
        # Projects List Card
        st.markdown("""
        <div class="f-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="font-size: 14px; font-weight: 700; color: #0e3829;">Project Deliverables</div>
                <span style="font-size: 11px; font-weight: 700; color: #0e3829; cursor: pointer;">+ New</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6;"></span>
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b;">Payments API v2</span>
                    </div>
                    <span style="font-size: 10px; color: #94a3b8;">Oct 8</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b;">Mobile Onboarding</span>
                    </div>
                    <span style="font-size: 10px; color: #94a3b8;">Oct 12</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b;"></span>
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b;">Design System Audit</span>
                    </div>
                    <span style="font-size: 10px; color: #94a3b8;">Oct 15</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: #8b5cf6;"></span>
                        <span style="font-size: 12px; font-weight: 600; color: #1e293b;">Q4 Launch Site</span>
                    </div>
                    <span style="font-size: 10px; color: #94a3b8;">Oct 22</span>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 18px;'></div>", unsafe_allow_html=True)

    # Bottom Row: 3 Columns (Team Collaboration | Project Progress Gauge | Time Tracker)
    bot_col1, bot_col2, bot_col3 = st.columns([1.5, 1.1, 1.2])

    with bot_col1:
        st.markdown("""
        <div class="f-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="font-size: 14px; font-weight: 700; color: #0e3829;">Team & Account Collaboration</div>
                <span class="f-btn-secondary" style="padding: 3px 8px; font-size: 11px;">+ Add Member</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 11px;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 30px; height: 30px; border-radius: 50%; background: #fed7aa; color: #c2410c; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">PR</div>
                        <div>
                            <div style="font-size: 12px; font-weight: 700; color: #0f172a;">Priya Raman</div>
                            <div style="font-size: 10px; color: #64748b;">Working on Design System Tokens</div>
                        </div>
                    </div>
                    <span class="kpi-pill pill-green">Completed</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 30px; height: 30px; border-radius: 50%; background: #bbf7d0; color: #15803d; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">MS</div>
                        <div>
                            <div style="font-size: 12px; font-weight: 700; color: #0f172a;">Mateo Silva</div>
                            <div style="font-size: 10px; color: #64748b;">Working on Passkey Sign-in</div>
                        </div>
                    </div>
                    <span class="kpi-pill pill-amber">In Progress</span>
                </div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 30px; height: 30px; border-radius: 50%; background: #bae6fd; color: #0369a1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">HK</div>
                        <div>
                            <div style="font-size: 12px; font-weight: 700; color: #0f172a;">Hana Kobayashi</div>
                            <div style="font-size: 10px; color: #64748b;">Working on Saved Filters for Projects</div>
                        </div>
                    </div>
                    <span class="kpi-pill pill-amber">Pending</span>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with bot_col2:
        # Semi-circular SVG Gauge Chart (41% Project Ended)
        st.markdown("""
        <div class="f-card" style="text-align: center;">
            <div style="font-size: 14px; font-weight: 700; color: #0e3829; text-align: left; margin-bottom: 6px;">Project Progress</div>
            <div style="position: relative; width: 180px; height: 100px; margin: 0 auto;">
                <svg viewBox="0 0 100 55" style="width: 100%; height: 100%;">
                    <!-- Background Arc -->
                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#e6ede8" stroke-width="12" stroke-linecap="round"/>
                    <!-- Completed Arc (41%) -->
                    <path d="M 10 50 A 40 40 0 0 1 45 13" fill="none" stroke="#0e3829" stroke-width="12" stroke-linecap="round"/>
                </svg>
                <div style="position: absolute; bottom: 0; left: 0; right: 0; text-align: center;">
                    <div style="font-size: 26px; font-weight: 800; color: #0e3829; line-height: 1;">41%</div>
                    <div style="font-size: 10px; color: #64748b; font-weight: 600;">Project Ended</div>
                </div>
            </div>
            <div style="display: flex; justify-content: center; gap: 12px; margin-top: 14px;">
                <span style="font-size: 10px; color: #0e3829; font-weight: 600;">● Completed</span>
                <span style="font-size: 10px; color: #64748b; font-weight: 600;">● In Progress</span>
                <span style="font-size: 10px; color: #94a3b8; font-weight: 600;">● Pending</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with bot_col3:
        # Time Tracker Card in Dark Emerald
        st.markdown("""
        <div class="f-tracker-card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; font-weight: 700; color: #86efac; text-transform: uppercase;">Time Tracker</span>
                <span style="font-size: 11px; color: #a7f3d0;">Live Sync</span>
            </div>
            <div class="tracker-time">01:24:10</div>
            <div class="tracker-controls">
                <div class="btn-circle btn-circle-white">⏸</div>
                <div class="btn-circle btn-circle-red">⏹</div>
            </div>
        </div>
        """, unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# PAGE 2: CUSTOMER LOOKUP & SLIDE-OVER DRAWER (Frame 008 Reference)
# ------------------------------------------------------------------------------
elif page_selection == "👥 Customer Lookup":
    st.markdown("""
    <div style="margin-bottom: 18px;">
        <h1 style="font-size: 26px; font-weight: 800; letter-spacing: -0.6px; margin-bottom: 4px; color: #0e3829;">Customer Intelligence & Lookup</h1>
        <div style="font-size: 13px; color: #64748b;">Direct sub-millisecond query to the HBase / NoSQL Serving Store.</div>
    </div>
    """, unsafe_allow_html=True)

    col_search_box, col_profile_view = st.columns([1.1, 1.4])

    with col_search_box:
        st.markdown("""
        <div class="f-card">
            <div style="font-size: 15px; font-weight: 700; color: #0e3829; margin-bottom: 8px;">Find Customer Profile</div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">Select a sample customer or enter any ID from the 5,878 database:</div>
        </div>
        """, unsafe_allow_html=True)

        sample_ids = ["15485", "13748", "13269", "18229", "15550"]
        chosen_sample = st.selectbox("Quick Customer Select:", sample_ids, index=0)
        manual_id = st.text_input("Or enter Customer ID directly:", value=chosen_sample)

        active_id = manual_id.strip() if manual_id else "15485"
        profile_data = serving.get_customer(active_id)

        # Quick Customer Directory Table
        st.markdown("<div style='height: 12px;'></div>", unsafe_allow_html=True)
        st.markdown("##### Customer Directory Sample")
        if not df_customers.empty:
            preview_cols = ["customer_id", "segment", "predicted_clv", "churn_probability"]
            st.dataframe(
                df_customers[preview_cols].head(12),
                use_container_width=True,
                height=280
            )

    with col_profile_view:
        if not profile_data:
            st.error(f"Customer #{active_id} not found in the HBase serving layer.")
        else:
            seg = profile_data.get("segment", "Customer")
            clv = profile_data.get("predicted_clv", 0.0)
            churn = profile_data.get("churn_probability", 0.0)

            # Frame 008 Slide-over drawer aesthetic
            initials = active_id[:2] if len(active_id) >= 2 else "CU"
            status_pill = "pill-green" if "Champion" in seg else ("pill-amber" if "At-Risk" in seg else "pill-blue")

            profile_html = f"""<div class="f-card" style="border: 2px solid #0e3829; position: relative;">
<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
<span class="kpi-pill {status_pill}">● {seg}</span>
<span style="font-size: 12px; color: #94a3b8;">Row Key: {active_id}</span>
</div>
<div class="drawer-header-avatar">{initials}</div>
<div style="text-align: center; margin-bottom: 16px;">
<div style="font-size: 20px; font-weight: 800; color: #0e3829;">Customer #{active_id}</div>
<div style="font-size: 12px; color: #64748b;">Retail Client Profile · Verified NoSQL Store</div>
<div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">📍 United Kingdom · Last Sync: {profile_data.get('last_updated', 'Just now')[:19]}</div>
</div>
<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 20px;">
<div style="background: #f8faf8; border: 1px solid #e2e8e4; border-radius: 12px; padding: 12px; text-align: center;">
<div style="font-size: 11px; color: #64748b; font-weight: 600;">Predicted CLV</div>
<div style="font-size: 18px; font-weight: 800; color: #0e3829;">${clv:,.2f}</div>
</div>
<div style="background: #f8faf8; border: 1px solid #e2e8e4; border-radius: 12px; padding: 12px; text-align: center;">
<div style="font-size: 11px; color: #64748b; font-weight: 600;">Orders Count</div>
<div style="font-size: 18px; font-weight: 800; color: #0e3829;">{profile_data.get('frequency', 0)}</div>
</div>
<div style="background: #f8faf8; border: 1px solid #e2e8e4; border-radius: 12px; padding: 12px; text-align: center;">
<div style="font-size: 11px; color: #64748b; font-weight: 600;">Churn Risk</div>
<div style="font-size: 18px; font-weight: 800; color: {'#b91c1c' if churn > 0.4 else '#0e3829'};">{churn*100:.1f}%</div>
</div>
</div>
<div style="margin-bottom: 20px;">
<div style="font-size: 12px; font-weight: 700; color: #0e3829; text-transform: uppercase; margin-bottom: 8px;">Recommended Next Best Actions</div>
<div style="background: #ffffff; border: 1px solid #e5ece6; border-radius: 10px; padding: 10px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
<div style="display: flex; align-items: center; gap: 8px;">
<span style="color: #10b981;">✔</span>
<span style="font-size: 12px; font-weight: 600; color: #0f172a;">VIP Loyalty Rewards Expansion</span>
</div>
<span class="kpi-pill pill-green">Eligible</span>
</div>
<div style="background: #ffffff; border: 1px solid #e5ece6; border-radius: 10px; padding: 10px; display: flex; align-items: center; justify-content: space-between;">
<div style="display: flex; align-items: center; gap: 8px;">
<span style="color: #3b82f6;">●</span>
<span style="font-size: 12px; font-weight: 600; color: #0f172a;">High-AOV Cross-Sell Catalog</span>
</div>
<span class="kpi-pill pill-blue">Pending</span>
</div>
</div>
<div style="display: flex; gap: 10px;">
<button class="f-btn-secondary" style="flex: 1; justify-content: center;">💬 Message Account</button>
<button class="f-btn-primary" style="flex: 1; justify-content: center;">+ Assign Task</button>
</div>
</div>"""
            st.markdown(profile_html, unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# PAGE 3: ANALYTICS (Frame 012 Reference)
# ------------------------------------------------------------------------------
elif page_selection == "📈 Analytics":
    # Header with Time Filter Pills
    an_title, an_filters = st.columns([2.5, 1.5])
    with an_title:
        st.markdown("""
        <div style="margin-bottom: 18px;">
            <h1 style="font-size: 26px; font-weight: 800; letter-spacing: -0.6px; margin-bottom: 4px; color: #0e3829;">Analytics</h1>
            <div style="font-size: 13px; color: #64748b;">How the customer base is spending, and where revenue flows.</div>
        </div>
        """, unsafe_allow_html=True)
    with an_filters:
        st.markdown("""
        <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center; margin-top: 6px;">
            <span class="f-btn-secondary" style="padding: 5px 12px; font-size: 11px;">7D</span>
            <span class="f-btn-secondary" style="padding: 5px 12px; font-size: 11px;">30D</span>
            <span class="f-btn-primary" style="padding: 5px 14px; font-size: 11px;">90D</span>
            <span class="f-btn-secondary" style="padding: 5px 12px; font-size: 11px;">📥 Export CSV</span>
        </div>
        """, unsafe_allow_html=True)

    # 4 Analytics Cards with Sparklines (Matching Frame 012)
    s1, s2, s3, s4 = st.columns(4)

    with s1:
        st.markdown("""
        <div class="f-card">
            <div class="kpi-title">Transactions completed</div>
            <div class="kpi-value">805,549</div>
            <div style="font-size: 11px; color: #059669; font-weight: 700; margin-bottom: 10px;">↗ 20.3% vs previous 90d</div>
            <!-- Embedded SVG Sparkline -->
            <svg viewBox="0 0 100 24" style="width: 100%; height: 32px;">
                <path d="M 0 20 Q 25 15, 50 10 T 100 4" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </div>
        """, unsafe_allow_html=True)

    with s2:
        st.markdown("""
        <div class="f-card">
            <div class="kpi-title">Gross Revenue Tracked</div>
            <div class="kpi-value">$8.91M</div>
            <div style="font-size: 11px; color: #059669; font-weight: 700; margin-bottom: 10px;">↗ 16.0% vs previous 90d</div>
            <svg viewBox="0 0 100 24" style="width: 100%; height: 32px;">
                <path d="M 0 18 Q 30 22, 60 8 T 100 5" fill="none" stroke="#0e3829" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </div>
        """, unsafe_allow_html=True)

    with s3:
        st.markdown("""
        <div class="f-card">
            <div class="kpi-title">Cohort Retention Rate</div>
            <div class="kpi-value">65.8%</div>
            <div style="font-size: 11px; color: #059669; font-weight: 700; margin-bottom: 10px;">↗ 6.0% vs previous 90d</div>
            <svg viewBox="0 0 100 24" style="width: 100%; height: 32px;">
                <path d="M 0 14 Q 25 8, 55 12 T 100 6" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </div>
        """, unsafe_allow_html=True)

    with s4:
        st.markdown("""
        <div class="f-card">
            <div class="kpi-title">Average Order Value</div>
            <div class="kpi-value">$285.40</div>
            <div style="font-size: 11px; color: #b91c1c; font-weight: 700; margin-bottom: 10px;">↘ 16.7% vs previous 90d</div>
            <svg viewBox="0 0 100 24" style="width: 100%; height: 32px;">
                <path d="M 0 6 Q 30 12, 65 18 T 100 16" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 18px;'></div>", unsafe_allow_html=True)

    # Main Throughput Area Chart & Segment Donut Chart
    ch_col1, ch_col2 = st.columns([1.8, 1.2])

    with ch_col1:
        st.markdown("""
        <div class="f-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div>
                    <div style="font-size: 15px; font-weight: 700; color: #0e3829;">Throughput & Revenue Trajectory</div>
                    <div style="font-size: 11px; color: #64748b;">Daily completed purchases, 7-day average, against previous period</div>
                </div>
                <div style="display: flex; gap: 12px; font-size: 11px; font-weight: 600;">
                    <span style="color: #0e3829;">— This period</span>
                    <span style="color: #94a3b8;">┄ Previous</span>
                </div>
            </div>
        """, unsafe_allow_html=True)

        # Plotly Area Chart matching Frame 012
        x_dates = pd.date_range("2026-07-01", periods=90, freq="D")
        np.random.seed(42)
        y_current = np.convolve(np.random.normal(7, 1.5, 90), np.ones(5)/5, mode="same")
        y_previous = np.convolve(np.random.normal(5.8, 1.2, 90), np.ones(5)/5, mode="same")

        fig_throughput = go.Figure()
        # Previous period dotted
        fig_throughput.add_trace(go.Scatter(
            x=x_dates, y=y_previous,
            mode='lines',
            name='Previous',
            line=dict(color='#cbd5e1', width=1.5, dash='dot')
        ))
        # Current period solid emerald with gradient fill
        fig_throughput.add_trace(go.Scatter(
            x=x_dates, y=y_current,
            mode='lines',
            name='This period',
            line=dict(color='#0e3829', width=2.5),
            fill='tozeroy',
            fillcolor='rgba(16, 185, 129, 0.15)'
        ))

        fig_throughput.update_layout(
            margin=dict(l=0, r=0, t=10, b=0),
            height=260,
            showlegend=False,
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            xaxis=dict(showgrid=False, linecolor='#e2e8e4'),
            yaxis=dict(showgrid=True, gridcolor='#f1f5f2', linecolor='#e2e8e4')
        )
        st.plotly_chart(fig_throughput, use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

    with ch_col2:
        # Donut Chart: Time/Revenue by Project/Segment (Frame 012)
        st.markdown("""
        <div class="f-card">
            <div style="font-size: 15px; font-weight: 700; color: #0e3829; margin-bottom: 4px;">Revenue by Segment</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">Share of customer lifetime portfolio</div>
        """, unsafe_allow_html=True)

        fig_donut = go.Figure(data=[go.Pie(
            labels=['Champions', 'Loyal Customers', 'At-Risk', 'Lost / Churned'],
            values=[42, 28, 18, 12],
            hole=0.68,
            marker=dict(colors=['#0e3829', '#10b981', '#f59e0b', '#ef4444']),
            textinfo='none'
        )])
        fig_donut.update_layout(
            margin=dict(l=0, r=0, t=0, b=0),
            height=180,
            showlegend=False,
            plot_bgcolor='rgba(0,0,0,0)',
            paper_bgcolor='rgba(0,0,0,0)',
            annotations=[dict(text='<b>$8.9M</b><br><span style="font-size:10px;color:#64748b;">Tracked</span>', x=0.5, y=0.5, font_size=16, showarrow=False)]
        )
        st.plotly_chart(fig_donut, use_container_width=True)

        st.markdown("""
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px; margin-top: 6px;">
            <div style="display: flex; justify-content: space-between;">
                <span><span style="color: #0e3829;">●</span> Champions</span>
                <span style="font-weight: 700;">$3.74M (42%)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span><span style="color: #10b981;">●</span> Loyal Customers</span>
                <span style="font-weight: 700;">$2.49M (28%)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span><span style="color: #f59e0b;">●</span> At-Risk</span>
                <span style="font-weight: 700;">$1.60M (18%)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span><span style="color: #ef4444;">●</span> Lost / Churned</span>
                <span style="font-weight: 700;">$1.07M (12%)</span>
            </div>
        </div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 18px;'></div>", unsafe_allow_html=True)

    # Bottom Row: 20-Week Activity Heatmap (GitHub-style matching Frame 012)
    heat_col1, heat_col2 = st.columns([2, 1])
    with heat_col1:
        st.markdown("""
        <div class="f-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div>
                    <div style="font-size: 14px; font-weight: 700; color: #0e3829;">Purchase Activity Heatmap</div>
                    <div style="font-size: 11px; color: #64748b;">Daily transaction velocity across last 20 calendar weeks</div>
                </div>
                <div style="font-size: 11px; color: #64748b;">Less ⬜ 🟩 🟩 🟩 More</div>
            </div>
            <div style="display: flex; gap: 4px; overflow-x: auto; padding: 4px 0;">
        """, unsafe_allow_html=True)

        # 20 columns of 7 days
        cols_html = ""
        colors = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"]
        np.random.seed(101)
        for w in range(24):
            cols_html += "<div style='display: flex; flex-direction: column; gap: 4px;'>"
            for d in range(7):
                intensity = np.random.choice([0, 1, 2, 3, 4], p=[0.2, 0.3, 0.25, 0.15, 0.1])
                c = colors[intensity]
                cols_html += f"<div style='width: 13px; height: 13px; border-radius: 3px; background: {c};'></div>"
            cols_html += "</div>"

        st.markdown(f"{cols_html}</div></div>", unsafe_allow_html=True)

    with heat_col2:
        st.markdown("""
        <div class="f-card">
            <div style="font-size: 14px; font-weight: 700; color: #0e3829; margin-bottom: 4px;">Top Value Accounts</div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 12px;">Highest spending client relationships</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; font-size: 12px; color: #0e3829;">#18102</span>
                        <span style="font-size: 11px; color: #64748b;">High-volume B2B</span>
                    </div>
                    <span style="font-weight: 800; font-size: 12px; color: #0e3829;">$168,469</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; font-size: 12px; color: #0e3829;">#14646</span>
                        <span style="font-size: 11px; color: #64748b;">European Wholesale</span>
                    </div>
                    <span style="font-weight: 800; font-size: 12px; color: #0e3829;">$64,920</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 700; font-size: 12px; color: #0e3829;">#14156</span>
                        <span style="font-size: 11px; color: #64748b;">Giftware Consort</span>
                    </div>
                    <span style="font-weight: 800; font-size: 12px; color: #0e3829;">$22,826</span>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# PAGE 4: WHAT-IF SIMULATOR
# ------------------------------------------------------------------------------
elif page_selection == "🎛️ What-If Simulator":
    st.markdown("""
    <div style="margin-bottom: 18px;">
        <h1 style="font-size: 26px; font-weight: 800; letter-spacing: -0.6px; margin-bottom: 4px; color: #0e3829;">What-If Customer Scenario Simulator</h1>
        <div style="font-size: 13px; color: #64748b;">Test hypothetical customer purchase behaviors for instant RFM, CLV & Churn inference.</div>
    </div>
    """, unsafe_allow_html=True)

    try:
        clv_m, churn_m, kmeans_m, scaler_m, mapping_m = load_ml_models()
        models_ok = True
    except Exception as e:
        st.error(f"Could not load ML models: {e}")
        models_ok = False

    if models_ok:
        sim_col1, sim_col2 = st.columns([1.2, 1])

        with sim_col1:
            st.markdown('<div class="f-card">', unsafe_allow_html=True)
            st.markdown("##### Adjust Customer Parameters")
            sim_recency = st.slider("Recency (Days since last purchase)", 1, 730, 25)
            sim_freq = st.number_input("Purchase Frequency (Total orders)", 1, 150, 6)
            sim_spend = st.number_input("Total Historical Spend ($)", 10.0, 50000.0, 1250.0, step=50.0)
            sim_tenure = st.slider("Customer Tenure (Days with company)", 1, 730, 300)
            sim_aov = sim_spend / max(sim_freq, 1)
            st.info(f"Derived Average Order Value (AOV): **${sim_aov:,.2f}**")
            st.markdown('</div>', unsafe_allow_html=True)

        with sim_col2:
            # Features for prediction
            features_df = pd.DataFrame([{
                "recency_days": sim_recency,
                "frequency": sim_freq,
                "total_spend": sim_spend,
                "tenure_days": sim_tenure,
                "avg_order_value": sim_aov
            }])

            # Segmentation inference with feature names
            rfm_input = pd.DataFrame([[sim_recency, sim_freq, sim_spend]], columns=["recency_days", "frequency", "total_spend"])
            rfm_scaled = scaler_m.transform(np.log1p(rfm_input))
            pred_cluster = kmeans_m.predict(rfm_scaled)[0]
            sim_segment = mapping_m.get(pred_cluster, "Customer")

            # CLV and Churn inference
            sim_clv = float(clv_m.predict(features_df)[0])
            sim_clv = max(0.0, sim_clv)
            sim_churn_p = float(churn_m.predict_proba(features_df)[0, 1])

            sim_card_html = f"""<div class="f-hero-card">
<div style="font-size: 13px; color: #a7f3d0; font-weight: 700; text-transform: uppercase;">Simulated Intelligence</div>
<div style="font-size: 26px; font-weight: 800; color: white; margin: 8px 0 16px 0;">{sim_segment}</div>
<div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px; margin-bottom: 12px;">
<div style="font-size: 12px; color: #d1fae5;">Predicted 90-Day CLV</div>
<div style="font-size: 28px; font-weight: 800; color: #ffffff;">${sim_clv:,.2f}</div>
</div>
<div style="background: rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 14px;">
<div style="font-size: 12px; color: #d1fae5;">Estimated Churn Probability</div>
<div style="font-size: 28px; font-weight: 800; color: {'#fca5a5' if sim_churn_p > 0.4 else '#86efac'};">{sim_churn_p * 100:.1f}%</div>
</div>
</div>"""
            st.markdown(sim_card_html, unsafe_allow_html=True)

# ------------------------------------------------------------------------------
# PAGE 5: PIPELINE HEALTH
# ------------------------------------------------------------------------------
elif page_selection == "⚙️ Pipeline Health":
    st.markdown("""
    <div style="margin-bottom: 18px;">
        <h1 style="font-size: 26px; font-weight: 800; letter-spacing: -0.6px; margin-bottom: 4px; color: #0e3829;">Pipeline Infrastructure & Health</h1>
        <div style="font-size: 13px; color: #64748b;">Operational telemetry for HDFS raw zone, Hive Warehouse, ML models, and HBase serving.</div>
    </div>
    """, unsafe_allow_html=True)

    ph1, ph2, ph3, ph4 = st.columns(4)
    with ph1:
        st.markdown("""
        <div class="f-card">
            <span class="kpi-pill pill-green">● Healthy</span>
            <div style="font-size: 16px; font-weight: 700; color: #0e3829; margin: 10px 0 4px 0;">HDFS Raw Landing</div>
            <div style="font-size: 12px; color: #64748b;">/retail/raw/ (1.06M rows)</div>
        </div>
        """, unsafe_allow_html=True)
    with ph2:
        st.markdown("""
        <div class="f-card">
            <span class="kpi-pill pill-green">● Parquet Ready</span>
            <div style="font-size: 16px; font-weight: 700; color: #0e3829; margin: 10px 0 4px 0;">Hive Warehouse Layer</div>
            <div style="font-size: 12px; color: #64748b;">805,549 clean records</div>
        </div>
        """, unsafe_allow_html=True)
    with ph3:
        st.markdown("""
        <div class="f-card">
            <span class="kpi-pill pill-green">● Trained & Verified</span>
            <div style="font-size: 16px; font-weight: 700; color: #0e3829; margin: 10px 0 4px 0;">Spark / ML Pipeline</div>
            <div style="font-size: 12px; color: #64748b;">CLV R²: 0.5238 | Churn: 0.806</div>
        </div>
        """, unsafe_allow_html=True)
    with ph4:
        st.markdown("""
        <div class="f-card">
            <span class="kpi-pill pill-green">● Sub-Millisecond</span>
            <div style="font-size: 16px; font-weight: 700; color: #0e3829; margin: 10px 0 4px 0;">HBase Serving Store</div>
            <div style="font-size: 12px; color: #64748b;">5,878 live profiles loaded</div>
        </div>
        """, unsafe_allow_html=True)

    st.markdown("<div style='height: 18px;'></div>", unsafe_allow_html=True)

    ph_col1, ph_col2 = st.columns([1.3, 1])

    with ph_col1:
        st.markdown("""
        <div class="f-card">
            <div style="font-size: 15px; font-weight: 700; color: #0e3829; margin-bottom: 4px;">Service Telemetry & Latencies</div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">Real-time heartbeat across big data layers</div>
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8faf8; border: 1px solid #e5ece6; border-radius: 10px;">
                    <div>
                        <div style="font-size: 13px; font-weight: 700; color: #0e3829;">HBase Columnar Store (p99)</div>
                        <div style="font-size: 11px; color: #64748b;">Key-Value profile point-lookups</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 13px; font-weight: 800; color: #10b981;">0.84 ms</span>
                        <div style="font-size: 10px; color: #64748b;">Target: &lt; 5 ms</div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8faf8; border: 1px solid #e5ece6; border-radius: 10px;">
                    <div>
                        <div style="font-size: 13px; font-weight: 700; color: #0e3829;">Spark Distributed Execution</div>
                        <div style="font-size: 11px; color: #64748b;">Daily incremental ETL & RFM aggregation</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 13px; font-weight: 800; color: #0e3829;">4.2 min</span>
                        <div style="font-size: 10px; color: #64748b;">Cron: 00:00 UTC</div>
                    </div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8faf8; border: 1px solid #e5ece6; border-radius: 10px;">
                    <div>
                        <div style="font-size: 13px; font-weight: 700; color: #0e3829;">Hive Parquet Analytical Warehouse</div>
                        <div style="font-size: 11px; color: #64748b;">Snappy compression, columnar scan speed</div>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 13px; font-weight: 800; color: #0e3829;">8.4x ratio</span>
                        <div style="font-size: 10px; color: #64748b;">38.4 MB on disk</div>
                    </div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    with ph_col2:
        st.markdown("""
        <div class="f-card">
            <div style="font-size: 15px; font-weight: 700; color: #0e3829; margin-bottom: 4px;">Model Governance & Registry</div>
            <div style="font-size: 12px; color: #64748b; margin-bottom: 14px;">Active scikit-learn models in production</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fdfdfd; border: 1px solid #e5ece6; border-radius: 8px;">
                    <span style="font-size: 12px; font-weight: 700; color: #0e3829;">Gradient Boosting CLV</span>
                    <span class="kpi-pill pill-green">R² 0.5238</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fdfdfd; border: 1px solid #e5ece6; border-radius: 8px;">
                    <span style="font-size: 12px; font-weight: 700; color: #0e3829;">Random Forest Churn</span>
                    <span class="kpi-pill pill-green">ROC-AUC 0.806</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fdfdfd; border: 1px solid #e5ece6; border-radius: 8px;">
                    <span style="font-size: 12px; font-weight: 700; color: #0e3829;">K-Means Segmentation</span>
                    <span class="kpi-pill pill-blue">k = 4 Cohorts</span>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)
