export function formatCurrency(value: number, options?: { compact?: boolean }): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...(options?.compact ? { notation: 'compact', compactDisplay: 'short' } : {}),
  }).format(abs);
  return value < 0 ? `(-${formatted})` : formatted;
}

export function formatPercent(value: number, signed = false): string {
  const prefix = signed && value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

