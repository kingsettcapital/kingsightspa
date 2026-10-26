import { Component, computed, inject, signal } from '@angular/core';

import { CmhcIssueCategory } from '../cmhc-dashboard.models';
import { CmhcDataService } from '../cmhc-data.service';

type IssueMode = 'active' | 'funded';

const NAVY_HEADER = {
  font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: '0D1F3C' } },
  alignment: { vertical: 'center', horizontal: 'left' },
};
const LINK_STYLE = { font: { underline: true, color: { rgb: '0563C1' } } };
const NO_UW = '—';

/** Data Issues tab: port of v4 renderDataIssues() plus its Excel export. */
@Component({
  selector: 'app-cmhc-data-issues',
  standalone: true,
  templateUrl: './cmhc-data-issues.component.html',
})
export class CmhcDataIssuesComponent {
  private readonly dataService = inject(CmhcDataService);

  readonly e = computed(() => this.dataService.engine());

  readonly mode = signal<IssueMode>('active');
  readonly uwFilter = signal('');
  readonly exporting = signal(false);

  /** Both registers, from v4's own functions. */
  readonly activeCats = computed<CmhcIssueCategory[]>(() => {
    this.dataService.data();
    return this.e().computeDataIssues();
  });
  readonly fundedCats = computed<CmhcIssueCategory[]>(() => {
    this.dataService.data();
    return this.e().computeFundedIssues();
  });

  readonly funded = computed(() => this.mode() === 'funded');
  private readonly source = computed(() => (this.funded() ? this.fundedCats() : this.activeCats()));

  readonly modes = computed(() => [
    { id: 'active' as const, label: 'Active', n: this.tally(this.activeCats()) },
    { id: 'funded' as const, label: 'Funded', n: this.tally(this.fundedCats()) },
  ]);

  /** Owners with issues in the register on show, with counts. */
  readonly owners = computed(() => {
    const counts: Record<string, number> = {};
    this.source().forEach((c) =>
      c.deals.forEach((d) => {
        if (d.uw && d.uw !== NO_UW) counts[d.uw] = (counts[d.uw] || 0) + 1;
      }),
    );
    return Object.keys(counts)
      .sort()
      .map((name) => ({ name, n: counts[name] }));
  });

  /** The filter only applies while that owner still has issues in the register on show. */
  readonly activeFilter = computed(() => {
    const f = this.uwFilter();
    return this.owners().some((o) => o.name === f) ? f : '';
  });

  readonly totalAll = computed(() => this.tally(this.source()));

  readonly cats = computed<CmhcIssueCategory[]>(() => {
    const f = this.activeFilter();
    return this.source()
      .map((c) => (f ? { ...c, deals: c.deals.filter((d) => d.uw === f) } : c))
      .filter((c) => c.deals.length > 0);
  });

  readonly total = computed(() => this.tally(this.cats()));

  setMode(mode: IssueMode): void {
    if (this.mode() === mode) return;
    this.mode.set(mode);
    this.uwFilter.set('');
  }

  openCategory(category: CmhcIssueCategory): void {
    this.dataService.openList({
      kind: 'issue',
      category,
      funded: this.funded(),
      uwFilter: this.activeFilter(),
    });
  }

  firstName(name: string): string {
    return name.split(' ')[0];
  }

  /** Port of v4 exportDataIssuesXlsx(): active register plus "Funded Files 2025+", with Dealpath links. */
  async exportToExcel(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const XLSX = await import('xlsx-js-style');
      const data = this.dataService.data();
      const deals = (data?.deals ?? []) as { url?: string | null }[];
      const byOwnerThenDeal = (a: { uw: string; deal: string }, b: { uw: string; deal: string }) => {
        const au = a.uw === NO_UW ? '￿' : a.uw;
        const bu = b.uw === NO_UW ? '￿' : b.uw;
        return au !== bu ? au.localeCompare(bu) : (a.deal || '').localeCompare(b.deal || '');
      };

      const active: { uw: string; auw: string; deal: string; issue: string; detail: string; url: string | null }[] = [];
      this.activeCats().forEach((c) =>
        c.deals.forEach((d) =>
          active.push({
            uw: d.uw || NO_UW,
            auw: d.auw || '',
            deal: d.name || '',
            issue: c.title,
            detail: d.detail || '',
            url: deals[d.idx]?.url || null,
          }),
        ),
      );
      active.sort(byOwnerThenDeal);

      const funded: {
        uw: string;
        auw: string;
        deal: string;
        issue: string;
        detail: string;
        url: string | null;
        fund: string | null;
      }[] = [];
      this.fundedCats().forEach((c) =>
        c.deals.forEach((d) =>
          funded.push({
            uw: d.uw || NO_UW,
            auw: d.auw || '',
            deal: d.name || '',
            issue: c.title,
            detail: d.detail || '',
            url: d.url || null,
            fund: d.fundDate || null,
          }),
        ),
      );
      funded.sort(byOwnerThenDeal);

      const link = (text: string, url: string | null) =>
        url ? { v: text, t: 's', l: { Target: url }, s: LINK_STYLE } : { v: text, t: 's' };
      const header = (labels: string[]) => labels.map((v) => ({ v, t: 's', s: NAVY_HEADER }));
      const sheet = (aoa: unknown[][], widths: number[]) => {
        const ws = XLSX.utils.aoa_to_sheet(aoa as never);
        ws['!cols'] = widths.map((wch) => ({ wch }));
        ws['!autofilter'] = { ref: ws['!ref'] as string };
        (ws as Record<string, unknown>)['!freeze'] = { xSplit: 0, ySplit: 1 };
        return ws;
      };

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        sheet(
          [
            header(['Funder', 'Underwriter', 'Deal Name', 'Issue Category', 'Detail']),
            ...active.map((r) => [r.uw, r.auw, link(r.deal, r.url), r.issue, r.detail]),
          ],
          [22, 22, 42, 40, 46],
        ),
        'Data Issues',
      );
      if (funded.length) {
        XLSX.utils.book_append_sheet(
          wb,
          sheet(
            [
              header(['Funder', 'Underwriter', 'Deal Name', 'Funding Date', 'Issue Category', 'Detail']),
              ...funded.map((r) => [r.uw, r.auw, link(r.deal, r.url), this.dateCell(r.fund), r.issue, r.detail]),
            ],
            [22, 22, 42, 16, 40, 46],
          ),
          'Funded Files 2025+',
        );
      }
      XLSX.writeFile(wb, `CMHC Data Issues - ${this.dataService.asOf()}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Could not build the Excel file.');
    } finally {
      this.exporting.set(false);
    }
  }

  /** A real Excel date so the column sorts and filters chronologically. */
  private dateCell(iso: string | null): unknown {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    const ms = Date.UTC(y, m - 1, d);
    if (isNaN(ms)) return iso;
    return { v: Math.round(ms / 86400000) + 25569, t: 'n', z: 'yyyy-mm-dd' };
  }

  private tally(list: CmhcIssueCategory[]): number {
    return list.reduce((t, c) => t + c.deals.length, 0);
  }
}
