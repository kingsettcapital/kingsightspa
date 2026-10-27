import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { CmhcData, CmhcDeal } from '../cmhc-dashboard.models';
import { CmhcDataService } from '../cmhc-data.service';

const PERSON_ROUTES: Record<string, string> = {
  uw: 'underwriter',
  orig: 'originator',
  rev: 'reviewer',
  pool: 'pools',
};

const ALERT_DOT: Record<string, string> = {
  red: '#DC2626',
  orange: '#C2410C',
  yellow: '#CA8A04',
  purple: '#7C3AED',
};

interface OverviewAlert {
  label: string;
  n: number;
  key: string;
  dot: string;
}

/** Overview tab: port of v4 renderOverview(). */
@Component({
  selector: 'app-cmhc-overview',
  standalone: true,
  templateUrl: './cmhc-overview.component.html',
})
export class CmhcOverviewComponent {
  private readonly dataService = inject(CmhcDataService);
  private readonly router = inject(Router);

  readonly data = this.dataService.data;
  /** v4's formatters, used as-is so numbers render exactly as before. */
  readonly e = computed(() => this.dataService.engine());

  readonly team = computed<CmhcData>(() => this.data()?.team);

  readonly alerts = computed<OverviewAlert[]>(() => {
    const engine = this.e();
    const deals: CmhcDeal[] = this.data()?.deals ?? [];
    const count = (flag: string) => deals.filter((d) => d.flags && d.flags.indexOf(flag) !== -1).length;
    const meta = engine.FLAG_META;
    const alerts = [
      { label: 'Pool Risk', n: count('pool_risk'), key: 'pool_risk' },
      { label: 'Site Visit Outstanding', n: count('site'), key: 'site' },
      { label: 'Stale File', n: count('stale'), key: 'stale' },
      { label: 'Funding Date Passed (Overdue)', n: count('old_funding'), key: 'old_funding' },
    ];
    return alerts
      .map((a) => ({ ...a, dot: ALERT_DOT[(meta[a.key] || {}).color] || '#8A95B0' }))
      .filter((a) => a.n > 0 && (meta[a.key] || {}).color !== 'purple');
  });

  /** Pools whose month has not started yet, soonest four. */
  readonly pools = computed<CmhcDeal[]>(() =>
    (this.data()?.pools ?? [])
      .filter((p: CmhcDeal) => p.displayDays >= 0)
      .slice()
      .sort((a: CmhcDeal, b: CmhcDeal) => a.displayDays - b.displayDays)
      .slice(0, 4),
  );

  readonly moves = computed<CmhcData>(() => this.data()?.poolMoves || { byPool: {} });

  readonly moveLabel = computed(() => {
    const week = this.moves().week;
    return week ? 'Since ' + this.e().fmtDateShort(week) : 'Since baseline';
  });

  poolRiskPct(p: CmhcDeal): number {
    return p.vol > 0 ? p.atRisk / p.vol : 0;
  }

  poolClass(p: CmhcDeal): string {
    const rp = this.poolRiskPct(p);
    if (p.cutoffDays < 0) return 'urgent';
    if (p.cutoffDays < 35 || rp > 0.5) return 'urgent';
    if (p.cutoffDays < 75 || rp > 0.2) return 'tight';
    return '';
  }

  countdownStyle(p: CmhcDeal): string {
    if (p.cutoffDays < 0) return 'background:var(--red);color:#fff';
    if (p.cutoffDays < 35) return 'background:var(--red-bg);color:var(--red)';
    if (p.cutoffDays < 75) return 'background:var(--amber-bg);color:var(--amber)';
    return 'background:var(--surface);color:var(--text-2)';
  }

  poolMove(p: CmhcDeal): CmhcData {
    return this.e().poolMoveText(this.moves().byPool[p.pool]);
  }

  plural(n: number): string {
    return n !== 1 ? 's' : '';
  }

  openAlert(key: string): void {
    this.dataService.openList(this.alertPopup(key));
  }

  openMove(pool: string, event: Event): void {
    event.stopPropagation();
    this.dataService.openList({ kind: 'move', pool });
  }

  openFunded(pool: string, event: Event): void {
    event.stopPropagation();
    this.dataService.openList({ kind: 'funded', pool });
  }

  openPool(pool: string): void {
    const i = (this.data()?.poolPeople ?? []).findIndex((x: CmhcDeal) => x.name === pool);
    if (i >= 0) this.openPerson('pool', i);
  }

  openPerson(type: string, index: number): void {
    this.dataService.curPerson.update((cur) => ({ ...cur, [type]: index }));
    void this.router.navigate(['/cmhc-dashboard', PERSON_ROUTES[type]]);
  }

  /** Port of v4 openAlertModal(): which deals, title and subtitle each alert opens. */
  private alertPopup(key: string) {
    const deals: CmhcDeal[] = this.data()?.deals ?? [];
    const has = (d: CmhcDeal, ...flags: string[]) =>
      !!d.flags && flags.some((f) => d.flags.indexOf(f) !== -1);
    const byDtf = (a: CmhcDeal, b: CmhcDeal, fallback = 9999) =>
      (a.dtf ?? fallback) - (b.dtf ?? fallback);
    const s = (n: number) => (n !== 1 ? 's' : '');
    let list: CmhcDeal[] = [];
    let name = '';
    let sub = '';

    switch (key) {
      case 'old_funding':
        list = deals.filter((d) => has(d, 'old_funding')).sort((a, b) => (a.dtf || 0) - (b.dtf || 0));
        name = 'Funding Date Already Passed';
        sub = `${list.length} file${s(list.length)} whose recorded funding date is in the past and have not funded`;
        break;
      case 'coi':
        list = deals.filter((d) => has(d, 'coi_expired', 'coi_declined')).sort((a, b) => byDtf(a, b));
        name = 'COI Expired or Declined';
        sub = `${list.length} file${s(list.length)} with COI issues requiring action`;
        break;
      case 'site':
        list = deals.filter((d) => has(d, 'site')).sort((a, b) => (a.dtf || 9999) - (b.dtf || 9999));
        name = 'Site Visit Outstanding';
        sub = `${list.length} committed or rate-locked file${s(list.length)} with no site visit recorded`;
        break;
      case 'pool':
        list = deals.filter((d) => has(d, 'pool')).sort((a, b) => (a.dtf || 9999) - (b.dtf || 9999));
        name = 'At Risk of Missing Pool Cutoff';
        sub = `${list.length} file${s(list.length)} whose funding date exceeds their assigned pool cutoff`;
        break;
      case 'pool_risk':
        list = deals
          .filter((d) => has(d, 'pool_risk'))
          .sort((a, b) => (a.cutoffDays == null ? 9999 : a.cutoffDays) - (b.cutoffDays == null ? 9999 : b.cutoffDays));
        name = 'Pool Risk';
        sub = `${list.length} file${s(list.length)} (COIP Preparing/Applied/blank) whose assigned pool cutoff is within 45 days`;
        break;
      case 'stale':
        list = deals.filter((d) => has(d, 'stale')).sort((a, b) => (a.dtf || 9999) - (b.dtf || 9999));
        name = 'Stale Files';
        sub = `${list.length} Quote Accepted file${s(list.length)} whose Quote Accepted Date is more than 180 days old`;
        break;
      case 'bad_address':
        list = deals
          .filter((d) => has(d, 'bad_address'))
          .sort((a, b) => (a.underwriter || '').localeCompare(b.underwriter || ''));
        name = 'Address Formatting Issues';
        sub = `${list.length} deal${s(list.length)} with missing province, unabbreviated province, or missing city`;
        break;
    }
    return { kind: 'deals' as const, name, sub, deals: list, showOrig: true };
  }
}
