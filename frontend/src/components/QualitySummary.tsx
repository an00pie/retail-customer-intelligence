import { useEffect, useState } from 'react';

export function QualitySummary() {
  const [summary, setSummary] = useState('Checking data freshness…');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/v1/operations/quality', { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(); return response.json(); })
      .then(data => setSummary(`${data.source} · ${data.records} records · refresh ${data.refreshed_at || 'unknown'} · ${data.invalid_records} invalid · ${data.prediction_coverage || 0} stored predictions · ingestion ${data.ingestion?.status || 'not recorded'} · ${data.alerts.join('; ') || 'No configured quality alerts'}. Serving refresh is not the source transaction date.`))
      .catch(error => { if (error.name !== 'AbortError') setSummary('Data freshness evidence unavailable.'); });
    return () => controller.abort();
  }, []);
  return <aside aria-label="Data freshness and coverage" style={{ padding: '12px', border: '1px solid #355347', borderRadius: '10px', fontSize: '12px', marginBottom: '16px' }}>{summary}</aside>;
}
