import React, { useState, useEffect, useRef } from 'react';
import { PredictionResult, SavedScenario, GeminiExplanation } from '../../types';
import { api } from '../../lib/api';
import { formatCurrency, formatPercent } from '../../lib/formatters';

export const SimulatorView: React.FC = () => {
  const [recency, setRecency] = useState(25);
  const [frequency, setFrequency] = useState(6);
  const [spend, setSpend] = useState(1250);
  const [tenure, setTenure] = useState(300);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState<{ key: string; result?: GeminiExplanation; error?: string } | null>(null);
  const [scenarios, setScenarios] = useState<SavedScenario[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scenarioError, setScenarioError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [resultKey, setResultKey] = useState('');
  const inputKey = JSON.stringify([recency, frequency, spend, tenure]);
  const currentPrediction = resultKey === inputKey ? prediction : null;
  const saving = useRef(false);
  const listRequest = useRef(0);

  // Save scenario modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioNotes, setScenarioNotes] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const loadSavedScenarios = async () => {
    const request = ++listRequest.current;
    setScenariosLoading(true);
    setScenarioError(null);
    try {
      const res = await api.getScenarios();
      if (request === listRequest.current) setScenarios(res.scenarios);
    } catch (err: any) {
      if (request === listRequest.current) setScenarioError(err.message);
    } finally {
      if (request === listRequest.current) setScenariosLoading(false);
    }
  };

  useEffect(() => {
    loadSavedScenarios();
    return () => { ++listRequest.current; };
  }, []);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError(null);
    setPrediction(null);
    const timer = window.setTimeout(() => {
      api.predictCustomer(recency, frequency, spend, tenure).then(res => {
        if (current) { setPrediction(res); setResultKey(inputKey); }
      }).catch(err => { if (current) setError(err.message); })
        .finally(() => { if (current) setLoading(false); });
    }, 250);
    return () => { current = false; window.clearTimeout(timer); };
  }, [recency, frequency, spend, tenure]);

  const handleSaveScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPrediction || loading || saving.current) return;
    saving.current = true;
    setActionError(null);
    setSaveSuccessMsg(null);
    try {
      await api.saveScenario({
        name: scenarioName || `Scenario R${recency}-F${frequency}-M${spend}`,
        recency_days: recency,
        frequency,
        total_spend: spend,
        tenure_days: tenure,
        predicted_segment: currentPrediction.segment,
        predicted_clv: currentPrediction.predicted_clv,
        predicted_churn: currentPrediction.churn_probability,
        notes: scenarioNotes,
      });
      setShowSaveModal(false);
      setScenarioName('');
      setScenarioNotes('');
      setSaveSuccessMsg('Scenario saved to database successfully!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
      loadSavedScenarios();
    } catch (err: any) {
      setActionError(err.message || 'Failed to save scenario');
      setShowSaveModal(false);
    } finally {
      saving.current = false;
    }
  };

  const handleDeleteScenario = async (id: number) => {
    setActionError(null);
    setSaveSuccessMsg(null);
    try {
      await api.deleteScenario(id);
      loadSavedScenarios();
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const loadScenarioToSliders = (scen: SavedScenario) => {
    setRecency(scen.recency_days);
    setFrequency(scen.frequency);
    setSpend(scen.total_spend);
    setTenure(scen.tenure_days);
  };

  return (
    <div className="insight-view" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && <p role="alert">Prediction unavailable: {error}</p>}
      <section className="insight-panel" aria-label="Gemini prediction explanation" style={{ padding: '16px' }}>
        <button type="button" className="btn-pill-primary" disabled={!currentPrediction || loading || explaining} onClick={async () => {
          const key = inputKey;
          setExplaining(true);
          setExplanation(null);
          try {
            const result = await api.explainPrediction({ recency_days: recency, frequency, total_spend: spend, tenure_days: tenure });
            setExplanation({ key, result });
          } catch (error: any) {
            setExplanation({ key, error: error.message || 'Explanation unavailable' });
          } finally { setExplaining(false); }
        }}>{explaining ? 'Requesting explanation…' : 'Explain with Gemini'}</button>
        <p style={{ fontSize: '12px' }}>Sign in to explain numeric feature inputs and computed results. Customer identity and notes are excluded.</p>
        <div aria-live="polite">
          {explanation?.key === inputKey && explanation.error && <p>{explanation.error}</p>}
          {explanation?.key === inputKey && explanation.result && <>
            <p>{explanation.result.summary}</p><p style={{ fontSize: '12px' }}>{explanation.result.notice}</p>
            <details><summary>Gemini model &amp; evidence references</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: '11px' }}>{JSON.stringify(explanation.result, null, 2)}</pre></details>
          </>}
        </div>
      </section>
      {currentPrediction && (
        <details className="insight-panel" style={{ padding: '16px', overflowWrap: 'anywhere' }}>
          <summary>Model provenance, inputs &amp; driver evidence</summary>
          <p>Inference: {currentPrediction.inference_status || 'not reported'}. Training data timestamp: {currentPrediction.trained_data_timestamp || 'not recorded'}.</p>
          <p>{currentPrediction.trained_data_timestamp_status}</p>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '11px' }}>{JSON.stringify({ model_versions: currentPrediction.model_versions, feature_inputs: currentPrediction.feature_inputs, drivers: currentPrediction.drivers }, null, 2)}</pre>
        </details>
      )}
      {scenarioError && <p role="alert">Scenario service: {scenarioError}</p>}
      {actionError && <p role="alert">Scenario action failed: {actionError}</p>}
      
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
          disabled={!currentPrediction || loading}
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
      <div className="insight-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 380px)', gap: '24px', alignItems: 'start' }}>
        
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
            {currentPrediction?.segment || (error ? 'Unavailable' : 'Calculating...')}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '12px', color: '#8e9693', fontWeight: 600 }}>Predicted 90-Day CLV</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {currentPrediction ? formatCurrency(currentPrediction.predicted_clv) : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#8e9693', marginTop: '2px' }}>
              API-reported CLV prediction
            </div>
          </div>

          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8e9693', fontWeight: 600 }}>Estimated Churn Probability</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
              {currentPrediction ? formatPercent(currentPrediction.churn_probability) : '—'}
            </div>
            <div style={{ fontSize: '11px', color: '#8e9693', marginTop: '2px' }}>
              API-reported churn probability
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: '#8e9693', lineHeight: 1.5 }}>
            Parameters are evaluated by the connected inference service. Model evaluation is available in CLV &amp; Churn ML.
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
            {scenariosLoading || scenarioError ? '—' : scenarios.length} Scenarios
          </span>
        </div>

        {scenariosLoading ? <p role="status">Loading saved scenarios…</p> : scenarioError ? <p>Saved scenarios unavailable. <button onClick={loadSavedScenarios}>Retry</button></p> : scenarios.length === 0 ? (
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
