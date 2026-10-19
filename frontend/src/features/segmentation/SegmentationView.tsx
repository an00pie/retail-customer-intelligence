import React, { useState, useEffect } from 'react';
import { CohortSummary, RetentionMatrixData } from '../../types';
import { api } from '../../lib/api';
import { formatCurrency } from '../../lib/formatters';

interface SegmentationViewProps {
  initialCohorts: CohortSummary | null;
}

export const SegmentationView: React.FC<SegmentationViewProps> = ({ initialCohorts }) => {
  const [cohorts, setCohorts] = useState<CohortSummary | null>(initialCohorts);
  const [retention, setRetention] = useState<RetentionMatrixData | null>(null);
  const [activeSegment, setActiveSegment] = useState<string>('Champions');

  useEffect(() => {
    if (!cohorts) {
      api.getCohorts().then(setCohorts).catch(console.error);
    }
    api.getRetentionMatrix().then(setRetention).catch(console.error);
  }, []);

  const cohortData = cohorts?.cohorts || {
    'Champions': { count: 1241, percentage: 20.9, avg_recency: 24.8, avg_frequency: 20.0, avg_monetary: 11466.0 },
    'Loyal Customers': { count: 1187, percentage: 20.0, avg_recency: 27.6, avg_frequency: 3.0, avg_monetary: 855.0 },
    'At-Risk': { count: 1475, percentage: 24.8, avg_recency: 210.7, avg_frequency: 5.4, avg_monetary: 2148.2 },
    'Lost / Churned': { count: 2038, percentage: 34.3, avg_recency: 393.0, avg_frequency: 1.4, avg_monetary: 346.0 },
  };

  const segmentDescriptions: Record<string, { title: string; strategy: string; traits: string[] }> = {
    'Champions': {
      title: 'High-Value VIP Brand Advocates',
      strategy: 'VIP exclusive rewards, ambassador tier, personalized outreach, no discount incentives needed.',
      traits: ['Highest average monetary spend ($11,466)', 'Average 20.0 orders per account', 'Low recency (< 25 days)'],
    },
    'Loyal Customers': {
      title: 'Steady & Predictable Brand Regulars',
      strategy: 'Volume bundle incentives, referral bonuses, cross-selling complementary product lines.',
      traits: ['Average spend of $855', 'Consistent purchase frequency', 'Responsive to loyalty point rewards'],
    },
    'At-Risk': {
      title: 'High-Spending Customers In Danger of Churn',
      strategy: 'Urgent retention outreach, personalized 15% win-back incentives, outbound customer support.',
      traits: ['High historical spend ($2,148)', 'Dormant for over 7 months (210.7 days)', 'Churn probability > 50%'],
    },
    'Lost / Churned': {
      title: 'Inactive & Lapsed Accounts',
      strategy: 'Automated low-cost email reactivation campaign, exit feedback survey to identify churn drivers.',
      traits: ['Dormant for over 12 months (393 days)', 'Lowest monetary value ($346)', 'High churn risk (74.4%)'],
    },
  };

  const handleExportCsv = () => {
    window.location.href = '/api/analytics/segments/export/csv';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Bar */}
      <div className="dash-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Customer Behavioral Segmentation (K-Means)
          </h2>
          <p style={{ fontSize: '12.5px', color: '#8e9693', marginTop: '2px' }}>
            Unsupervised clustering over normalized log1p RFM feature vectors across 5,942 customer accounts
          </p>
        </div>

        <button
          type="button"
          className="btn-pill-ghost"
          onClick={handleExportCsv}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export Summary CSV</span>
        </button>
      </div>

      {/* 4 Cohort Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {Object.entries(cohortData).map(([name, stats]) => {
          const isSelected = activeSegment === name;
          return (
            <div
              key={name}
              className="overview-cohort-card"
              onClick={() => setActiveSegment(name)}
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)',
                boxShadow: isSelected ? '0 0 20px rgba(255, 255, 255, 0.08)' : 'none',
                transform: isSelected ? 'translateY(-2px)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{name}</span>
                <span className="ui-badge" style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#fff', fontSize: '11px' }}>
                  {stats.percentage}%
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11.5px', color: '#8e9693', marginBottom: '14px' }}>
                <div>Accounts: <strong style={{ color: '#fff' }}>{stats.count.toLocaleString()}</strong></div>
                <div>Avg Recency: <strong style={{ color: '#fff' }}>{stats.avg_recency}d</strong></div>
                <div>Avg Orders: <strong style={{ color: '#fff' }}>{stats.avg_frequency}</strong></div>
                <div>Avg Spend: <strong style={{ color: '#fff' }}>{formatCurrency(stats.avg_monetary)}</strong></div>
              </div>

              {/* Progress Track */}
              <div className="cohort-progress-track" style={{ height: '5px', width: '100%', background: '#1c1c1c', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${stats.percentage}%`, background: '#ffffff', borderRadius: '999px' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Segment Strategy Deep-Dive */}
      {segmentDescriptions[activeSegment] && (
        <div className="dash-ov-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#8e9693', fontWeight: 600 }}>
                Targeting Blueprint
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                {activeSegment} · {segmentDescriptions[activeSegment].title}
              </h3>
            </div>
            <span className="ui-badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#fff' }}>
              Cluster {activeSegment === 'Champions' ? '2' : activeSegment === 'Loyal Customers' ? '0' : activeSegment === 'At-Risk' ? '3' : '1'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                Cohort Key Characteristics
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#b9bfbd' }}>
                {segmentDescriptions[activeSegment].traits.map((t, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#fff' }}>•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
                Recommended Retention Action
              </div>
              <p style={{ fontSize: '12px', color: '#b9bfbd', lineHeight: 1.6 }}>
                {segmentDescriptions[activeSegment].strategy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Cohort Retention Heatmap */}
      {retention && (
        <div className="dash-ov-card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Monthly Cohort Retention Matrix</div>
            <div style={{ fontSize: '12px', color: '#8e9693', marginTop: '2px' }}>
              Percentage of customers returning in subsequent months after initial purchase
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'center' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ textAlign: 'left', padding: '10px', color: '#8e9693' }}>Cohort</th>
                  <th style={{ padding: '10px', color: '#8e9693' }}>Accounts</th>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <th key={i} style={{ padding: '8px', color: '#8e9693' }}>M+{i}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {retention.matrix.map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ textAlign: 'left', padding: '8px 10px', color: '#fff', fontWeight: 600 }}>{row.cohort}</td>
                    <td style={{ padding: '8px', color: '#8e9693' }}>{row.size}</td>
                    {row.retention.map((val, colIdx) => {
                      if (val === null) {
                        return <td key={colIdx} style={{ padding: '8px', color: '#333' }}>—</td>;
                      }
                      const opacity = Math.min(1.0, Math.max(0.1, val / 100));
                      return (
                        <td
                          key={colIdx}
                          style={{
                            padding: '8px',
                            background: `rgba(255, 255, 255, ${opacity * 0.15})`,
                            color: val > 25 ? '#ffffff' : '#a3a3a3',
                            fontWeight: val > 25 ? 700 : 400,
                          }}
                        >
                          {val.toFixed(1)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
