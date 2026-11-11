import type * as XLSXTypes from 'xlsx-js-style';

/** Shared worksheet styling for the CMHC dashboard's Excel exports (v4 look: navy header, blue underlined links). */
const NAVY_HEADER = {
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '0D1F3C' } },
  alignment: { vertical: 'center', horizontal: 'left' },
};
const LINK_STYLE = { font: { underline: true, color: { rgb: '0563C1' } } };

export function xlsxHeader(labels: string[]): unknown[] {
  return labels.map((v) => ({ v, t: 's', s: NAVY_HEADER }));
}

/** Text with a real hyperlink when a URL is known, plain text otherwise. */
export function xlsxLink(text: string, url: string | null | undefined): unknown {
  return url ? { v: text, t: 's', l: { Target: url }, s: LINK_STYLE } : { v: text, t: 's' };
}

/** A real Excel date so the column sorts and filters chronologically. */
export function xlsxDate(iso: string | null | undefined): unknown {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const ms = Date.UTC(y, m - 1, d);
  if (isNaN(ms)) return iso;
  return { v: Math.round(ms / 86400000) + 25569, t: 'n', z: 'yyyy-mm-dd' };
}

/** Header row, frozen, filterable, with fixed column widths. */
export function xlsxSheet(XLSX: typeof XLSXTypes, aoa: unknown[][], widths: number[]): XLSXTypes.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(aoa as never);
  ws['!cols'] = widths.map((wch) => ({ wch }));
  ws['!autofilter'] = { ref: ws['!ref'] as string };
  (ws as Record<string, unknown>)['!freeze'] = { xSplit: 0, ySplit: 1 };
  return ws;
}
