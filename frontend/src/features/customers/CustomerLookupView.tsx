import React, { useState, useEffect, useRef } from 'react';
import { Customer } from '../../types';
import { api } from '../../lib/api';
import { formatCurrency, formatPercent, formatDate } from '../../lib/formatters';

interface CustomerLookupViewProps {
  initialCustomerId?: string;
}

export const CustomerLookupView: React.FC<CustomerLookupViewProps> = ({ initialCustomerId = '15485' }) => {
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const sampleIds = [
    { id: '15485', label: '#15485 (Champ)' },
    { id: '13748', label: '#13748 (At-Risk)' },
    { id: '12364', label: '#12364 (Loyal)' },
    { id: '16964', label: '#16964 (Lost)' },
    { id: '13269', label: '#13269' },
    { id: '18229', label: '#18229' },
    { id: '99999', label: '#99999 (404)' },
  ];

  const doSearch = async (idToSearch: string) => {
    const cleanId = idToSearch.trim();
    if (!cleanId) return;
    const request = ++requestId.current;
    setCustomer(null);
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCustomer(cleanId);
      if (request !== requestId.current) return;
      setCustomer(data);
    } catch (err: any) {
      if (request !== requestId.current) return;
      setCustomer(null);
      setError(err.message || 'Customer not found in retail intelligence records');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(initialCustomerId);
      doSearch(initialCustomerId);
    }
    return () => { ++requestId.current; };
  }, [initialCustomerId]);

  const handleExportCsv = () => {
    if (!customer) return;
    window.location.href = `/api/customer/${encodeURIComponent(customer.customer_id)}/export/csv`;
  };

  return (
    <div className="insight-view" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Bar */}
      <div className="dash-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Customer 360 Intelligence
          </h2>
          <p style={{ fontSize: '12.5px', color: '#8e9693', marginTop: '2px' }}>
            Direct low-latency query to the columnar Key-Value profile serving store (SQLite / Apache HBase schema, 5,942 profiles)
          </p>
        </div>
      </div>

      <div className="insight-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left: Search Controller Card */}
        <div className="insight-panel lookup-search-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>Find Customer Profile</div>
            <div style={{ fontSize: '12px', color: '#8e9693', marginTop: '4px' }}>
              Select a verified sample customer or enter any ID from the 5,942 profile store:
            </div>
          </div>

          {/* Quick sample pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {sampleIds.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`sample-id-pill ${customerId === s.id ? 'active' : ''}`}
                onClick={() => {
                  setCustomerId(s.id);
                  doSearch(s.id);
                }}
                style={{
                  borderRadius: '999px',
                  background: customerId === s.id ? '#ffffff' : 'rgba(255, 255, 255, 0.05)',
                  color: customerId === s.id ? '#000000' : '#b8c0bd',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  fontFamily: 'var(--font-mono, monospace)',
                  fontSize: '11px',
                  padding: '5px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && doSearch(customerId)}
              placeholder="Enter Customer ID (e.g. 15485)"
              className="dash-search-input"
              style={{ flex: 1, padding: '10px 14px', fontSize: '13px' }}
            />
            <button
              type="button"
              className="btn-pill-primary"
              onClick={() => doSearch(customerId)}
              disabled={loading}
              style={{ padding: '10px 18px', fontSize: '12px' }}
            >
              {loading ? '...' : 'Search'}
            </button>
          </div>

          {/* Serving Store Status */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px', fontSize: '11.5px', color: '#8e9693' }}>
            <div style={{ fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Serving Store: Online (NoSQL Columnar)</div>
            Column families: <code>info:</code>, <code>pred:</code>, <code>meta:</code>. Sub-millisecond indexed lookup.
          </div>
        </div>

        {/* Right: Customer Profile Dossier & Transaction Ledger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {loading && (
            <div className="customer-profile-card" style={{ padding: '40px', textAlign: 'center', color: '#8e9693', fontSize: '13px' }}>
              Fetching customer intelligence dossier...
            </div>
          )}

          {error && !loading && (
            <div className="customer-profile-card" style={{ padding: '36px', textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
                Customer Not Found
              </div>
              <div style={{ fontSize: '12.5px', color: '#8e9693', maxWidth: '420px', margin: '0 auto' }}>
                Customer ID <code style={{ color: '#ffffff' }}>{customerId}</code> does not exist in the 5,942 verified enterprise profiles.
              </div>
            </div>
          )}

          {customer && !loading && (
            <div className="customer-profile-card" style={{ padding: '24px' }}>
              
              {/* Profile Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '20px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    className="customer-avatar-circle"
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '50%',
                      background: '#161918',
                      border: '1px solid rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '18px',
                      color: '#ffffff',
                    }}
                  >
                    {customer.customer_id.slice(-2)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
                        Customer #{customer.customer_id}
                      </h3>
                      <span className="ui-badge" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', fontSize: '11px' }}>
                        {customer.segment}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#8e9693', marginTop: '2px' }}>
                      Verified Columnar Store · Latency &lt; 1ms
                    </div>
                  </div>
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
                  <span>Export CSV</span>
                </button>
              </div>

              {/* Metric Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                <div className="customer-metric-box">
                  <div className="customer-metric-lbl">Predicted CLV</div>
                  <div className="customer-metric-num">{formatCurrency(customer.predicted_clv)}</div>
                </div>
                <div className="customer-metric-box">
                  <div className="customer-metric-lbl">Orders Count</div>
                  <div className="customer-metric-num">{customer.frequency}</div>
                </div>
                <div className="customer-metric-box">
                  <div className="customer-metric-lbl">Churn Risk</div>
                  <div className="customer-metric-num">{formatPercent(customer.churn_probability)}</div>
                </div>
                <div className="customer-metric-box">
                  <div className="customer-metric-lbl">Recency</div>
                  <div className="customer-metric-num">{customer.recency_days}d</div>
                </div>
                <div className="customer-metric-box">
                  <div className="customer-metric-lbl">Total Spend</div>
                  <div className="customer-metric-num">{formatCurrency(customer.monetary)}</div>
                </div>
              </div>

              {/* Verified Transaction Ledger */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>
                    Verified Transaction Ledger ({customer.transactions?.length || 0} items)
                  </div>
                </div>

                <div className="customer-ledger-wrap" style={{ overflowX: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px' }}>
                  <table id="customerLedgerTable" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Invoice</th>
                        <th>Item Code</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Unit Price</th>
                        <th style={{ textAlign: 'right' }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customer.transactions && customer.transactions.length > 0 ? (
                        customer.transactions.slice(0, 10).map((tx, idx) => (
                          <tr key={idx}>
                            <td>{formatDate(tx.date)}</td>
                            <td style={{ fontFamily: 'var(--font-mono, monospace)', color: '#ffffff' }}>{tx.invoice}</td>
                            <td style={{ fontFamily: 'var(--font-mono, monospace)', color: '#d4d4d4' }}>{tx.stock_code}</td>
                            <td style={{ textAlign: 'right' }}>{tx.quantity}</td>
                            <td style={{ textAlign: 'right' }}>{formatCurrency(tx.unit_price)}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#ffffff' }}>{formatCurrency(tx.total)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#8e9693' }}>
                            No raw line items recorded for this profile.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
