import { Pipe, PipeTransform } from '@angular/core';

const SHORT_SCALE_UNITS: ReadonlyArray<{ threshold: number; suffix: string }> = [
  { threshold: 1_000_000_000_000, suffix: 'T' },
  { threshold: 1_000_000_000, suffix: 'B' },
  { threshold: 1_000_000, suffix: 'M' },
  { threshold: 1_000, suffix: 'K' },
];

@Pipe({
  name: 'ksCurrency',
  standalone: true,
})
export class KsCurrencyPipe implements PipeTransform {
  transform(
    value: number | null | undefined,
    currency: string = 'USD',
    fractionDigits: number = 2,
    compact: boolean = false,
  ): string {
    if (value == null || !Number.isFinite(value)) {
      return '—';
    }

    if (compact) {
      return this.formatCompact(value, currency, fractionDigits);
    }

    return this.formatStandard(value, currency, fractionDigits);
  }

  private formatStandard(value: number, currency: string, fractionDigits: number): string {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(Math.abs(value));

    return value < 0 ? `-${formatted}` : formatted;
  }

  private formatCompact(value: number, currency: string, fractionDigits: number): string {
    const negative = value < 0;
    const abs = Math.abs(value);
    const symbol = this.currencySymbol(currency);
    const sign = negative ? '-' : '';

    for (const { threshold, suffix } of SHORT_SCALE_UNITS) {
      if (abs >= threshold) {
        const scaled = abs / threshold;
        const truncated = this.truncate(scaled, fractionDigits);
        const numberPart = truncated.toLocaleString('en-US', {
          minimumFractionDigits: fractionDigits,
          maximumFractionDigits: fractionDigits,
        });
        return `${sign}${symbol}${numberPart}${suffix}`;
      }
    }

    return this.formatStandard(value, currency, fractionDigits);
  }

  /** Truncate toward zero so compact values are not rounded up (e.g. 1.999B stays 1.999B). */
  private truncate(value: number, fractionDigits: number): number {
    const factor = 10 ** fractionDigits;
    return Math.trunc(value * factor) / factor;
  }

  private currencySymbol(currency: string): string {
    const parts = new Intl.NumberFormat('en-US', { style: 'currency', currency }).formatToParts(0);
    return parts.find((part) => part.type === 'currency')?.value ?? '$';
  }
}
