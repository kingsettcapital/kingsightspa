import { Component, computed, HostListener, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { CmhcData, CmhcDeal } from '../cmhc-dashboard.models';
import { CmhcDataService } from '../cmhc-data.service';

export type CmhcPersonType = 'uw' | 'orig' | 'rev' | 'pool';

/** v4 PEOPLE_CFG: which array of the report model each view lists and which deal field it filters on. */
const PEOPLE_CFG: Record<CmhcPersonType, { arr: string; field: string; label: string }> = {
  uw: { arr: 'underwriters', field: 'underwriter', label: 'underwriters' },
  orig: { arr: 'originators', field: 'originator', label: 'originators' },
  rev: { arr: 'reviewers', field: 'reviewer', label: 'reviewers' },
  pool: { arr: 'poolPeople', field: 'cmb', label: 'pools' },
};

const STAGES = ['COIP', 'Submitted', 'CCS', 'Funding'] as const;

interface DealRowVm {
  deal: CmhcDeal;
  index: number;
  rowClass: string;
  day: string | number;
  mon: string;
  dtfStyle: string | null;
  status: string;
  statusClass: string;
  stage: string;
  sub2: string;
  construction: boolean;
  flags: string[];
}

interface MonthGroup {
  title: string;
  count: number;
  rows: DealRowVm[];
}

/**
 * Underwriter / Originator / Reviewer / Pools tabs: port of v4 renderPerson(), dealRow(), renderPicks(),
 * prevPerson()/nextPerson() and the stage filter. One component, picked per route by `data.type`.
 */
@Component({
  selector: 'app-cmhc-person-view',
  standalone: true,
  templateUrl: './cmhc-person-view.component.html',
})
export class CmhcPersonViewComponent {
  private readonly dataService = inject(CmhcDataService);

  readonly type = inject(ActivatedRoute).snapshot.data['type'] as CmhcPersonType;
  private readonly cfg = PEOPLE_CFG[this.type];

  readonly data = this.dataService.data;
  readonly e = computed(() => this.dataService.engine());
  readonly stages = STAGES;

  readonly people = computed<CmhcData[]>(() => this.data()?.[this.cfg.arr] ?? []);
  readonly emptyLabel = this.cfg.label;

  readonly current = computed(() =>
    Math.min(this.dataService.curPerson()[this.type] ?? 0, Math.max(this.people().length - 1, 0)),
  );
  readonly person = computed<CmhcData | null>(() => this.people()[this.current()] ?? null);

  readonly stageSel = computed(() => this.dataService.stageFilter()[this.type] ?? []);

  /** This person's deals, soonest funding date first, undated last. */
  readonly deals = computed<CmhcDeal[]>(() => {
    const p = this.person();
    const all: CmhcDeal[] = this.data()?.deals ?? [];
    if (!p) return [];
    const f = this.cfg.field;
    const own = p.name === 'Unassigned' ? all.filter((d) => !d[f]) : all.filter((d) => d[f] === p.name);
    return own.slice().sort((a, b) => {
      if (a.fundDate && !b.fundDate) return -1;
      if (!a.fundDate && b.fundDate) return 1;
      if (a.fundDate && b.fundDate) return a.fundDate < b.fundDate ? -1 : 1;
      return 0;
    });
  });

  private stageOf(d: CmhcDeal): string {
    if (this.e().isCommitted(d)) return 'Funding';
    if (d.coip === 'Approved') return 'CCS';
    if (d.coip === 'Applied') return 'Submitted';
    return 'COIP';
  }

  readonly stageCounts = computed(() => {
    const counts: Record<string, number> = { COIP: 0, Submitted: 0, CCS: 0, Funding: 0 };
    this.deals().forEach((d) => counts[this.stageOf(d)]++);
    return counts;
  });

  readonly next30Vol = computed(() =>
    this.deals()
      .filter((d) => d.dtf != null && d.dtf >= 0 && d.dtf <= 30)
      .reduce((s, d) => s + (d.loan || 0), 0),
  );

  readonly activeCount = computed(() => {
    const c = this.stageCounts();
    return c['COIP'] + c['CCS'] + c['Funding'];
  });

  /** Pools header: movement since the baseline week. */
  readonly poolMove = computed<CmhcData | null>(() => {
    const p = this.person();
    if (this.type !== 'pool' || !p) return null;
    return this.e().poolMoveText(this.data()?.poolMoves?.byPool?.[p.name]);
  });

  readonly poolMoveLabel = computed(() => {
    const week = this.data()?.poolMoves?.week;
    return week ? 'Since ' + this.e().fmtDateShort(week) : 'Since baseline';
  });

  /** Pools tab "movement measured since" picker. */
  readonly weekPick = computed(() => {
    this.data();
    const engine = this.e();
    if (this.type !== 'pool' || !engine) return null;
    const opts: string[] = engine.poolWeekOptions();
    if (opts.length < 2) return null;
    const asOf = this.dataService.asOf();
    const thisWk = engine.mondayOfWeek(asOf);
    const cur = engine.activeBaselineWeek(asOf);
    const def = engine.defaultBaselineWeek(asOf);
    return opts.map((w) => ({
      value: w,
      selected: w === cur,
      label: engine.fmtDate(w) + (w === thisWk ? ' · this week' : w === def ? ' · last week' : ''),
    }));
  });

  readonly groups = computed<MonthGroup[]>(() => {
    const engine = this.e();
    const sel = this.stageSel();
    const shown = sel.length ? this.deals().filter((d) => sel.includes(this.stageOf(d))) : this.deals();
    const monthOf = (d: CmhcDeal) => {
      if (!d.fundDate) return 'No funding date';
      const dt = new Date(d.fundDate + 'T00:00:00');
      return engine.MONTHS[dt.getMonth()] + ' ' + dt.getFullYear();
    };
    const groups: MonthGroup[] = [];
    shown.forEach((d) => {
      const title = monthOf(d);
      let g = groups[groups.length - 1];
      if (!g || g.title !== title) {
        g = { title, count: 0, rows: [] };
        groups.push(g);
      }
      g.count++;
      g.rows.push(this.rowVm(d));
    });
    return groups;
  });

  private rowVm(d: CmhcDeal): DealRowVm {
    const engine = this.e();
    const flags: string[] = engine.dealFlags(d);
    const urgent = flags.includes('old_funding') || flags.includes('early');
    let day: string | number = '—';
    let mon = '';
    if (d.fundDate) {
      const dt = new Date(d.fundDate + 'T00:00:00');
      day = dt.getDate();
      mon = engine.MONTHS[dt.getMonth()];
    }
    let dtfStyle: string | null = null;
    if (d.dtf != null) {
      dtfStyle =
        d.dtf < 0
          ? 'background:var(--red);color:#fff'
          : d.dtf <= 7
            ? 'background:var(--red-bg);color:var(--red)'
            : d.dtf <= 14
              ? 'background:var(--amber-bg);color:var(--amber)'
              : 'background:var(--surface);color:var(--text-3)';
    }
    const ab = (n: string) => engine.abbrevName(n);
    const has = (n: string | null | undefined) => !!n && n !== 'nan';
    let sub2 = '';
    if (this.type === 'orig') {
      sub2 = (d.underwriter ? ' · ' + ab(d.underwriter) : '') + (has(d.reviewer) ? ' · ' + ab(d.reviewer) : '');
    } else if (this.type === 'rev') {
      sub2 = (d.originator ? ' · ' + ab(d.originator) : '') + (d.underwriter ? ' · ' + ab(d.underwriter) : '');
    } else {
      sub2 = (d.originator ? ' · ' + ab(d.originator) : '') + (has(d.reviewer) ? ' · ' + ab(d.reviewer) : '');
    }
    return {
      deal: d,
      index: (this.data()?.deals as CmhcDeal[]).indexOf(d),
      rowClass: urgent ? 'urgent' : flags.length ? 'flagged' : '',
      day,
      mon,
      dtfStyle,
      status: d.status,
      statusClass: engine.STATUS_CLS[d.status] || 'sb-qa',
      stage: this.stageOf(d),
      sub2,
      construction: !!engine.isConstruction(d),
      flags,
    };
  }

  chipLabel(p: CmhcData): string {
    return this.type === 'pool' ? p.name : String(p.name).split(' ')[0];
  }

  flagMeta(flag: string): CmhcData {
    return this.e().FLAG_META[flag];
  }

  flagTitle(flag: string): string {
    const e = this.e();
    return e.LEGEND_DESC[flag] || (e.FLAG_META[flag] || {}).desc || '';
  }

  select(index: number): void {
    this.dataService.curPerson.update((cur) => ({ ...cur, [this.type]: index }));
  }

  step(delta: number): void {
    const n = this.people().length;
    if (n) this.select((this.current() + delta + n) % n);
  }

  toggleStage(stage: string): void {
    this.dataService.toggleStage(this.type, stage);
  }

  setWeek(value: string): void {
    this.dataService.setPoolWeek(value);
  }

  openDeal(index: number): void {
    this.dataService.openDeal(index);
  }

  openMove(pool: string): void {
    this.dataService.openList({ kind: 'move', pool });
  }

  openFunded(pool: string): void {
    this.dataService.openList({ kind: 'funded', pool });
  }

  goToFlagLegend(event: Event): void {
    event.stopPropagation();
    this.dataService.goToFlagLegend();
  }

  plural(n: number): string {
    return n !== 1 ? 's' : '';
  }

  /** Left/right arrows move between people unless a popup is open. */
  @HostListener('document:keydown', ['$event'])
  onKey(event: KeyboardEvent): void {
    if (this.dataService.dealPopup() != null || this.dataService.listPopup()) return;
    if (event.key === 'ArrowRight') this.step(1);
    if (event.key === 'ArrowLeft') this.step(-1);
  }
}
