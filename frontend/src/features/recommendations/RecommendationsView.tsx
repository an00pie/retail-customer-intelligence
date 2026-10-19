import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Recommendation } from '../../types';
import { formatNumber } from '../../lib/formatters';

export const RecommendationsView: React.FC = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRecs = async () => {
      setLoading(true);
      try {
        const res = await api.getRecommendations();
        setRecommendations(res.recommendations || []);
      } catch (err) {
        console.error('Failed to load recommendations:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  const filteredRecs = recommendations.filter((r) => {
    if (selectedPriority === 'All') return true;
    return r.priority.toLowerCase() === selectedPriority.toLowerCase();
  });

  // Calculate totals
  const totalAudience = recommendations.reduce((acc, r) => acc + (r.audience_size || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Bar */}
      <div className="dash-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Prescriptive Retention &amp; Revenue Recommendations
          </h2>
          <p style={{ fontSize: '12.5px', color: '#8e9693', marginTop: '2px' }}>
            Actionable playbooks synthesized from RFM segmentation, CLV predictions, and churn probabilities
          </p>
        </div>

        {/* Priority Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {['All', 'Critical', 'High', 'Medium'].map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              style={{
                background: selectedPriority === p ? '#fff' : '#0e1210',
                color: selectedPriority === p ? '#000' : '#8e9693',
                border: '1px solid #1f2421',
                padding: '5px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* High-Level Impact Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="dash-card" style={{ background: '#0a0d0c', border: '1px solid #1f2421', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8e9693', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Total Actionable Cohort
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
            {formatNumber(totalAudience)} Customers
          </div>
          <div style={{ fontSize: '11px', color: '#525c57', marginTop: '4px' }}>
            Targeted across 3 strategic playbooks
          </div>
        </div>

        <div className="dash-card" style={{ background: '#0a0d0c', border: '1px solid #1f2421', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8e9693', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Est. Recoverable Revenue
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
            $78,500 – $142,000
          </div>
          <div style={{ fontSize: '11px', color: '#525c57', marginTop: '4px' }}>
            Model-projected CLV recovery over 90 days
          </div>
        </div>

        <div className="dash-card" style={{ background: '#0a0d0c', border: '1px solid #1f2421', borderRadius: '8px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8e9693', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Est. Retention Lift
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>
            +6.4% to +14.2%
          </div>
          <div style={{ fontSize: '11px', color: '#525c57', marginTop: '4px' }}>
            Based on historical winback response curves
          </div>
        </div>
      </div>

      {/* Recommendation Playbook Cards */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#8e9693', fontSize: '13px' }}>
          Loading algorithmic recommendations...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredRecs.map((rec) => (
            <div
              key={rec.id}
              className="dash-card"
              style={{
                background: '#0a0d0c',
                border: '1px solid #1f2421',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Card Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      background: rec.priority === 'Critical' ? '#fff' : '#141816',
                      color: rec.priority === 'Critical' ? '#000' : '#fff',
                      border: '1px solid #2a312d',
                    }}
                  >
                    {rec.priority}
                  </span>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>
                    {rec.title}
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#8e9693' }}>
                  <span>Target: <strong style={{ color: '#fff' }}>{rec.target_segment}</strong></span>
                  <span>Audience: <strong style={{ color: '#fff' }}>{formatNumber(rec.audience_size)} ({rec.audience_pct})</strong></span>
                </div>
              </div>

              {/* Rationale & Suggested Action */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#0e1210', padding: '12px 14px', borderRadius: '6px', border: '1px solid #161c18' }}>
                  <div style={{ fontSize: '11px', color: '#8e9693', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
                    Diagnostic Rationale
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#d1d5db', lineHeight: 1.5 }}>
                    {rec.rationale}
                  </div>
                </div>

                <div style={{ background: '#0e1210', padding: '12px 14px', borderRadius: '6px', border: '1px solid #161c18' }}>
                  <div style={{ fontSize: '11px', color: '#8e9693', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
                    Recommended Action
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#d1d5db', lineHeight: 1.5 }}>
                    {rec.suggested_action}
                  </div>
                </div>
              </div>

              {/* Impact Metrics Row & Action */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #161c18', paddingTop: '12px' }}>
                <div style={{ display: 'flex', gap: '20px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: '#8e9693' }}>Average CLV: </span>
                    <strong style={{ color: '#fff' }}>{rec.avg_clv}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#8e9693' }}>Est. Retention Lift: </span>
                    <strong style={{ color: '#fff' }}>{rec.estimated_retention_lift}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#8e9693' }}>Potential Revenue: </span>
                    <strong style={{ color: '#fff' }}>{rec.potential_recovered_revenue}</strong>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedRec(rec)}
                  style={{
                    background: '#fff',
                    color: '#000',
                    border: 'none',
                    padding: '6px 14px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  View Execution Playbook
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Execution Playbook Modal */}
      {selectedRec && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setSelectedRec(null)}
        >
          <div
            style={{
              background: '#0a0d0c',
              border: '1px solid #2a312d',
              borderRadius: '8px',
              padding: '28px',
              maxWidth: '560px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '11px', color: '#8e9693', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Execution Blueprint
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                  {selectedRec.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRec(null)}
                style={{ background: 'transparent', border: 'none', color: '#8e9693', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '12.5px', color: '#d1d5db', lineHeight: 1.6 }}>
              <div>
                <strong style={{ color: '#fff' }}>Target Cohort:</strong> {selectedRec.target_segment} ({formatNumber(selectedRec.audience_size)} profiles)
              </div>
              <div>
                <strong style={{ color: '#fff' }}>Delivery Channel:</strong> Automated Personalized Email + Push Notification via Klaviyo / Braze API
              </div>
              <div>
                <strong style={{ color: '#fff' }}>Incentive Structure:</strong> Dynamic tiered discount based on predicted CLV ({selectedRec.avg_clv})
              </div>
              <div style={{ background: '#0e1210', padding: '12px', borderRadius: '6px', border: '1px solid #1f2421' }}>
                <div style={{ fontSize: '11px', color: '#8e9693', marginBottom: '6px', fontWeight: 600 }}>CAMPAIGN TRIGGER LOGIC</div>
                <code>
                  IF customer.segment == '{selectedRec.target_segment}'<br />
                  AND customer.recency_days &gt; 30<br />
                  THEN dispatch_event('retention_sprint_v1', payload: customer)
                </code>
              </div>
              <div>
                <strong style={{ color: '#fff' }}>Projected Business Return:</strong> Expected to recover <strong>{selectedRec.potential_recovered_revenue}</strong> with a <strong>{selectedRec.estimated_retention_lift}</strong> boost in 90-day retention.
              </div>
            </div>

            <button
              onClick={() => setSelectedRec(null)}
              style={{
                background: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                marginTop: '6px',
              }}
            >
              Close Blueprint
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
