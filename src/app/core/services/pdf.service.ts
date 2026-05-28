import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { TableExportOptions } from '../interfaces/export.interfaces';

/** KingSight navy — matches --ks-color-navy */
const NAVY_RGB: [number, number, number] = [12, 39, 74];
const ROW_ALT_RGB: [number, number, number] = [248, 250, 252];
const TRUE_ACCENT_RGB: [number, number, number] = [217, 119, 6];

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  export<T>(options: TableExportOptions<T>): void {
    if (!options.rows.length) {
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const marginX = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    let startY = 36;

    if (options.title) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(...NAVY_RGB);
      doc.text(options.title, marginX, startY);
      startY += 28;
    }

    const lateInterestApplicableIndex = options.columns.findIndex(
      (column) => column.header === 'Late Interest Applicable',
    );

    autoTable(doc, {
      startY,
      head: [options.columns.map((column) => column.header)],
      body: options.rows.map((row) =>
        options.columns.map((column) => String(column.value(row))),
      ),
      theme: 'plain',
      styles: {
        fontSize: 8,
        cellPadding: { top: 5, right: 6, bottom: 5, left: 6 },
        lineColor: [219, 227, 239],
        lineWidth: 0.5,
        textColor: [17, 24, 39],
        valign: 'middle',
      },
      headStyles: {
        fillColor: NAVY_RGB,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: ROW_ALT_RGB,
      },
      margin: { left: marginX, right: marginX },
      tableWidth: pageWidth - marginX * 2,
      didParseCell: (data) => {
        if (
          data.section === 'body' &&
          lateInterestApplicableIndex >= 0 &&
          data.column.index === lateInterestApplicableIndex &&
          String(data.cell.raw).toUpperCase() === 'TRUE'
        ) {
          data.cell.styles.textColor = TRUE_ACCENT_RGB;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    const filename = options.filename.endsWith('.pdf')
      ? options.filename
      : `${options.filename}.pdf`;

    doc.save(filename);
  }
}
