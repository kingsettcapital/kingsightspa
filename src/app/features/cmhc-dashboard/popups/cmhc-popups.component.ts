import { Component, computed, HostListener, inject } from '@angular/core';

import { CmhcData, CmhcDeal } from '../cmhc-dashboard.models';
import { CmhcDataService } from '../cmhc-data.service';

interface MoveRow {
  entry: CmhcDeal;
  dealIndex: number;
}

interface MoveGroup {
  title: string;
  style: string;
  kindLabel: string;
  kindStyle: string;
  count: number;
  vol: number;
  rows: MoveRow[];
}

interface MilestoneStep {
  label: string;
  done: boolean;
}

/** Deal popup and list popup (deal list, pool movement, pool funded): ports of v4 openDeal / openListModal / openMoveModal / openFundedModal. */
@Component({
  selector: 'app-cmhc-popups',
  standalone: true,
  templateUrl: './cmhc-popups.component.html',
})
export class CmhcPopupsComponent {
  private readonly dataService = inject(CmhcDataService);

  readonly e = computed(() => this.dataService.engine());
  readonly popup = this.dataService.listPopup;

  readonly deal = computed<CmhcDeal | null>(() => {
    const i = this.dataService.dealPopup();
    const deals = this.dataService.data()?.deals;
    return i != null && deals ? (deals[i] ?? null) : null;
  });

  readonly dealFlags = computed<string[]>(() => {
    const d = this.deal();
    return d ? this.e().dealFlags(d) : [];
  });

  readonly steps = computed<MilestoneStep[]>(() => {
    const d = this.deal();
    if (!d) return [];
    const engine = this.e();
    const committed = d.status === 'Commitment Signed' || d.status === 'Rate Locked';
    const coiApproved = engine.isCommitted(d) || d.coip === 'Approved';
    return [
      { label: 'Quote Accepted', done: true },
      { label: 'COIP Applied', done: !!engine.isCoipApplied(d) },
      { label: 'COI Approved', done: !!coiApproved },
      { label: 'OTP Approved', done: d.otp === 'Yes' },
      { label: 'Commitment Signed', done: committed },
      { label: 'Rate Locked', done: d.status === 'Rate Locked' },
    ];
  });

  readonly fields = computed<{ label: string; value: string; color?: string }[]>(() => {
    const d = this.deal();
    if (!d) return [];
    const engine = this.e();
    const f: { label: string; value: string; color?: string }[] = [
      { label: 'Loan No', value: d.loanNo || '—' },
      { label: 'Status', value: d.status },
      {
        label: 'Funding date',
        value: engine.fmtDate(d.fundDate) + (d.dtf != null ? ' (' + engine.fmtDays(d.dtf) + ')' : ''),
      },
      { label: 'Investor', value: d.investor || '—' },
    ];
    if (!engine.isConstruction(d)) {
      f.push({ label: 'CMB pool', value: d.cmb || '—' });
      f.push({ label: 'MBS Date', value: d.mbsDate ? engine.fmtDate(d.mbsDate) : '—' });
      f.push({ label: 'Pool gap', value: d.cutGap != null ? Math.abs(d.cutGap) + 'd' : '—' });
      f.push({ label: 'Loan type', value: d.loanType || '—' });
      f.push({ label: 'Gross Loan', value: engine.M(d.loan || 0) });
    } else {
      f.push({ label: 'Gross Loan', value: engine.M(d.loan || 0) });
      f.push({ label: 'Loan type', value: d.loanType || '—' });
    }
    f.push({ label: 'Term', value: d.termYrs ? d.termYrs.toFixed(1) + ' yr' : '—' });
    f.push({
      label: 'Quote Accepted',
      value: engine.fmtDate(d.qaDate) + (d.qaAge != null ? ' (' + d.qaAge + 'd)' : ''),
    });
    const visited = d.siteVisited === 'Yes';
    f.push({
      label: 'Site Visit',
      value: visited ? '✓ Visited' : '○ Outstanding',
      color: visited ? 'var(--green)' : 'var(--amber)',
    });
    return f;
  });

  /** Only http(s) links are offered. */
  readonly dealpathUrl = computed(() => {
    const url = this.deal()?.url;
    return url && /^https?:\/\//i.test(url) ? (url as string) : null;
  });

  /** Title and subtitle for the list popup, whichever kind it is. */
  readonly listHeader = computed(() => {
    const p = this.popup();
    const data = this.dataService.data();
    const engine = this.e();
    if (!p || !data) return null;
    if (p.kind === 'deals') return { name: p.name, sub: p.sub };
    if (p.kind === 'tl') return { name: p.label, sub: p.sub };
    if (p.kind === 'issue') {
      const n = p.category.deals.length;
      return {
        name: p.category.title.split(' (')[0] + (p.funded ? ' — Funded Files' : ''),
        sub:
          `${n} ${p.funded ? 'funded ' : ''}file${n === 1 ? '' : 's'}` +
          (p.uwFilter ? ' · ' + p.uwFilter : '') +
          ' · ' +
          p.category.desc,
      };
    }
    if (p.kind === 'move') {
      const mvs = data.poolMoves;
      const mv = mvs?.byPool?.[p.pool];
      const mt = engine.poolMoveText(mv);
      return {
        name: p.pool + ' Pool — movement',
        sub: 'Since ' + engine.fmtDate(mvs?.week) + ' · ' + mt.title.replace(' — click for the list', ''),
      };
    }
    const pool = (data.pools ?? []).find((x: CmhcDeal) => x.pool === p.pool);
    const list: CmhcDeal[] = pool?.fundedList ?? [];
    const vol = list.reduce((s, x) => s + (x.loan || 0), 0);
    return {
      name: p.pool + ' Pool — funded',
      sub: `${list.length} loan${list.length !== 1 ? 's' : ''} funded into this pool · ${engine.M(vol)}`,
    };
  });

  readonly moveGroups = computed<MoveGroup[]>(() => {
    const p = this.popup();
    const data = this.dataService.data();
    if (!p || p.kind !== 'move' || !data) return [];
    const engine = this.e();
    const mv = data.poolMoves?.byPool?.[p.pool];
    if (!mv) return [];
    const byFund = (a: CmhcDeal, b: CmhcDeal) => {
      const x = a.fundDate || '9999-12-31';
      const y = b.fundDate || '9999-12-31';
      return x < y ? -1 : x > y ? 1 : 0;
    };
    const deals: CmhcDeal[] = data.deals;
    const rows = (list: CmhcDeal[]): MoveRow[] =>
      list
        .slice()
        .sort(byFund)
        .map((entry) => ({
          entry,
          dealIndex: deals.findIndex((d) => engine.loanKey(d) === entry.key),
        }));
    const groups: MoveGroup[] = [
      {
        title: 'Added to this pool',
        style: 'color:var(--green)',
        kindLabel: 'Added',
        kindStyle: 'background:var(--green-bg);color:var(--green)',
        list: mv.added,
        vol: mv.addV,
      },
      {
        title: 'Removed from this pool',
        style: 'color:var(--red)',
        kindLabel: 'Removed',
        kindStyle: 'background:var(--red-bg);color:var(--red)',
        list: mv.removed,
        vol: mv.remV,
      },
      {
        title: 'Funded during the period',
        style: 'color:var(--text-2)',
        kindLabel: 'Funded',
        kindStyle: 'background:var(--surface);color:var(--text-2)',
        list: mv.funded,
        vol: mv.fundV,
      },
    ].map((g) => ({ ...g, count: (g.list || []).length, rows: rows(g.list || []) }));
    return groups.filter((g) => g.count > 0);
  });

  readonly fundedRows = computed<CmhcDeal[]>(() => {
    const p = this.popup();
    const data = this.dataService.data();
    if (!p || p.kind !== 'funded' || !data) return [];
    const pool = (data.pools ?? []).find((x: CmhcDeal) => x.pool === p.pool);
    const byFund = (a: CmhcDeal, b: CmhcDeal) => {
      const x = a.fundDate || '';
      const y = b.fundDate || '';
      return x > y ? -1 : x < y ? 1 : 0;
    };
    return ((pool?.fundedList as CmhcDeal[]) ?? []).slice().sort(byFund);
  });

  /** Timelines rows open the matching deal (by name and sponsor, as v4 did) when it is still in the pipeline. */
  tlDealIndex(o: CmhcDeal): number {
    const deals: CmhcDeal[] = this.dataService.data()?.deals ?? [];
    return deals.findIndex((d) => d.name === o.name && (d.sponsor || null) === (o.sponsor || null));
  }

  tlSub(o: CmhcDeal): string {
    return [o.sponsor, o.uw, o.orig].filter(Boolean).join(' · ');
  }

  openTlDeal(o: CmhcDeal): void {
    const i = this.tlDealIndex(o);
    if (i < 0) return;
    this.dataService.listPopup.set(null);
    this.dataService.openDeal(i);
  }

  dealIndex(d: CmhcDeal): number {
    return (this.dataService.data()?.deals as CmhcDeal[]).indexOf(d);
  }

  dealFlagList(d: CmhcDeal): string[] {
    return this.e().dealFlags(d);
  }

  daysColor(d: CmhcDeal): string {
    if (d.dtf == null) return 'var(--text-3)';
    return d.dtf <= 7 ? 'var(--red)' : d.dtf <= 14 ? 'var(--amber)' : 'var(--text-3)';
  }

  openDeal(index: number): void {
    if (index >= 0) this.dataService.openDeal(index);
  }

  /** Backdrop click closes a popup; clicks inside the dialog do not. */
  backdrop(event: Event, which: 'deal' | 'list'): void {
    if (event.target !== event.currentTarget) return;
    if (which === 'deal') this.dataService.dealPopup.set(null);
    else this.dataService.listPopup.set(null);
  }

  closeDeal(): void {
    this.dataService.dealPopup.set(null);
  }

  closeList(): void {
    this.dataService.listPopup.set(null);
  }

  /** A flag chip jumps to the Methodology tab's flag legend (v4 goToFlagLegend). */
  goToFlagLegend(event: Event): void {
    event.stopPropagation();
    this.dataService.goToFlagLegend();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.dataService.closePopups();
  }

  meta(flag: string): CmhcData {
    return this.e().FLAG_META[flag];
  }

  statusClass(status: string): string {
    return this.e().STATUS_CLS[status] || 'sb-qa';
  }

  abbrev(name: string): string {
    return this.e().abbrevName(name) || '—';
  }
}
