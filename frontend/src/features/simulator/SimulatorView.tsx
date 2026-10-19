import React, { useState, useEffect } from 'react';
import { PredictionResult, SavedScenario } from '../../types';
import { api } from '../../lib/api';
import { formatCurrency, formatPercent } from '../../lib/formatters';

export const SimulatorView: React.FC = () => {
  const [recency, setRecency] = useState(25);
  const [frequency, setFrequency] = useState(6);
  const [spend, setSpend] = useState(1250);
  const [tenure, setTenure] = useState(300);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);

  // Save scenario modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioNotes, setScenarioNotes] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const runPrediction = async () => {
    setLoading(true);
    try {
      const res = await api.predictCustomer(recency, frequency, spend, tenure);
      setPrediction(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedScenarios = async () => {
    try {
      const res = await api.getScenarios();
      setScenarios(res.scenarios || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    runPrediction();
    loadSavedScenarios();
  }, [recency, frequency, spend, tenure]);

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prediction) return;
    try {
      await api.saveScenario({
        name: scenarioName || `Scenario R${recency}-F${frequency}-M${spend}`,
        recency_days: recency,
        frequency,
        total_spend: spend,
        tenure_days: tenure,
        predicted_segment: prediction.segment,
        predicted_clv: prediction.predicted_clv,
        predicted_churn: prediction.churn_probability,
        notes: scenarioNotes,
      });
      setShowSaveModal(false);
      setScenarioName('');
      setScenarioNotes('');
      setSaveSuccessMsg('Scenario saved to database successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      loadSavedScenarios();
    } catch (err: any) {
      alert(err.message || 'Failed to save scenario');
    }
  };

  const handleDeleteScenario = async (id: number) => {
    try {
      await api.deleteScenario(id);
      loadSavedScenarios();
    } catch (err) {
      console.error(err);
    }
  };

  const loadScenarioToSliders = (scen: SavedScenario) => {
    setRecency(scen.recency_days);
    setFrequency(scen.frequency);
    setSpend(scen.total_spend);
    setTenure(scen.tenure_days);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div className="dash-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            What-If Scenario Simulator &amp; Decision Support
          </h2>
          <p style={{ fontSize: '12.5px', color: '#8e9693', marginTop: '2px' }}>
            Simulate customer behavior adjustments and project changes in segment classification, CLV, and churn risk
          </p>
        </div>

        <button
          type="button"
          className="btn-pill-primary"
          onClick={() => setShowSaveModal(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 16px' }}
        >
          <span>Save Current Scenario</span>
        </button>
      </div>

      {saveSuccessMsg && (
        <div style={{ background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '10px 16px', borderRadius: '10px', color: '#fff', fontSize: '12px' }}>
          ✓ {saveSuccessMsg}
        </div>
      )}

      {/* Main Simulator Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 380px)', gap: '24px', alignItems: 'start' }}>
        
        {/* Controls Pane */}
        <div className="rfm-interactive-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
            Adjust Customer Parameters
          </div>

          {/* Slider 1: Recency */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>Recency (Days since last order)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#d4d4d4' }}>{recency} days</span>
            </div>
            <input
              type="range"
              min="1"
              max="365"
              value={recency}
              onChange={(e) => setRecency(Number(e.target.value))}
              className="rfm-slider"
            />
          </div>

          {/* Slider 2: Frequency */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>Frequency (Total completed orders)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#d4d4d4' }}>{frequency} orders</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
              className="rfm-slider"
            />
          </div>

          {/* Slider 3: Monetary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>Total Spend (USD)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#d4d4d4' }}>${spend.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="50"
              max="10000"
              step="50"
              value={spend}
              onChange={(e) => setSpend(Number(e.target.value))}
              className="rfm-slider"
            />
          </div>

          {/* Slider 4: Tenure */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
              <span style={{ color: '#fff', fontWeight: 600 }}>Account Tenure (Days registered)</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: '#d4d4d4' }}>{tenure} days</span>
            </div>
            <input
              type="range"
              min="10"
              max="730"
              value={tenure}
              onChange={(e) => setTenure(Number(e.target.value))}
              className="rfm-slider"
            />
          </div>

          <div style={{ fontSize: '11.5px', color: '#8e9693', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            Average Order Value: <strong style={{ color: '#fff' }}>${(spend / frequency).toFixed(2)} USD</strong>
          </div>
        </div>

        {/* Real-Time Inference Output Card */}
        <div className="overview-card" style={{ padding: '24px', background: 'linear-gradient(145deg, #161918 0%, #0e1110 100%)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '1px', color: '#ffffff', textTransform: 'uppercase' }}>
            Real-Time Inference Output
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', margin: '6px 0 16px 0' }}>
            {prediction?.segment || 'Calculating...'}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: '#8e9693', fontWeight: 600 }}>Predicted 90-Day CLV</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(prediction?.predicted_clv)}
            </div>
            <div style={{ fontSize: '11px', color: '#8e9693', marginTop: '2px' }}>
              Gradient Boosting Regressor (R² 0.524)
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8e9693', fontWeight: 600 }}>Estimated Churn Probability</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {formatPercent(prediction?.churn_probability)}
            </div>
            <div style={{ fontSize: '11px', color: '#8e9693', marginTop: '2px' }}>
              Random Forest Classifier (ROC-AUC 0.806)
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: '#8e9693', lineHeight: 1.5 }}>
            Inference latency: &lt; 2ms. Parameters are evaluated in-memory against trained Scikit-Learn models.
          </div>
        </div>

      </div>

      {/* Saved Scenarios Table */}
      <div className="dash-ov-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Saved Scenarios History</div>
            <div style={{ fontSize: '12px', color: '#8e9693', marginTop: '2px' }}>
              Persisted in database for campaign impact comparisons
            </div>
          </div>
          <span className="ui-badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
            {scenarios.length} Scenarios
          </span>
        </div>

        {scenarios.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#8e9693', fontSize: '13px' }}>
            No scenarios saved yet. Adjust the sliders above and click "Save Current Scenario".
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <th style={{ padding: '10px', color: '#8e9693' }}>Name</th>
                  <th style={{ padding: '10px', color: '#8e9693' }}>Segment</th>
                  <th style={{ padding: '10px', color: '#8e9693' }}>Spend</th>
                  <th style={{ padding: '10px', color: '#8e9693' }}>CLV</th>
                  <th style={{ padding: '10px', color: '#8e9693' }}>Churn</th>
                  <th style={{ padding: '10px', color: '#8e9693', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                    <td style={{ padding: '10px', color: '#fff', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="ui-badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff' }}>
                        {s.predicted_segment}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>${s.total_spend.toLocaleString()}</td>
                    <td style={{ padding: '10px', fontWeight: 700, color: '#fff' }}>${s.predicted_clv.toFixed(2)}</td>
                    <td style={{ padding: '10px' }}>{(s.predicted_churn * 100).toFixed(1)}%</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => loadScenarioToSliders(s)}
                        className="btn-pill-ghost"
                        style={{ fontSize: '11px', padding: '4px 10px', marginRight: '6px' }}
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteScenario(s.id)}
                        className="btn-pill-ghost"
                        style={{ fontSize: '11px', padding: '4px 8px', color: '#fb7185' }}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Scenario Modal Dialog */}
      {showSaveModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="spa-modal-dialog"
            style={{ width: 'min(440px, 100%)', background: '#111413', borderRadius: '20px', padding: '24px', border: '1px solid rgba(255,255,255,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#fff', marginBottom: '14px' }}>
              Save What-If Scenario
            </h3>
            <form onSubmit={handleSaveScenario} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#8e9693', display: 'block', marginBottom: '4px' }}>Scenario Name</label>
                <input
                  type="text"
                  required
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="e.g. Q4 Loyalty Surge Campaign"
                  className="dash-search-input"
                  style={{ width: '100%', padding: '9px 12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#8e9693', display: 'block', marginBottom: '4px' }}>Notes / Assumptions (Optional)</label>
                <textarea
                  value={scenarioNotes}
                  onChange={(e) => setScenarioNotes(e.target.value)}
                  placeholder="e.g. Assuming 15% discount drives 2 extra orders per year"
                  className="dash-search-input"
                  rows={3}
                  style={{ width: '100%', padding: '9px 12px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-pill-ghost"
                  onClick={() => setShowSaveModal(false)}
                  style={{ padding: '8px 16px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-pill-primary"
                  style={{ padding: '8px 18px' }}
                >
                  Save to Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
