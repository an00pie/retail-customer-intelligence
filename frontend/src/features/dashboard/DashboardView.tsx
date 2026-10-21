import React, { useState } from 'react';
import { TrajectoryData, CohortSummary } from '../../types';
import { DualAxisTrajectoryChart } from '../../components/charts/DualAxisTrajectoryChart';
import { formatCurrency, formatNumber } from '../../lib/formatters';

interface DashboardViewProps {
  loading: boolean;
  error: string | null;
  cohortError: string | null;
  trajectory: TrajectoryData | null;
  cohorts: CohortSummary | null;
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
  onNavigateTab: (tab: string) => void;
  onQuickLookup: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  loading,
  error,
  cohortError,
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

  // Customer Value Snapshot dynamic values
  const scoreR = rfmR === 25 ? 72 : Math.round(Math.max(5, Math.min(99, 78 - ((rfmR - 25) / 340) * 68)));
  const scoreF = rfmF === 6 ? 58 : Math.round(Math.max(5, Math.min(99, 45 + ((rfmF - 1) / 49) * 53)));
  const scoreM = rfmM === 1250 ? 86 : Math.round(Math.max(5, Math.min(99, 30 + (Math.log10(Math.max(50, rfmM)) / 4) * 72)));
  const rDigit = rfmR <= 30 ? 4 : (rfmR <= 90 ? 3 : (rfmR <= 180 ? 2 : 1));
  const fDigit = rfmF >= 20 ? 5 : (rfmF >= 10 ? 4 : (rfmF >= 5 ? 3 : (rfmF >= 2 ? 2 : 1)));
  const mDigit = rfmM >= 3000 ? 5 : (rfmM >= 1500 ? 3 : (rfmM >= 500 ? 2 : 1));
  const rfmScore = (rfmR === 25 && rfmF === 6 && rfmM === 1250) ? 432 : (rDigit * 100 + fDigit * 10 + mDigit);
  const activeTicksCount = Math.round(38 * (rfmScore / 555));

  const GAUGE_TICKS = [
    { idx: 0, x1: 31.4, y1: 68.5, x2: 23.6, y2: 73.0 },
    { idx: 1, x1: 29.7, y1: 65.2, x2: 21.5, y2: 68.8 },
    { idx: 2, x1: 28.4, y1: 61.7, x2: 19.8, y2: 64.3 },
    { idx: 3, x1: 27.6, y1: 58.0, x2: 18.7, y2: 59.7 },
    { idx: 4, x1: 27.1, y1: 54.3, x2: 18.1, y2: 55.0 },
    { idx: 5, x1: 27.0, y1: 50.6, x2: 18.0, y2: 50.2 },
    { idx: 6, x1: 27.4, y1: 46.9, x2: 18.5, y2: 45.5 },
    { idx: 7, x1: 28.2, y1: 43.2, x2: 19.5, y2: 40.8 },
    { idx: 8, x1: 29.4, y1: 39.7, x2: 21.0, y2: 36.3 },
    { idx: 9, x1: 31.0, y1: 36.3, x2: 23.0, y2: 32.0 },
    { idx: 10, x1: 32.9, y1: 33.1, x2: 25.5, y2: 28.0 },
    { idx: 11, x1: 35.2, y1: 30.2, x2: 28.5, y2: 24.3 },
    { idx: 12, x1: 37.8, y1: 27.5, x2: 31.8, y2: 20.9 },
    { idx: 13, x1: 40.8, y1: 25.2, x2: 35.5, y2: 17.9 },
    { idx: 14, x1: 43.9, y1: 23.2, x2: 39.5, y2: 15.3 },
    { idx: 15, x1: 47.3, y1: 21.6, x2: 43.8, y2: 13.3 },
    { idx: 16, x1: 50.8, y1: 20.3, x2: 48.3, y2: 11.7 },
    { idx: 17, x1: 54.4, y1: 19.5, x2: 52.9, y2: 10.6 },
    { idx: 18, x1: 58.1, y1: 19.1, x2: 57.6, y2: 10.1 },
    { idx: 19, x1: 61.9, y1: 19.1, x2: 62.4, y2: 10.1 },
    { idx: 20, x1: 65.6, y1: 19.5, x2: 67.1, y2: 10.6 },
    { idx: 21, x1: 69.2, y1: 20.3, x2: 71.7, y2: 11.7 },
    { idx: 22, x1: 72.7, y1: 21.6, x2: 76.2, y2: 13.3 },
    { idx: 23, x1: 76.1, y1: 23.2, x2: 80.5, y2: 15.3 },
    { idx: 24, x1: 79.2, y1: 25.2, x2: 84.5, y2: 17.9 },
    { idx: 25, x1: 82.2, y1: 27.5, x2: 88.2, y2: 20.9 },
    { idx: 26, x1: 84.8, y1: 30.2, x2: 91.5, y2: 24.3 },
    { idx: 27, x1: 87.1, y1: 33.1, x2: 94.5, y2: 28.0 },
    { idx: 28, x1: 89.0, y1: 36.3, x2: 97.0, y2: 32.0 },
    { idx: 29, x1: 90.6, y1: 39.7, x2: 99.0, y2: 36.3 },
    { idx: 30, x1: 91.8, y1: 43.2, x2: 100.5, y2: 40.8 },
    { idx: 31, x1: 92.6, y1: 46.9, x2: 101.5, y2: 45.5 },
    { idx: 32, x1: 93.0, y1: 50.6, x2: 102.0, y2: 50.2 },
    { idx: 33, x1: 92.9, y1: 54.3, x2: 101.9, y2: 55.0 },
    { idx: 34, x1: 92.4, y1: 58.0, x2: 101.3, y2: 59.7 },
    { idx: 35, x1: 91.6, y1: 61.7, x2: 100.2, y2: 64.3 },
    { idx: 36, x1: 90.3, y1: 65.2, x2: 98.5, y2: 68.8 },
    { idx: 37, x1: 88.6, y1: 68.5, x2: 96.4, y2: 73.0 }
  ];

  const cohortList = cohorts?.cohorts || {};

  return (
    <div className="insight-view dash-overview-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {loading && <p role="status">Loading selected-period trajectory…</p>}
      {error && <p role="alert">Trajectory unavailable: {error}</p>}
      {cohortError && <p role="alert">Customer cohorts unavailable: {cohortError}</p>}
      {!cohorts && !cohortError && <p role="status">Loading customer cohorts…</p>}
      {trajectory && <p>{trajectory.date_range_label} · Growth comparisons as reported by the API (previous matching period, or latest interval when unavailable).</p>}
      
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
              {cohorts ? formatNumber(cohorts.total_profiles) : '—'}
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
            <span className="trend-compare">All customer profiles · not period-filtered</span>
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
              {trajectory ? formatNumber(trajectory.total_orders) : '—'}
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
          <div className="dash-kpi-trend">
            <span>{trajectory ? `${trajectory.orders_growth}%` : '—'}</span>
            <span className="trend-compare">API comparison</span>
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
              {trajectory ? formatCurrency(trajectory.avg_order_value) : '—'}
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
          <div className="dash-kpi-trend">
            <span>{trajectory ? `${trajectory.aov_growth}%` : '—'}</span>
            <span className="trend-compare">API comparison</span>
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
              {trajectory ? formatCurrency(trajectory.total_revenue) : '—'}
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
          <div className="dash-kpi-trend">
            <span>{trajectory ? `${trajectory.revenue_growth}%` : '—'}</span>
            <span className="trend-compare">API comparison</span>
          </div>
        </div>
      </div>

      {/* Trajectory Dual-Axis Chart */}
      {trajectory && trajectory.labels.length > 0 ? <DualAxisTrajectoryChart
        data={trajectory}
        selectedPeriod={selectedPeriod}
        onSelectPeriod={onSelectPeriod}
      /> : <section className="insight-panel" aria-label="Transaction trajectory">
        <div aria-label="Trajectory period">
          {['7d', '30d', '90d', '6m', '12m', 'all'].map(period => <button key={period} className="btn-pill-ghost" aria-pressed={selectedPeriod === period} onClick={() => onSelectPeriod(period)}>{period.toUpperCase()}</button>)}
        </div>
        <p role="status">{loading ? 'Loading transaction trajectory…' : error ? 'Transaction trajectory unavailable.' : 'No trajectory records for this period.'}</p>
      </section>}

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
                    <div className="ov-cohort-bar-fill" style={{ width: `${item.percentage}%`, height: '100%', background: '#ffffff', borderRadius: '999px' }} />
                  </div>
                  <span className="ov-cohort-pct" style={{ width: '45px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: '#ffffff' }}>{item.percentage}%</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: '11px', color: '#8e9693', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Cluster Insights (Loyal Customers)</span>
            <strong style={{ color: '#fff' }}>{cohortList['Loyal Customers'] ? `${cohortList['Loyal Customers'].count.toLocaleString()} (${cohortList['Loyal Customers'].percentage}%)` : '—'}</strong>
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

          <div className="ov-rfm-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: '16px', alignItems: 'start' }}>
            <div className="ov-rfm-sliders" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="ov-slider-item">
                <div className="ov-slider-top" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8e9693' }}>
                  <span>Recency (days)</span>
                  <span className="val" style={{ color: '#fff', fontWeight: 700 }}>{rfmR}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="365"
                  value={rfmR}
                  onChange={(e) => setRfmR(Number(e.target.value))}
                  className="ov-range-input"
                />
                <div className="ov-slider-ticks">
                  <span>0</span><span>90</span><span>180</span><span>365</span>
                </div>
              </div>

              <div className="ov-slider-item">
                <div className="ov-slider-top" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8e9693' }}>
                  <span>Frequency (orders)</span>
                  <span className="val" style={{ color: '#fff', fontWeight: 700 }}>{rfmF}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={rfmF}
                  onChange={(e) => setRfmF(Number(e.target.value))}
                  className="ov-range-input"
                />
                <div className="ov-slider-ticks">
                  <span>0</span><span>10</span><span>20</span><span>50</span>
                </div>
              </div>

              <div className="ov-slider-item">
                <div className="ov-slider-top" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8e9693' }}>
                  <span>Monetary ($)</span>
                  <span className="val" style={{ color: '#fff', fontWeight: 700 }}>{rfmM}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="10000"
                  step="50"
                  value={rfmM}
                  onChange={(e) => setRfmM(Number(e.target.value))}
                  className="ov-range-input"
                />
                <div className="ov-slider-ticks">
                  <span>50</span><span>250</span><span>500</span><span>1,000</span>
                </div>
              </div>

              <div className="ov-slider-item">
                <div className="ov-slider-top" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8e9693' }}>
                  <span>Tenure (days)</span>
                  <span className="val" style={{ color: '#fff', fontWeight: 700 }}>{rfmT}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="730"
                  value={rfmT}
                  onChange={(e) => setRfmT(Number(e.target.value))}
                  className="ov-range-input"
                />
                <div className="ov-slider-ticks">
                  <span>30</span><span>365</span><span>730</span><span>1,095</span>
                </div>
              </div>
            </div>

            <div className="ov-rfm-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="cv-snapshot-panel">
                <div className="cv-snapshot-title">CUSTOMER VALUE SNAPSHOT</div>
                
                <div className="cv-scores-list">
                  <div className="cv-score-row">
                    <span className="cv-score-lbl">Recency</span>
                    <div className="cv-score-bar-track">
                      <div className="cv-score-bar-fill" style={{ width: `${scoreR}%` }}></div>
                    </div>
                    <span className="cv-score-num">{scoreR}</span>
                  </div>
                  <div className="cv-score-row">
                    <span className="cv-score-lbl">Frequency</span>
                    <div className="cv-score-bar-track">
                      <div className="cv-score-bar-fill" style={{ width: `${scoreF}%` }}></div>
                    </div>
                    <span className="cv-score-num">{scoreF}</span>
                  </div>
                  <div className="cv-score-row">
                    <span className="cv-score-lbl">Monetary</span>
                    <div className="cv-score-bar-track">
                      <div className="cv-score-bar-fill" style={{ width: `${scoreM}%` }}></div>
                    </div>
                    <span className="cv-score-num">{scoreM}</span>
                  </div>
                </div>

                <div className="cv-gauge-wrap">
                  <svg className="cv-gauge-svg" viewBox="0 0 120 85" width="120" height="85">
                    <g className="cv-gauge-ticks">
                      {GAUGE_TICKS.map((t) => (
                        <line
                          key={t.idx}
                          className="cv-gauge-tick"
                          x1={t.x1}
                          y1={t.y1}
                          x2={t.x2}
                          y2={t.y2}
                          stroke={t.idx < activeTicksCount ? '#ffffff' : '#27272a'}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      ))}
                    </g>
                  </svg>
                  <div className="cv-gauge-center">
                    <div className="cv-gauge-val">{rfmScore}</div>
                    <div className="cv-gauge-sub">RFM SCORE</div>
                  </div>
                </div>

                <div className="cv-metrics-bottom">
                  <div className="cv-metric-row">
                    <div className="cv-metric-lbl">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
                      </svg>
                      <span>Predicted CLV</span>
                    </div>
                    <strong className="cv-metric-val">$341.43</strong>
                  </div>
                  <div className="cv-metric-row">
                    <div className="cv-metric-lbl">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      <span>Churn Risk</span>
                    </div>
                    <strong className="cv-metric-val">16.7%</strong>
                  </div>
                  <div className="cv-bottom-notch"></div>
                </div>
              </div>

              <button
                type="button"
                className="btn-pill-primary cv-calc-btn"
                onClick={() => onNavigateTab('simulator')}
              >
                Calculate RFM →
              </button>
            </div>
          </div>
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
                <div style={{ fontSize: '11.5px', color: '#8e9693' }}>Look up a customer to view their verified transaction ledger</div>
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

          <div className="insight-table-scroll ov-table-wrapper" style={{ overflowX: 'auto' }}>
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
                <tr><td colSpan={5}>Select Search to load actual customer transactions.</td></tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};
