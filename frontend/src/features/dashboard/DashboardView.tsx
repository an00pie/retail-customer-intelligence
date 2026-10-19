import React, { useState } from 'react';
import { DashboardKpis, TrajectoryData, CohortSummary } from '../../types';
import { DualAxisTrajectoryChart } from '../../components/charts/DualAxisTrajectoryChart';
import { formatCurrency, formatNumber } from '../../lib/formatters';

interface DashboardViewProps {
  kpis: DashboardKpis | null;
  trajectory: TrajectoryData | null;
  cohorts: CohortSummary | null;
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
  onNavigateTab: (tab: string) => void;
  onQuickLookup: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  kpis,
  trajectory,
  cohorts,
  selectedPeriod,
  onSelectPeriod,
  onNavigateTab,
  onQuickLookup,
}) => {
  const [quickInput, setQuickInput] = useState('15485');

  // Interactive quick RFM sliders state
  const [rfmR, setRfmR] = useState(25);
  const [rfmF, setRfmF] = useState(6);
  const [rfmM, setRfmM] = useState(1250);
  const [rfmT, setRfmT] = useState(300);

  // Derive simple grade
  const rfmGrade = rfmR < 35 && rfmM > 1000 ? 'A' : (rfmR > 180 ? 'C' : 'B');
  const rfmSeg = rfmR < 35 && (rfmF >= 8 || rfmM >= 2500) ? 'Champions' : (rfmR > 180 ? 'At-Risk' : 'Loyal Customers');

  const cohortList = cohorts?.cohorts || {
    'Champions': { count: 1241, percentage: 20.9, avg_recency: 24.8, avg_frequency: 20.0, avg_monetary: 11466.0 },
    'Loyal Customers': { count: 1187, percentage: 20.0, avg_recency: 27.6, avg_frequency: 3.0, avg_monetary: 855.0 },
    'At-Risk': { count: 1475, percentage: 24.8, avg_recency: 210.7, avg_frequency: 5.4, avg_monetary: 2148.2 },
    'Lost / Churned': { count: 2038, percentage: 34.3, avg_recency: 393.0, avg_frequency: 1.4, avg_monetary: 346.0 },
  };

  return (
    <div className="dash-overview-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 4 KPI Cards */}
      <div className="dash-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Total Customers */}
        <div className="dash-kpi-card-luxury" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <span className="dash-kpi-title">Total Customers</span>
            <div className="dash-kpi-icon-box box-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="dash-kpi-num" style={{ fontSize: '28px', marginBottom: '6px' }}>
            {formatNumber(kpis?.total_customers ?? 5942)}
          </div>
          <div style={{ fontSize: '11px', color: '#8e9693' }}>
            Customer profiles in serving store
          </div>
        </div>

        {/* Total Orders */}
        <div className="dash-kpi-card-luxury" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <span className="dash-kpi-title">Total Orders</span>
            <div className="dash-kpi-icon-box box-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
          </div>
          <div className="dash-kpi-num" style={{ fontSize: '28px', marginBottom: '6px' }}>
            {formatNumber(kpis?.total_orders ?? 17132)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="trend-down" style={{ fontSize: '10.5px' }}>
              ↓ {Math.abs(kpis?.orders_growth ?? 6.5)}%
            </span>
            <span style={{ fontSize: '11px', color: '#8e9693' }}>vs previous period</span>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="dash-kpi-card-luxury" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <span className="dash-kpi-title">Avg. Order Value</span>
            <div className="dash-kpi-icon-box box-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
          </div>
          <div className="dash-kpi-num" style={{ fontSize: '28px', marginBottom: '6px' }}>
            {formatCurrency(kpis?.average_order_value ?? 486.73)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="trend-up" style={{ fontSize: '10.5px' }}>
              ↑ +{kpis?.aov_growth ?? 2.3}%
            </span>
            <span style={{ fontSize: '11px', color: '#8e9693' }}>vs previous period</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="dash-kpi-card-luxury" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
            <span className="dash-kpi-title">Total Revenue</span>
            <div className="dash-kpi-icon-box box-white" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
          </div>
          <div className="dash-kpi-num" style={{ fontSize: '28px', marginBottom: '6px' }}>
            {formatCurrency(kpis?.total_revenue ?? 8338712.01)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="trend-down" style={{ fontSize: '10.5px' }}>
              ↓ {Math.abs(kpis?.revenue_growth ?? 4.3)}%
            </span>
            <span style={{ fontSize: '11px', color: '#8e9693' }}>vs previous period</span>
          </div>
        </div>
      </div>

      {/* Trajectory Dual-Axis Chart */}
      <DualAxisTrajectoryChart
        data={trajectory}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={onSelectPeriod}
      />

      {/* 3 Overview Action Modules */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Module 1: Customer Lookup Preview */}
        <div className="dash-ov-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="dash-ov-icon-box box-white" style={{ width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" x2="16.65" y1="21" y2="16.65" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Customer Lookup</div>
                <div style={{ fontSize: '11.5px', color: '#8e9693' }}>Direct query to HBase columnar KV store</div>
              </div>
            </div>
            <button
              type="button"
              className="btn-pill-ghost"
              onClick={() => onNavigateTab('lookup')}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '999px' }}
            >
              Expand ↗
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Enter Customer ID (e.g. 15485)"
              className="dash-search-input"
              style={{ flex: 1, padding: '9px 12px', fontSize: '12.5px' }}
            />
            <button
              type="button"
              className="btn-pill-primary"
              onClick={() => onQuickLookup(quickInput)}
              style={{ padding: '9px 16px', fontSize: '12px' }}
            >
              Search
            </button>
          </div>

          {/* Quick Profile Snippet */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: '13px', color: '#fff' }}>
                #15485
              </span>
              <span className="ui-badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff', fontSize: '10.5px' }}>
                Champions
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#8e9693' }}>
              <div>Predicted CLV: <strong style={{ color: '#fff' }}>$860.13</strong></div>
              <div>Recency: <strong style={{ color: '#fff' }}>29 days</strong></div>
              <div>Orders: <strong style={{ color: '#fff' }}>8 orders</strong></div>
              <div>Total Spend: <strong style={{ color: '#fff' }}>$5,624.51</strong></div>
            </div>
          </div>
        </div>

        {/* Module 2: RFM Behavioral Calculator */}
        <div className="dash-ov-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="dash-ov-icon-box box-white" style={{ width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>RFM Analytics</div>
                <div style={{ fontSize: '11.5px', color: '#8e9693' }}>Recency, frequency &amp; monetary dimensions</div>
              </div>
            </div>
            <button
              type="button"
              className="btn-pill-ghost"
              onClick={() => onNavigateTab('rfm')}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '999px' }}
            >
              Expand ↗
            </button>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8e9693' }}>Recency: {rfmR}d</span>
                <span style={{ color: '#8e9693' }}>Freq: {rfmF} txns</span>
              </div>
              <input
                type="range"
                min="1"
                max="365"
                value={rfmR}
                onChange={(e) => setRfmR(Number(e.target.value))}
                className="rfm-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8e9693' }}>Monetary: ${rfmM}</span>
                <span style={{ color: '#8e9693' }}>Tenure: {rfmT}d</span>
              </div>
              <input
                type="range"
                min="50"
                max="5000"
                step="50"
                value={rfmM}
                onChange={(e) => setRfmM(Number(e.target.value))}
                className="rfm-slider"
              />
            </div>

            <div style={{ width: '90px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff' }}>{rfmGrade}</div>
              <div style={{ fontSize: '10px', color: '#8e9693', marginTop: '2px' }}>{rfmSeg}</div>
            </div>
          </div>

          <button
            type="button"
            className="btn-pill-primary"
            onClick={() => onNavigateTab('simulator')}
            style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px' }}
          >
            Launch What-If Simulator →
          </button>
        </div>

        {/* Module 3: Customer Segmentation */}
        <div className="dash-ov-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="dash-ov-icon-box box-white" style={{ width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>Customer Segmentation</div>
                <div style={{ fontSize: '11.5px', color: '#8e9693' }}>K-Means behavioral clustering</div>
              </div>
            </div>
            <button
              type="button"
              className="btn-pill-ghost"
              onClick={() => onNavigateTab('segmentation')}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '999px' }}
            >
              Expand ↗
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {Object.entries(cohortList).map(([name, item]) => (
              <div
                key={name}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px',
                }}
              >
                <div style={{ fontSize: '11px', color: '#8e9693', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {name}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
                  {item.percentage}%
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: '11px', color: '#8e9693', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Authoritative Profiles: <strong style={{ color: '#fff' }}>5,942</strong></span>
            <span>K = 4 Clusters</span>
          </div>
        </div>

      </div>
    </div>
  );
};
