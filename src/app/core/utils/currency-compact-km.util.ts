/** Coerce API / grid values to a finite number when possible. */
export function coerceCurrencyAmount(value: unknown): number | null {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.trim().replace(/[,$%]/g, ''));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

/**
 * Compact currency: Millions → $XM, Thousands → $XK; rounded whole numbers, no decimals.
 * Values under $1,000 render as rounded dollars (e.g. $500).
 */
export function formatCurrencyCompactKm(
  value: number | null | undefined,
  options?: { withDollarSign?: boolean },
): string {
  const amount = coerceCurrencyAmount(value);
  if (amount == null) {
    return '-';
  }

  const withDollarSign = options?.withDollarSign ?? true;
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  const prefix = withDollarSign ? '$' : '';

  if (abs === 0) {
    return `${prefix}0`;
  }

  if (abs >= 1_000_000) {
    return `${sign}${prefix}${Math.round(abs / 1_000_000)}M`;
  }

  if (abs >= 1_000) {
    const thousands = Math.round(abs / 1_000);
    // e.g. 999_500 → 1000K should read as 1M
    if (thousands >= 1_000) {
      return `${sign}${prefix}${Math.round(abs / 1_000_000)}M`;
    }
    return `${sign}${prefix}${thousands}K`;
  }

  return `${sign}${prefix}${Math.round(abs)}`;
}
