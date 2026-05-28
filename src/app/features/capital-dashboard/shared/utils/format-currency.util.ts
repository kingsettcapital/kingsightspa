export function formatCurrency(value: number, options?: { compact?: boolean }): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...(options?.compact ? { notation: 'compact', compactDisplay: 'short' } : {}),
  }).format(value);
}

export function formatPercent(value: number, signed = false): string {
  const prefix = signed && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

