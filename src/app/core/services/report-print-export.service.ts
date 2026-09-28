import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Report PDF export via an off-screen clone.
 *
 * Capturing the live scrollable dashboard fails because sticky table headers /
 * footers and max-height table wraps paint over titles when overflow is unlocked.
 * We clone into a detached host, force every sticky/scroll constraint off with
 * inline !important styles, then screenshot that clone.
 *
 * Page slices snap to section / table-row boundaries when possible so rows and
 * chart cards are not cut mid-block.
 */
@Injectable({
  providedIn: 'root',
})
export class ReportPrintExportService {
  print(): void {
    // Kept for any remaining callers; Management Summary / Loan Detail no longer expose Print.
    const style = document.createElement('style');
    style.setAttribute('data-ks-report-print', 'true');
    style.textContent = `
      @page {
        size: landscape;
        margin: 0.5in;
      }
      @media print {
        html, body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
      }
    `;
    document.head.appendChild(style);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) {
        return;
      }
      cleaned = true;
      style.remove();
      window.removeEventListener('afterprint', cleanup);
      window.clearTimeout(fallbackTimer);
    };
    const fallbackTimer = window.setTimeout(cleanup, 120_000);
    window.addEventListener('afterprint', cleanup);

    window.print();
  }

  async exportElementToPdf(element: HTMLElement, filename: string): Promise<void> {
    const pageScroller = element.closest('.ks-page') as HTMLElement | null;
    const prevScroll = pageScroller?.scrollTop ?? 0;
    if (pageScroller) {
      pageScroller.scrollTop = 0;
    }

    const host = document.createElement('div');
    host.setAttribute('data-ks-pdf-export-host', 'true');
    host.style.cssText = [
      'position:fixed',
      'left:-10000px',
      'top:0',
      'width:1600px',
      'background:#ffffff',
      'opacity:0',
      'pointer-events:none',
      'z-index:-1',
      'overflow:visible',
    ].join(';');

    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('.ks-no-print').forEach((node) => node.remove());
    this.copyCanvasContents(element, clone);
    host.appendChild(clone);
    document.body.appendChild(host);

    try {
      await this.waitForPaint();
      this.neutralizeCloneLayout(clone);
      await this.waitForPaint();

      const width = Math.max(clone.scrollWidth, clone.offsetWidth, 1400);
      const height = Math.max(clone.scrollHeight, clone.offsetHeight, 1);
      host.style.width = `${width}px`;

      const breakPointsCssPx = this.collectBreakPointsCssPx(clone);

      const scale = Math.min(2, 10000 / Math.max(width, height / 4));
      const canvas = await html2canvas(clone, {
        scale,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        scrollX: 0,
        scrollY: 0,
        x: 0,
        y: 0,
        onclone: (_doc, clonedEl) => {
          this.neutralizeCloneLayout(clonedEl as HTMLElement);
        },
      });

      const cssToCanvas = canvas.height / Math.max(height, 1);
      const breakPointsCanvasPx = breakPointsCssPx
        .map((y) => Math.round(y * cssToCanvas))
        .filter((y) => y > 0 && y < canvas.height);

      const orientation = width / Math.max(height, 1) > 0.75 ? 'landscape' : 'portrait';
      const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });
      this.addCanvasPages(pdf, canvas, 20, breakPointsCanvasPx);

      const safeName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      pdf.save(safeName);
    } finally {
      host.remove();
      if (pageScroller) {
        pageScroller.scrollTop = prevScroll;
      }
    }
  }

  /**
   * Force normal document flow on the clone so sticky thead/tfoot and
   * scrollable table wraps cannot paint over titles during capture.
   */
  private neutralizeCloneLayout(root: HTMLElement): void {
    root.style.setProperty('overflow', 'visible', 'important');
    root.style.setProperty('height', 'auto', 'important');
    root.style.setProperty('max-height', 'none', 'important');
    root.style.setProperty('background', '#ffffff', 'important');

    const nodes = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
    for (const el of nodes) {
      const cs = window.getComputedStyle(el);
      const position = cs.position;
      if (position === 'sticky' || position === 'fixed') {
        el.style.setProperty('position', 'static', 'important');
        el.style.setProperty('top', 'auto', 'important');
        el.style.setProperty('bottom', 'auto', 'important');
        el.style.setProperty('left', 'auto', 'important');
        el.style.setProperty('right', 'auto', 'important');
        el.style.setProperty('z-index', 'auto', 'important');
        el.style.setProperty('transform', 'none', 'important');
      }

      const overflowY = cs.overflowY;
      const overflowX = cs.overflowX;
      if (
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowX === 'auto' ||
        overflowX === 'scroll' ||
        overflowY === 'hidden'
      ) {
        el.style.setProperty('overflow', 'visible', 'important');
        el.style.setProperty('overflow-x', 'visible', 'important');
        el.style.setProperty('overflow-y', 'visible', 'important');
      }

      if (cs.maxHeight !== 'none') {
        el.style.setProperty('max-height', 'none', 'important');
      }
    }

    root
      .querySelectorAll<HTMLElement>(
        '.ms-table-wrap, .ldr-table-wrap, .ms-mini-table-wrap, .ms-dashboard, .ldr-dashboard',
      )
      .forEach((el) => {
        el.style.setProperty('overflow', 'visible', 'important');
        el.style.setProperty('max-height', 'none', 'important');
        el.style.setProperty('height', 'auto', 'important');
      });

    root
      .querySelectorAll<HTMLElement>(
        '.ms-table thead th, .ldr-table thead th, .ms-table tfoot td, .ldr-table tfoot td, .ms-home-link, .ldr-home-link',
      )
      .forEach((el) => {
        el.style.setProperty('position', 'static', 'important');
        el.style.setProperty('top', 'auto', 'important');
        el.style.setProperty('bottom', 'auto', 'important');
        el.style.setProperty('z-index', 'auto', 'important');
      });

    root.querySelectorAll<HTMLElement>('.ms-header h1, .ldr-header h1').forEach((el) => {
      el.style.setProperty('margin-bottom', '0.75rem', 'important');
      el.style.setProperty('line-height', '1.35', 'important');
      el.style.setProperty('overflow', 'visible', 'important');
    });

    root.querySelectorAll<HTMLElement>('.ms-kpi-row, .ldr-kpi-row').forEach((el) => {
      el.style.setProperty('margin-top', '0.5rem', 'important');
      el.style.setProperty('position', 'static', 'important');
    });

    // Avoid mid-word / mid-currency wraps in PDF capture.
    root
      .querySelectorAll<HTMLElement>(
        '.ms-table thead th, .ms-table tbody td, .ms-table tfoot td, .ldr-table thead th, .ldr-table tbody td, .ldr-table tfoot td',
      )
      .forEach((el) => {
        el.style.setProperty('overflow-wrap', 'normal', 'important');
        el.style.setProperty('word-break', 'normal', 'important');
        el.style.setProperty('hyphens', 'none', 'important');
      });
    root
      .querySelectorAll<HTMLElement>(
        '.ms-table .num, .ldr-table .num, .ms-risk, .ms-watch-status, .ldr-risk',
      )
      .forEach((el) => {
        el.style.setProperty('white-space', 'nowrap', 'important');
      });

    // Keep donut charts circular in the clone.
    root
      .querySelectorAll<HTMLElement>(
        '.ms-chart:not(.ms-chart--bar), .ldr-chart-card--composition .ldr-chart',
      )
      .forEach((el) => {
        const side = el.classList.contains('ldr-chart') || el.closest('.ldr-chart-card') ? '16rem' : '11rem';
        el.style.setProperty('width', side, 'important');
        el.style.setProperty('height', side, 'important');
        el.style.setProperty('aspect-ratio', '1', 'important');
        el.style.setProperty('margin-left', 'auto', 'important');
        el.style.setProperty('margin-right', 'auto', 'important');
      });
    root
      .querySelectorAll<HTMLElement>(
        '.ms-chart:not(.ms-chart--bar) canvas, .ldr-chart-card--composition canvas',
      )
      .forEach((el) => {
        const canvas = el as HTMLCanvasElement;
        const side = Math.min(canvas.width || 256, canvas.height || 256);
        if (side > 0) {
          el.style.setProperty('width', `${side}px`, 'important');
          el.style.setProperty('height', `${side}px`, 'important');
        }
      });
  }

  /** Preferred Y offsets (CSS px, relative to root) to snap page slices. */
  private collectBreakPointsCssPx(root: HTMLElement): number[] {
    const rootTop = root.getBoundingClientRect().top;
    const breaks = new Set<number>();

    const addTop = (el: Element) => {
      if (!(el instanceof HTMLElement)) {
        return;
      }
      const y = Math.round(el.getBoundingClientRect().top - rootTop);
      if (y > 8) {
        breaks.add(y);
      }
    };

    root
      .querySelectorAll(
        [
          '.ms-kpi-row',
          '.ms-outstanding',
          '.ms-section',
          '.ms-section__head',
          '.ms-analytics-row',
          '.ms-chart-card',
          '.ms-watchlist-head',
          '.ldr-kpi-row',
          '.ldr-info-grid',
          '.ldr-section',
          '.ldr-charts-row',
          '.ldr-chart-card',
          'thead',
          'tbody tr',
          'tfoot tr',
        ].join(','),
      )
      .forEach(addTop);

    return [...breaks].sort((a, b) => a - b);
  }

  /** Copy live Chart.js canvas pixels into the clone (cloneNode leaves canvases blank). */
  private copyCanvasContents(sourceRoot: HTMLElement, cloneRoot: HTMLElement): void {
    const sourceCanvases = sourceRoot.querySelectorAll('canvas');
    const cloneCanvases = cloneRoot.querySelectorAll('canvas');
    sourceCanvases.forEach((source, index) => {
      const target = cloneCanvases.item(index);
      if (!(target instanceof HTMLCanvasElement)) {
        return;
      }

      const isDonut =
        !!source.closest('.ldr-chart-card--composition') ||
        !!source.closest('.ms-chart:not(.ms-chart--bar)');
      const side = Math.min(source.width, source.height);
      if (isDonut && side > 0 && source.width !== source.height) {
        const sx = Math.floor((source.width - side) / 2);
        const sy = Math.floor((source.height - side) / 2);
        target.width = side;
        target.height = side;
        const ctx = target.getContext('2d');
        if (ctx) {
          ctx.drawImage(source, sx, sy, side, side, 0, 0, side, side);
        }
        return;
      }

      target.width = source.width;
      target.height = source.height;
      const ctx = target.getContext('2d');
      if (ctx) {
        ctx.drawImage(source, 0, 0);
      }
    });
  }

  private waitForPaint(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 50);
        });
      });
    });
  }

  private addCanvasPages(
    pdf: jsPDF,
    canvas: HTMLCanvasElement,
    margin: number,
    breakPointsCanvasPx: number[] = [],
  ): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const contentHeight = pageHeight - margin * 2;
    const pxPerPt = canvas.width / contentWidth;
    const pageSlicePx = Math.max(1, Math.floor(contentHeight * pxPerPt));
    const minUsefulSlice = Math.floor(pageSlicePx * 0.35);
    const snapWindow = Math.floor(pageSlicePx * 0.28);

    let srcY = 0;
    let pageIndex = 0;

    while (srcY < canvas.height) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      const idealEnd = Math.min(srcY + pageSlicePx, canvas.height);
      let sliceEnd = idealEnd;

      if (idealEnd < canvas.height && breakPointsCanvasPx.length) {
        const windowStart = Math.max(srcY + minUsefulSlice, idealEnd - snapWindow);
        let best = 0;
        for (const bp of breakPointsCanvasPx) {
          if (bp <= srcY + 2) {
            continue;
          }
          if (bp > idealEnd) {
            break;
          }
          if (bp >= windowStart) {
            best = bp;
          }
        }
        // Prefer any break in the lower portion of the page over cutting mid-row.
        if (best > 0) {
          sliceEnd = best;
        } else {
          // Fall back: nearest break at or before idealEnd (still after minUsefulSlice).
          for (const bp of breakPointsCanvasPx) {
            if (bp <= srcY + minUsefulSlice) {
              continue;
            }
            if (bp > idealEnd) {
              break;
            }
            best = bp;
          }
          if (best > 0) {
            sliceEnd = best;
          }
        }
      }

      const slicePx = Math.max(1, sliceEnd - srcY);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.max(1, Math.ceil(slicePx));
      const ctx = sliceCanvas.getContext('2d');
      if (!ctx) {
        break;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);

      pdf.addImage(
        sliceCanvas.toDataURL('image/png'),
        'PNG',
        margin,
        margin,
        contentWidth,
        slicePx / pxPerPt,
      );

      srcY = sliceEnd;
      pageIndex += 1;
      if (pageIndex > 100) {
        break;
      }
    }
  }
}
