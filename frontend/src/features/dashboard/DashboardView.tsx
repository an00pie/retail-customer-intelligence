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
      
      {/* 4 KPI Cards Matching Reference */}
      <div className="dash-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* Total Customers */}
        <div className="dash-kpi-card-luxury" style={{ padding: '20px 22px' }}>
          <div className="dash-kpi-card-header">
            <div className="dash-kpi-icon-box box-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="dash-kpi-title">Total Customers</span>
          </div>
          <div className="dash-kpi-val-row">
            <div className="dash-kpi-num">
              {formatNumber(kpis?.total_customers ?? 5942)}
            </div>
            <div className="dash-kpi-sparkline-motif" aria-hidden="true">
              <svg width="48" height="26" viewBox="0 0 48 26" fill="none">
                <circle cx="3" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="3" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="9" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="9" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="9" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="15" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="15" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="15" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="21" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="21" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="21" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="21" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="27" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="27" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="27" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="27" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="27" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="33" cy="5" r="1.2" fill="#ffffff" fillOpacity="0.9"/>
                <circle cx="33" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="33" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="33" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="33" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="33" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="39" cy="1" r="1.3" fill="#ffffff"/>
                <circle cx="39" cy="5" r="1.2" fill="#ffffff" fillOpacity="0.9"/>
                <circle cx="39" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="39" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="39" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="39" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="39" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="45" cy="1" r="1.3" fill="#ffffff"/>
                <circle cx="45" cy="5" r="1.2" fill="#ffffff" fillOpacity="0.9"/>
                <circle cx="45" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="45" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="45" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="45" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="45" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
              </svg>
            </div>
          </div>
          <div className="dash-kpi-trend trend-up">
            <span>↑ +12.4%</span>
            <span className="trend-compare">vs previous period</span>
          </div>
        </div>

        {/* Total Orders */}
        <div className="dash-kpi-card-luxury" style={{ padding: '20px 22px' }}>
          <div className="dash-kpi-card-header">
            <div className="dash-kpi-icon-box box-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
                <path d="M3 6h18" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <span className="dash-kpi-title">Total Orders</span>
          </div>
          <div className="dash-kpi-val-row">
            <div className="dash-kpi-num">
              {formatNumber(kpis?.total_orders ?? 17132)}
            </div>
            <div className="dash-kpi-sparkline-motif" aria-hidden="true">
              <svg width="48" height="26" viewBox="0 0 48 26" fill="none">
                <circle cx="3" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="3" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="3" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="3" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="3" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="9" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="9" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="9" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="9" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="15" cy="5" r="1.2" fill="#ffffff" fillOpacity="0.9"/>
                <circle cx="15" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="15" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="15" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="15" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="15" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="21" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="21" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="21" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="21" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="21" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="27" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="27" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="27" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="27" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="33" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="33" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="33" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="33" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="33" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="39" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="39" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="39" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="39" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="45" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="45" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="45" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
              </svg>
            </div>
          </div>
          <div className="dash-kpi-trend trend-down">
            <span>↓ -6.5%</span>
            <span className="trend-compare">vs previous period</span>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="dash-kpi-card-luxury" style={{ padding: '20px 22px' }}>
          <div className="dash-kpi-card-header">
            <div className="dash-kpi-icon-box box-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="20" height="14" x="2" y="5" rx="2" />
                <line x1="2" x2="22" y1="10" y2="10" />
              </svg>
            </div>
            <span className="dash-kpi-title">Avg. Order Value</span>
          </div>
          <div className="dash-kpi-val-row">
            <div className="dash-kpi-num">
              {formatCurrency(kpis?.average_order_value ?? 486.73)}
            </div>
            <div className="dash-kpi-sparkline-motif" aria-hidden="true">
              <svg width="48" height="26" viewBox="0 0 48 26" fill="none">
                <circle cx="3" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="3" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="3" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="9" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="9" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="9" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="9" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="15" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="15" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="15" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="15" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="21" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="21" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="21" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="21" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="21" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="27" cy="5" r="1.2" fill="#ffffff" fillOpacity="0.9"/>
                <circle cx="27" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="27" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="27" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="27" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="27" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="33" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="33" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="33" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="33" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="33" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="39" cy="5" r="1.2" fill="#ffffff" fillOpacity="0.9"/>
                <circle cx="39" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="39" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="39" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="39" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="39" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="45" cy="1" r="1.3" fill="#ffffff"/>
                <circle cx="45" cy="5" r="1.2" fill="#ffffff" fillOpacity="0.9"/>
                <circle cx="45" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="45" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="45" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="45" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="45" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
              </svg>
            </div>
          </div>
          <div className="dash-kpi-trend trend-up">
            <span>↑ +2.3%</span>
            <span className="trend-compare">vs previous period</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="dash-kpi-card-luxury" style={{ padding: '20px 22px' }}>
          <div className="dash-kpi-card-header">
            <div className="dash-kpi-icon-box box-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <span className="dash-kpi-title">Total Revenue</span>
          </div>
          <div className="dash-kpi-val-row">
            <div className="dash-kpi-num">
              {formatCurrency(kpis?.total_revenue ?? 8338712.01)}
            </div>
            <div className="dash-kpi-sparkline-motif" aria-hidden="true">
              <svg width="48" height="26" viewBox="0 0 48 26" fill="none">
                <circle cx="3" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="3" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="3" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="3" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="9" cy="5" r="1.2" fill="#ffffff" fillOpacity="0.9"/>
                <circle cx="9" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="9" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="9" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="9" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="9" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="15" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="15" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="15" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="15" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="15" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="21" cy="1" r="1.3" fill="#ffffff"/>
                <circle cx="21" cy="5" r="1.2" fill="#ffffff" fillOpacity="0.9"/>
                <circle cx="21" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="21" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="21" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="21" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="21" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="27" cy="5" r="1.2" fill="#ffffff" fillOpacity="0.9"/>
                <circle cx="27" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="27" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="27" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="27" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="27" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="33" cy="9" r="1.2" fill="#ffffff" fillOpacity="0.8"/>
                <circle cx="33" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="33" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="33" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="33" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="39" cy="13" r="1.2" fill="#ffffff" fillOpacity="0.7"/>
                <circle cx="39" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="39" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="39" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
                <circle cx="45" cy="17" r="1.2" fill="#ffffff" fillOpacity="0.6"/>
                <circle cx="45" cy="21" r="1.2" fill="#ffffff" fillOpacity="0.5"/>
                <circle cx="45" cy="25" r="1.2" fill="#ffffff" fillOpacity="0.3"/>
              </svg>
            </div>
          </div>
          <div className="dash-kpi-trend trend-down">
            <span>↓ -4.3%</span>
            <span className="trend-compare">vs previous period</span>
          </div>
        </div>
      </div>

      {/* Trajectory Dual-Axis Chart */}
      <DualAxisTrajectoryChart
        data={trajectory}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={onSelectPeriod}
      />

      {/* 3 Overview Action Modules (Matching Reference Image) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        
        {/* Module 1: Top Customer Segments */}
        <div className="dash-ov-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="dash-ov-icon-box box-white" style={{ width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a10 10 0 0 1 10 10h-10z" />
                </svg>
              </div>
              <div>
                <div className="dash-ov-title">Top Customer Segments</div>
                <div style={{ fontSize: '11.5px', color: '#8e9693' }}>K-Means clustering analysis</div>
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

          <div className="ov-cohorts-grid" style={{ margin: '8px 0' }}>
            {Object.entries(cohortList).map(([name, item]) => {
              const widthMap: Record<string, string> = {
                'Champions': '61%',
                'Loyal Customers': '58%',
                'At-Risk': '72%',
                'Lost / Churned': '100%',
              };
              return (
                <button
                  type="button"
                  key={name}
                  className="ov-cohort-pill"
                  onClick={() => onNavigateTab('segmentation')}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
                >
                  <span className="ov-cohort-name" style={{ width: '110px', textAlign: 'left', fontSize: '12px', color: '#d1d5db' }}>{name}</span>
                  <div className="ov-cohort-bar-track" style={{ flex: 1, margin: '0 12px', height: '7px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div className="ov-cohort-bar-fill" style={{ width: widthMap[name] || `${item.percentage * 2.5}%`, height: '100%', background: '#ffffff', borderRadius: '999px' }} />
                  </div>
                  <span className="ov-cohort-pct" style={{ width: '45px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>{item.percentage}%</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '11px', color: '#8e9693', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Cluster Insights (Loyal Customers)</span>
            <strong style={{ color: '#fff' }}>1,187 (20.0%)</strong>
          </div>
        </div>

        {/* Module 2: RFM Analytics */}
        <div className="dash-ov-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="dash-ov-icon-box box-white" style={{ width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </div>
              <div>
                <div className="dash-ov-title">RFM Analytics</div>
                <div style={{ fontSize: '11.5px', color: '#8e9693' }}>Customer value &amp; churn risk distribution</div>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: '14px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8e9693' }}>Recency (days)</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{rfmR}</span>
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
                <span style={{ color: '#8e9693' }}>Frequency (orders)</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{rfmF}</span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                value={rfmF}
                onChange={(e) => setRfmF(Number(e.target.value))}
                className="rfm-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8e9693' }}>Monetary ($)</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>${rfmM}</span>
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
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#8e9693' }}>Tenure (days)</span>
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{rfmT}</span>
              </div>
              <input
                type="range"
                min="10"
                max="730"
                value={rfmT}
                onChange={(e) => setRfmT(Number(e.target.value))}
                className="rfm-slider"
              />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '14px 10px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.10)' }}>
              <div className="ov-grade-hexagon" style={{ margin: '0 auto 6px', width: '38px', height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '18px', color: '#fff' }}>
                {rfmGrade}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em' }}>RFM 432</div>
              <div style={{ fontSize: '10.5px', color: '#8e9693', margin: '2px 0 6px' }}>{rfmSeg}</div>
              <div style={{ fontSize: '9.5px', color: '#8e9693' }}>CLV: <strong style={{ color: '#fff' }}>$341.43</strong></div>
              <div style={{ fontSize: '9.5px', color: '#8e9693' }}>Risk: <strong style={{ color: '#d4d4d4' }}>16.7%</strong></div>
            </div>
          </div>

          <button
            type="button"
            className="btn-pill-primary"
            onClick={() => onNavigateTab('simulator')}
            style={{ width: '100%', justifyContent: 'center', fontSize: '12px', padding: '8px' }}
          >
            Calculate RFM →
          </button>
        </div>

        {/* Module 3: Recent Transactions */}
        <div className="dash-ov-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div className="dash-ov-icon-box box-white" style={{ width: '34px', height: '34px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <div>
                <div className="dash-ov-title">Recent Transactions</div>
                <div style={{ fontSize: '11.5px', color: '#8e9693' }}>Latest 5 transactions from dataset</div>
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
              style={{ flex: 1, padding: '7px 12px', fontSize: '12px' }}
            />
            <button
              type="button"
              className="btn-pill-primary"
              onClick={() => onQuickLookup(quickInput)}
              style={{ padding: '7px 14px', fontSize: '11.5px' }}
            >
              Search
            </button>
          </div>

          <div className="ov-table-wrapper" style={{ overflowX: 'auto' }}>
            <table className="ov-table" style={{ width: '100%', fontSize: '11.5px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#8e9693', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>Invoice</th>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>Customer</th>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>Amount</th>
                  <th style={{ textAlign: 'left', padding: '6px 4px' }}>Status</th>
                </tr>
              </thead>
              <tbody style={{ color: '#d1d5db' }}>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 4px' }}>2011-12-09</td>
                  <td style={{ padding: '8px 4px' }}>581483</td>
                  <td style={{ padding: '8px 4px' }}>#15485</td>
                  <td style={{ padding: '8px 4px' }}>$120.40</td>
                  <td style={{ padding: '8px 4px' }}><span className="status-pill-completed">Completed</span></td>
                </tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 4px' }}>2011-12-09</td>
                  <td style={{ padding: '8px 4px' }}>581482</td>
                  <td style={{ padding: '8px 4px' }}>#17120</td>
                  <td style={{ padding: '8px 4px' }}>$85.00</td>
                  <td style={{ padding: '8px 4px' }}><span className="status-pill-completed">Completed</span></td>
                </tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 4px' }}>2011-12-08</td>
                  <td style={{ padding: '8px 4px' }}>581481</td>
                  <td style={{ padding: '8px 4px' }}>#14322</td>
                  <td style={{ padding: '8px 4px' }}>$56.75</td>
                  <td style={{ padding: '8px 4px' }}><span className="status-pill-completed">Completed</span></td>
                </tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 4px' }}>2011-12-08</td>
                  <td style={{ padding: '8px 4px' }}>581480</td>
                  <td style={{ padding: '8px 4px' }}>#16791</td>
                  <td style={{ padding: '8px 4px' }}>$210.30</td>
                  <td style={{ padding: '8px 4px' }}><span className="status-pill-completed">Completed</span></td>
                </tr>
                <tr style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '8px 4px' }}>2011-12-07</td>
                  <td style={{ padding: '8px 4px' }}>581479</td>
                  <td style={{ padding: '8px 4px' }}>#12934</td>
                  <td style={{ padding: '8px 4px' }}>$38.90</td>
                  <td style={{ padding: '8px 4px' }}><span className="status-pill-completed">Completed</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
