import { Pipe, PipeTransform } from '@angular/core';

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
    if (value == null || !Number.isFinite(value)) return '—';

    const abs = Math.abs(value);
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      ...(compact ? { notation: 'compact', compactDisplay: 'short' } : {}),
    }).format(abs);

    return value < 0 ? `(${formatted})` : formatted;
  }
}

