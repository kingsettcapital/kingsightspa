import { Injectable } from '@angular/core';
import type * as XLSXTypes from 'xlsx-js-style';

import { TableExportOptions } from '../interfaces/export.interfaces';

const HEADER_STYLE = {
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '0C274A' } },
  alignment: { vertical: 'center', horizontal: 'left', wrapText: true },
};

const MIN_COLUMN_WIDTH = 12;
const MAX_COLUMN_WIDTH = 52;

@Injectable({
  providedIn: 'root',
})
export class ExcelService {
  async export<T>(options: TableExportOptions<T>): Promise<void> {
    if (!options.rows.length) {
      return;
    }

    const XLSX = await import('xlsx-js-style');

    const sheetRows = options.rows.map((row) => {
      const record: Record<string, string | number | boolean> = {};
      for (const column of options.columns) {
        record[column.header] = column.value(row);
      }
      return record;
    });

    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    this.applyHeaderStyles(XLSX, worksheet);
    worksheet['!cols'] = this.buildColumnWidths(options);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName ?? 'Sheet1');

    const filename = options.filename.endsWith('.xlsx')
      ? options.filename
      : `${options.filename}.xlsx`;

    XLSX.writeFile(workbook, filename);
  }

  private applyHeaderStyles(XLSX: typeof XLSXTypes, worksheet: XLSXTypes.WorkSheet): void {
    const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
    if (!range) {
      return;
    }

    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const address = XLSX.utils.encode_cell({ r: 0, c: column });
      const cell = worksheet[address];
      if (!cell) {
        continue;
      }
      cell.s = HEADER_STYLE;
    }
  }

  private buildColumnWidths<T>(options: TableExportOptions<T>): XLSXTypes.ColInfo[] {
    return options.columns.map((column) => {
      let maxLength = column.header.length;

      for (const row of options.rows) {
        const value = String(column.value(row));
        maxLength = Math.max(maxLength, value.length);
      }

      return {
        wch: Math.min(Math.max(maxLength + 2, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH),
      };
    });
  }
}
