import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { DatasetUploadResponse, DatasetValidationReport, DatasetImportHistoryItem } from '../../types';
import { formatNumber, formatDate } from '../../lib/formatters';

export const DatasetManagerView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [uploadResult, setUploadResult] = useState<DatasetUploadResponse | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validationReport, setValidationReport] = useState<DatasetValidationReport | null>(null);
  const [history, setHistory] = useState<DatasetImportHistoryItem[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadHistory = async () => {
    try {
      const res = await api.getDatasetHistory();
      setHistory(res.imports || []);
    } catch (err: any) {
      console.error('Failed to load dataset history:', err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.csv')) {
        setErrorMsg('Only CSV files (.csv) are supported.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      setUploadResult(null);
      setValidationReport(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const res = await api.uploadDataset(selectedFile);
      setUploadResult(res);
      setColumnMapping(res.suggested_mapping || {});
    } catch (err: any) {
      setErrorMsg(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleValidate = async () => {
    if (!uploadResult) return;
    setIsValidating(true);
    setErrorMsg(null);
    try {
      const report = await api.validateDataset(uploadResult.filename, uploadResult.total_rows);
      setValidationReport(report);
    } catch (err: any) {
      setErrorMsg(err.message || 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleCommitImport = async () => {
    if (!uploadResult || !validationReport) return;
    setIsImporting(true);
    setErrorMsg(null);
    try {
      const res = await api.commitDatasetImport(
        uploadResult.filename,
        validationReport.total_rows,
        validationReport.valid_rows,
        validationReport.rejected_rows
      );
      setSuccessMsg(res.message || 'Dataset imported successfully to production warehouse!');
      setSelectedFile(null);
      setUploadResult(null);
      setValidationReport(null);
      await loadHistory();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Import commit failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* View Header */}
      <div className="dash-header-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
            Dataset Ingestion &amp; Schema Validation Engine
          </h2>
          <p style={{ fontSize: '12.5px', color: '#8e9693', marginTop: '2px' }}>
            Upload raw transaction batches, execute schema compliance auditing, and ingest into the analytical data warehouse
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge" style={{ background: '#121614', border: '1px solid #1f2421', color: '#8e9693', fontSize: '11px', padding: '4px 10px', borderRadius: '4px' }}>
            Warehouse: SQLite / Distributed Store
          </span>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '6px', color: '#f87171', fontSize: '13px' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '12px 16px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '6px', color: '#fff', fontSize: '13px' }}>
          ✓ {successMsg}
        </div>
      )}

      {/* Main Grid: Upload & Mapper on Left, History on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {/* Ingestion Pipeline Card */}
        <div className="dash-card" style={{ background: '#0a0d0c', border: '1px solid #1f2421', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              1. Upload Transaction Batch (.csv)
            </h3>
            <span style={{ fontSize: '11px', color: '#525c57', fontFamily: 'monospace' }}>STAGE: INGEST</span>
          </div>

          {/* Dropzone / File Picker */}
          <div
            style={{
              border: '1px dashed #2a312d',
              borderRadius: '8px',
              padding: '30px 20px',
              textAlign: 'center',
              background: '#070908',
              cursor: 'pointer',
              transition: 'border-color 0.2s',
            }}
            onClick={() => document.getElementById('csv-file-input')?.click()}
          >
            <input
              id="csv-file-input"
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            <div style={{ fontSize: '28px', color: '#525c57', marginBottom: '8px' }}>↑</div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: '#d1d5db' }}>
              {selectedFile ? selectedFile.name : 'Click to select CSV batch file'}
            </div>
            <div style={{ fontSize: '11px', color: '#8e9693', marginTop: '4px' }}>
              {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Expected fields: Invoice, StockCode, Quantity, InvoiceDate, Price, Customer ID'}
            </div>
          </div>

          {selectedFile && !uploadResult && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              style={{
                background: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isUploading ? 'not-allowed' : 'pointer',
                opacity: isUploading ? 0.6 : 1,
              }}
            >
              {isUploading ? 'Parsing Batch...' : 'Parse & Inspect CSV'}
            </button>
          )}

          {/* Step 2: Inspection & Column Mapping */}
          {uploadResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #1f2421', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>2. Column Mapping &amp; Headers</span>
                <span style={{ fontSize: '11px', color: '#8e9693' }}>{formatNumber(uploadResult.total_rows)} rows detected</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                {uploadResult.expected_fields.map((field) => (
                  <div key={field} style={{ background: '#0e1210', padding: '8px 10px', borderRadius: '4px', border: '1px solid #1f2421' }}>
                    <div style={{ color: '#8e9693', fontSize: '10px', textTransform: 'uppercase' }}>Target Field</div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{field}</div>
                    <div style={{ color: '#525c57', fontSize: '11px', marginTop: '4px' }}>
                      Mapped to: <span style={{ color: '#d1d5db' }}>{columnMapping[field] || 'Auto-matched'}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Data Preview Table */}
              <div style={{ overflowX: 'auto', maxHeight: '160px', border: '1px solid #1f2421', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'monospace' }}>
                  <thead style={{ background: '#121614', color: '#8e9693', position: 'sticky', top: 0 }}>
                    <tr>
                      {uploadResult.headers.map((h, i) => (
                        <th key={i} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #1f2421' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {uploadResult.preview_rows.map((row, rIdx) => (
                      <tr key={rIdx} style={{ borderBottom: '1px solid #121614' }}>
                        {row.map((val, cIdx) => (
                          <td key={cIdx} style={{ padding: '4px 8px', color: '#d1d5db' }}>{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!validationReport && (
                <button
                  onClick={handleValidate}
                  disabled={isValidating}
                  style={{
                    background: '#fff',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 16px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isValidating ? 'not-allowed' : 'pointer',
                    opacity: isValidating ? 0.6 : 1,
                  }}
                >
                  {isValidating ? 'Auditing Schema...' : 'Execute Schema Audit'}
                </button>
              )}
            </div>
          )}

          {/* Step 3: Validation Audit Report */}
          {validationReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #1f2421', paddingTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>3. Validation Audit Report</span>
                <span className="badge" style={{ background: '#121614', border: '1px solid #2a312d', color: '#fff', fontSize: '10.5px', padding: '2px 8px', borderRadius: '4px' }}>
                  {validationReport.schema_compliance}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div style={{ background: '#0e1210', padding: '10px', borderRadius: '4px', border: '1px solid #1f2421', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#8e9693' }}>VALID ROWS</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    {formatNumber(validationReport.valid_rows)}
                  </div>
                </div>
                <div style={{ background: '#0e1210', padding: '10px', borderRadius: '4px', border: '1px solid #1f2421', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#8e9693' }}>REJECTED ROWS</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#8e9693', marginTop: '2px' }}>
                    {formatNumber(validationReport.rejected_rows)}
                  </div>
                </div>
                <div style={{ background: '#0e1210', padding: '10px', borderRadius: '4px', border: '1px solid #1f2421', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#8e9693' }}>NEW PROFILES</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginTop: '2px' }}>
                    +{formatNumber(validationReport.estimated_new_customers)}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: '#8e9693', lineHeight: 1.5, background: '#070908', padding: '10px', borderRadius: '4px' }}>
                • Null Customer IDs filtered: <strong>{formatNumber(validationReport.missing_customer_ids)}</strong><br />
                • Inverted/negative quantities (cancellations): <strong>{formatNumber(validationReport.negative_quantities_filtered)}</strong><br />
                • Duplicate invoice keys deduplicated: <strong>{formatNumber(validationReport.duplicate_invoices)}</strong>
              </div>

              <button
                onClick={handleCommitImport}
                disabled={isImporting}
                style={{
                  background: '#fff',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: isImporting ? 'not-allowed' : 'pointer',
                  opacity: isImporting ? 0.6 : 1,
                }}
              >
                {isImporting ? 'Ingesting to Warehouse...' : 'Commit Batch to Analytical Warehouse'}
              </button>
            </div>
          )}

        </div>

        {/* Import History Table */}
        <div className="dash-card" style={{ background: '#0a0d0c', border: '1px solid #1f2421', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dataset Import &amp; Audit Trail
            </h3>
            <button
              onClick={loadHistory}
              style={{ background: 'transparent', border: 'none', color: '#8e9693', fontSize: '12px', cursor: 'pointer' }}
            >
              ↻ Refresh
            </button>
          </div>

          {history.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: '#525c57', fontSize: '13px' }}>
              No previous dataset import logs found in database.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {history.map((item) => (
                <div
                  key={item.id}
                  style={{
                    background: '#0e1210',
                    border: '1px solid #1f2421',
                    borderRadius: '6px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                      {item.filename}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        padding: '2px 8px',
                        borderRadius: '3px',
                        background: item.status === 'Completed' ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.1)',
                        color: item.status === 'Completed' ? '#fff' : '#f87171',
                        border: '1px solid #2a312d',
                      }}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#8e9693' }}>
                    <span>Valid rows: <strong style={{ color: '#fff' }}>{formatNumber(item.valid_rows)}</strong> / {formatNumber(item.total_rows)}</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>

                  {item.summary && (
                    <div style={{ fontSize: '10.5px', color: '#525c57', borderTop: '1px solid #161c18', paddingTop: '6px', marginTop: '2px' }}>
                      User: {item.summary.imported_by || 'system'} • Destination: {item.summary.warehouse_destination || 'Serving DB'} • Pass rate: {item.summary.valid_percentage || 100}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
