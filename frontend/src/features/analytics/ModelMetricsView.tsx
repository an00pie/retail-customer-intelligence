import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { ModelEvaluationMetrics } from '../../types';

export const ModelMetricsView: React.FC = () => {
  const [data, setData] = useState<ModelEvaluationMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    api.getModelMetrics().then(value => { if (current) setData(value); })
      .catch(err => { if (current) setError(err.message); });
    return () => { current = false; };
  }, []);
  return <section className="insight-view">
    <h2>CLV &amp; Churn Model Evaluation</h2>
    <p>Evaluation metrics reported by the connected backend.</p>
    {error ? <p role="alert">Model metrics unavailable: {error}</p> : !data ? <p role="status">Loading model metrics…</p> :
      <div className="insight-split">
        {[
          { title: 'CLV regression', values: data.metrics.clv_regression },
          { title: 'Churn classification', values: data.metrics.churn_classification },
        ].map(({ title, values }) => <article className="insight-panel" key={title}>
          <h3>{title}</h3>
          {values ? <dl>{Object.entries(values).map(([name, value]) => <div key={name}>
            <dt>{name.replace(/_/g, ' ')}</dt><dd>{typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 4 }) : 'Unavailable'}</dd>
          </div>)}</dl> : <p>Evaluation metrics unavailable.</p>}
        </article>)}
      </div>}
  </section>;
};
