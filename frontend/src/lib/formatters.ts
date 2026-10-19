/**
 * Consistent formatting utilities for currency, numbers, percentages, and dates.
 */

export function formatCurrency(val: number | string | undefined | null): string {
  if (val === undefined || val === null || isNaN(Number(val))) return '$0.00';
  const num = Number(val);
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCompactCurrency(val: number | string | undefined | null): string {
  if (val === undefined || val === null || isNaN(Number(val))) return '$0';
  const num = Number(val);
  if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
  return `$${num.toFixed(0)}`;
}

export function formatNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-US');
}

export function formatPercent(val: number | string | undefined | null, decimals: number = 1): string {
  if (val === undefined || val === null || isNaN(Number(val))) return '0.0%';
  const num = Number(val);
  const pct = num <= 1 && num > 0 ? num * 100 : num;
  return `${pct.toFixed(decimals)}%`;
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}
