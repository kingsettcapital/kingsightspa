/**
 * Shared helpers for mortgage capture currency/numeric inputs.
 * Avoid binding Intl-formatted currency into [value] on every keystroke —
 * that traps digits in the ".00" fraction (e.g. typing 400000 becomes $4.00).
 */

export function parseCurrencyInput(value: string, allowNegative = false): number | null {
  const trimmed = value.replace(/[$,\s]/g, '').trim();
  if (!trimmed || trimmed === '-' || trimmed === '-.' || trimmed === '.') {
    return null;
  }
  if (!allowNegative && trimmed.startsWith('-')) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCurrencyDisplay(
  value: number | null | undefined,
  fractionDigits = 2,
): string {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Plain editing text for a currency field (no $ / forced decimals). */
export function formatCurrencyEditText(
  value: number | null | undefined,
  fractionDigits = 2,
): string {
  if (value == null || !Number.isFinite(value)) {
    return '';
  }
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
    useGrouping: false,
  });
}

export function parseNumericInput(value: string, allowDecimal = true): number | null {
  const trimmed = value.replace(/[,\s]/g, '').trim();
  if (!trimmed || trimmed === '-' || trimmed === '-.' || trimmed === '.') {
    return null;
  }
  if (!allowDecimal && /[.]/.test(trimmed)) {
    const whole = trimmed.split('.')[0] ?? '';
    if (!whole || whole === '-') {
      return null;
    }
    const parsed = Number(whole);
    return Number.isFinite(parsed) ? parsed : null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
