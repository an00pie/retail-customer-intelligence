import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrajectoryData } from '../../types';
import { formatCurrency, formatNumber } from '../../lib/formatters';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DualAxisTrajectoryChartProps {
  data: TrajectoryData | null;
  selectedPeriod: string;
  onSelectPeriod: (period: string) => void;
  loading?: boolean;
}

export const DualAxisTrajectoryChart: React.FC<DualAxisTrajectoryChartProps> = ({
  data,
  selectedPeriod,
  onSelectPeriod,
  loading = false,
}) => {
  const chartRef = useRef<ChartJS<'line'> | null>(null);

  const periods = [
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '90d', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '12m', label: '1Y' },
    { key: 'all', label: 'All' },
  ];

  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div className="dash-chart-card-luxury" style={{ minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Loading transaction trajectory...</div>
      </div>
    );
  }

  const chartData: ChartData<'line'> = {
    labels: data.labels,
    datasets: [
      {
        label: 'Revenue (USD)',
        data: data.revenue,
        yAxisID: 'yRevenue',
        borderColor: '#ffffff',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 280);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
          gradient.addColorStop(0.65, 'rgba(255, 255, 255, 0.04)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
          return gradient;
        },
        borderWidth: 2.8,
        tension: 0.38,
        fill: true,
        pointRadius: data.labels.length > 40 ? 0 : 3.5,
        pointHoverRadius: 6.5,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#0a0a0a',
        pointBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2.5,
      },
      {
        label: 'Order Volume',
        data: data.orders,
        yAxisID: 'yOrders',
        borderColor: '#888888',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 280);
          gradient.addColorStop(0, 'rgba(160, 160, 160, 0.16)');
          gradient.addColorStop(0.65, 'rgba(160, 160, 160, 0.02)');
          gradient.addColorStop(1, 'rgba(160, 160, 160, 0.0)');
          return gradient;
        },
        borderWidth: 2,
        borderDash: [5, 4],
        tension: 0.38,
        fill: true,
        pointRadius: data.labels.length > 40 ? 0 : 3,
        pointHoverRadius: 5.5,
        pointBackgroundColor: '#888888',
        pointBorderColor: '#0a0a0a',
        pointBorderWidth: 2,
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    animation: {
      duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(14, 14, 14, 0.96)',
        titleColor: '#ffffff',
        bodyColor: '#d4d4d4',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        cornerRadius: 10,
        titleFont: { size: 12, weight: 'bold', family: 'Inter, sans-serif' },
        bodyFont: { size: 11, weight: 'normal', family: 'Inter, sans-serif' },
        callbacks: {
          label: (context) => {
            if (context.datasetIndex === 0) {
              return ` Revenue:  ${formatCurrency(context.parsed.y)}`;
            } else {
              return ` Orders:   ${formatNumber(context.parsed.y)} txns`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: '#b5b5bd',
          font: { size: 11, weight: 'bold' },
          maxTicksLimit: data.labels.length > 40 ? 10 : 12,
          maxRotation: 0,
        },
      },
      yRevenue: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Revenue (USD)', color: '#b5b5bd', font: { size: 11 } },
        grid: {
          color: 'rgba(255, 255, 255, 0.04)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.85)',
          font: { size: 11, weight: 'bold' },
          callback: (val) => {
            const num = Number(val);
            if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
            if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
            return `$${num}`;
          },
        },
      },
      yOrders: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Order Volume', color: '#b5b5bd', font: { size: 11 } },
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'rgba(170, 170, 170, 0.8)',
          font: { size: 11, weight: 'bold' },
          callback: (val) => {
            const num = Number(val);
            if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
            return `${num}`;
          },
        },
      },
    },
  };

  return (
    <div className="dash-chart-card-luxury">
      <div className="dash-chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div className="dash-chart-title" style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>
            Revenue &amp; Order Trajectory
          </div>
          <div className="dash-chart-sub" style={{ fontSize: '12px', color: '#8e9693' }}>
            Monthly revenue and order volume trends from actual transaction data
          </div>
        </div>

        {/* Period Pills */}
        <div className="dash-period-pills" style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.04)', padding: '3px', borderRadius: '999px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          {periods.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`period-pill ${selectedPeriod.toLowerCase() === p.key ? 'active' : ''}`}
              onClick={() => onSelectPeriod(p.key)}
              aria-pressed={selectedPeriod.toLowerCase() === p.key}
              style={{
                borderRadius: '999px',
                padding: '5px 12px',
                fontSize: '11px',
                fontWeight: 600,
                background: selectedPeriod.toLowerCase() === p.key ? '#f4f6f5' : 'transparent',
                color: selectedPeriod.toLowerCase() === p.key ? '#0c100e' : '#9aa19e',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ height: '300px', width: '100%', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <span style={{ fontSize: '12px', color: '#fff' }}>Updating chart...</span>
          </div>
        )}
        <Line ref={chartRef} data={chartData} options={options} role="img" aria-label={`Revenue and order volume for ${data.date_range_label}, ${data.labels.length} periods. Revenue uses the solid white line; orders use the dashed gray line.`} />
      </div>

      {/* Legend & Source Meta */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', fontSize: '11px', color: '#8e9693', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="dot-white" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff', display: 'inline-block' }}></span>
            <span style={{ color: '#d4d4d4' }}>Revenue (USD)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#888888', display: 'inline-block' }}></span>
            <span style={{ color: '#d4d4d4' }}>Order Volume</span>
          </div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '10.5px' }}>
          ● UCI Online Retail II Warehouse — {data.labels.length} points ({data.date_range_label})
        </div>
      </div>
    </div>
  );
};
