import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';

import { CmhcData, CmhcDeal } from '../cmhc-dashboard.models';
import { CmhcDataService } from '../cmhc-data.service';
import { xlsxDate, xlsxHeader, xlsxLink, xlsxSheet } from '../cmhc-xlsx.util';

type Role = 'uw' | 'orig';

interface Chip {
  value: string;
  label: string;
  count: string;
  dim?: boolean;
  title?: string;
}

interface BoardRow {
  who: string;
  n: number;
  medText: string;
  meanText: string;
  slow: boolean;
  width: number;
}

interface Board {
  title: string;
  role: Role;
  empty: boolean;
  rows: BoardRow[];
  hidden: string[];
  summary: string;
}

interface ChartBar {
  zero: boolean;
  label: string | number;
  height: number;
  fundedHeight: number;
  funded: number;
  projected: number;
  fundedTitle: string;
  projectedTitle: string;
}

interface Chart {
  empty: boolean;
  trimmed: number;
  cols: string;
  bars: ChartBar[];
  points: string;
  dots: { left: string; top: string }[];
  xlabels: { month: string; weeks: string }[];
}

interface YearSection {
  heading: string;
  sub: string;
  chart: Chart;
  top: boolean;
}

const PURPOSE_LABELS: Record<string, string> = {
  'Construction Financing': 'Construction',
  'Completion Take-out': 'Take-Out',
};

/** Timelines tab: port of v4 renderTimelines() and its drill-ins; the numbers come from v4's own functions. */
@Component({
  selector: 'app-cmhc-timelines',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './cmhc-timelines.component.html',
})
export class CmhcTimelinesComponent {
  private readonly dataService = inject(CmhcDataService);

  readonly e = computed(() => this.dataService.engine());
  readonly tl = this.dataService.tl;
  readonly notice = this.dataService.histNotice;
  readonly exporting = signal(false);
  /** The hidden-people strip stays open across re-renders until closed (v4 TL_FOOT_OPEN). */
  readonly footOpen = signal<Record<Role, boolean>>({ uw: false, orig: false });

  readonly m = computed(() => {
    this.dataService.data();
    this.dataService.tlHiddenRev();
    const tl = this.tl();
    const e = this.e();

    let allFunded: CmhcDeal[] = e.tlFundedLoans();
    let allActive: CmhcDeal[] = e.tlActiveLoans();
    const badDates = allFunded.filter((o) => o.bad).length + allActive.filter((o) => o.bad).length;
    allFunded = allFunded.filter((o) => !o.bad);
    allActive = allActive.filter((o) => !o.bad);
    const backCount = e.tlApplyFilters(allFunded).filter((o: CmhcDeal) => o.baseline).length;
    if (tl.back === 'excl') allFunded = allFunded.filter((o) => !o.baseline);
    const funded: CmhcDeal[] = e.tlApplyFilters(allFunded);
    const active: CmhcDeal[] = e.tlApplyFilters(allActive);

    // Chips keep a fixed identity and order (from the unfiltered pool); only their counts are cross-filtered.
    const pool = allFunded.concat(allActive);
    const provTotal: Record<string, number> = {};
    const purposeTotal: Record<string, number> = {};
    const yearTotal: Record<string, number> = {};
    pool.forEach((o) => {
      provTotal[o.prov] = (provTotal[o.prov] || 0) + 1;
      purposeTotal[o.purpose] = (purposeTotal[o.purpose] || 0) + 1;
      if (o.fund) {
        const y = o.fund.slice(0, 4);
        yearTotal[y] = (yearTotal[y] || 0) + 1;
      }
    });
    const purposeCounts: Record<string, number> = {};
    const provCounts: Record<string, number> = {};
    const yearCounts: Record<string, number> = {};
    e.tlApplyFilters(pool, 'purpose').forEach((o: CmhcDeal) => (purposeCounts[o.purpose] = (purposeCounts[o.purpose] || 0) + 1));
    e.tlApplyFilters(pool, 'prov').forEach((o: CmhcDeal) => (provCounts[o.prov] = (provCounts[o.prov] || 0) + 1));
    e.tlApplyFilters(pool, 'year').forEach((o: CmhcDeal) => {
      if (o.fund) {
        const y = o.fund.slice(0, 4);
        yearCounts[y] = (yearCounts[y] || 0) + 1;
      }
    });
    const fundYears = Object.keys(yearTotal).sort().reverse();
    const provs = Object.keys(provTotal).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return provTotal[b] - provTotal[a];
    });
    const purposes = Object.keys(purposeTotal).sort((a, b) => {
      if (a === 'Unspecified') return 1;
      if (b === 'Unspecified') return -1;
      return purposeTotal[b] - purposeTotal[a];
    });
    const onlyUnspecified = purposes.length === 1 && purposes[0] === 'Unspecified';

    const purposeChips: Chip[] = purposes.map((p) =>
      onlyUnspecified
        ? {
            value: p,
            label: 'Unspecified',
            count: String(purposeCounts[p] || 0),
            dim: true,
            title: 'No CMHC Application Purpose column in the current export',
          }
        : {
            value: p,
            label: PURPOSE_LABELS[p] || p,
            count: p === 'Construction Financing' ? '' : String(purposeCounts[p] || 0),
          },
    );
    const provChips: Chip[] = provs.map((p) => ({ value: p, label: p, count: String(provCounts[p] || 0) }));
    const yearChips: Chip[] = fundYears.map((y) => ({ value: y, label: y, count: String(yearCounts[y] || 0) }));

    const nums = (list: CmhcDeal[], k: string) => list.map((o) => o[k]).filter((v) => v != null) as number[];
    const fDays = nums(funded, 'days');
    const fSlip = nums(funded, 'slip');
    const aDays = nums(active, 'days');
    const aSlip = nums(active, 'slip');
    const fMed = e.tlMedian(fDays);
    const fMean = e.tlMean(fDays);
    const aMed = e.tlMedian(aDays);
    const aMean = e.tlMean(aDays);
    const sMed = e.tlMedian(fSlip);
    const aSlipMed = e.tlMedian(aSlip);

    const hist = e.HIST;
    const loanCount = hist?.loans ? Object.keys(hist.loans).length : 0;
    const snapCount = hist?.snapshots ? hist.snapshots.length : 0;
    let pendingOrig = 0;
    if (hist?.loans) Object.keys(hist.loans).forEach((k) => !hist.loans[k].origFund && pendingOrig++);

    const rows = tl.mode === 'funded' ? funded : active;
    const metric = tl.view === 'slip' ? 'slip' : 'days';
    const teamMed = tl.view === 'slip' ? (tl.mode === 'funded' ? sMed : aSlipMed) : tl.mode === 'funded' ? fMed : aMed;
    const modeLabel = tl.mode === 'funded' ? 'funded' : 'active';

    const subText =
      tl.view === 'slip'
        ? `Ranked by ${modeLabel} file count · median and mean slippage in weeks vs. each loan’s historical first funding date · ▲ marks a median worse than the ${teamMed == null ? 'team' : e.tlWk(teamMed) + '-week team'} median`
        : tl.mode === 'funded'
          ? `Ranked by funded file count · median and mean weeks from quote accepted to funded · ▲ marks a median slower than the ${fMed == null ? 'team' : e.tlWk(fMed) + '-week team'} median`
          : `Ranked by active file count · median and mean projected weeks, quote accepted to target funding date · ▲ marks a median slower than the ${aMed == null ? 'team' : e.tlWk(aMed) + '-week team'} median`;

    const boards: Board[] = [
      this.board('Underwriter', 'uw', e.tlGroup(rows, 'uw', metric), teamMed, modeLabel),
      this.board('Originator', 'orig', e.tlGroup(rows, 'orig', metric), teamMed, modeLabel),
    ];

    // Charts
    const asOfD = new Date((this.dataService.asOf() || e.todayISO()) + 'T00:00:00');
    const thisYear = String(asOfD.getFullYear());
    const years: Record<string, boolean> = {};
    funded.concat(active).forEach((o) => o.fund && (years[o.fund.slice(0, 4)] = true));
    const nextYear = String(asOfD.getFullYear() + 1);
    const plural = (n: number) => (n === 1 ? '' : 's');
    const yearSection = (y: string, note: string, top = false): YearSection => {
      const yf = funded.filter((o) => o.fund && o.fund.slice(0, 4) === y);
      const ya = active.filter((o) => o.fund && o.fund.slice(0, 4) === y);
      const tot = yf.length + ya.length;
      return {
        heading: y + note,
        sub: `${tot} file${plural(tot)} · scaled to this year’s own peak month`,
        chart: this.chart(yf, ya, y),
        top,
      };
    };
    const sections: YearSection[] = [];
    let ytdLine: string | null = null;
    if (tl.year !== 'All') {
      sections.push(yearSection(tl.year, tl.year > thisYear ? ' · projected' : ''));
    } else {
      if (asOfD.getMonth() === 11 && years[nextYear]) sections.push(yearSection(nextYear, ' · projected', true));
      const ytdF = funded.filter((o) => o.fund && o.fund.slice(0, 4) === thisYear).length;
      const ytdA = active.filter((o) => o.fund && o.fund.slice(0, 4) === thisYear).length;
      ytdLine = `${ytdF} funded YTD · ${ytdA} remaining · ${ytdF + ytdA} projected total`;
      const floorYear = String(asOfD.getFullYear() - 2);
      const prior = Object.keys(years)
        .filter((y) => y < thisYear && y >= floorYear)
        .sort()
        .reverse()
        .map((y) => yearSection(y, ''));
      sections.push(...prior);
    }
    const shownBaseline = funded.filter((o) => o.baseline).length;

    return {
      purposeChips,
      provChips,
      yearChips,
      backCount,
      fMed,
      fMean,
      aMed,
      aMean,
      sMed,
      aSlipMed,
      fDaysN: fDays.length,
      fSlipN: fSlip.length,
      aDaysN: aDays.length,
      aSlipN: aSlip.length,
      loanCount,
      snapCount,
      baselineCount: backCount,
      pendingOrig,
      badDates,
      subText,
      boards,
      sections,
      ytdLine,
      thisYear,
      ytdChart: tl.year === 'All' ? this.chart(funded, active, thisYear) : null,
      shownBaseline,
    };
  });

  // ---- view-model builders (ports of tlBoardHtml / tlChartHtml) ----

  private board(title: string, role: Role, groups: CmhcData[], teamMed: number | null, modeLabel: string): Board {
    const e = this.e();
    const view = this.tl().view;
    const hiddenHere = groups.filter((r) => e.tlIsHidden(role, r.who)).map((r) => r.who as string);
    const rows = groups.filter((r) => !e.tlIsHidden(role, r.who));
    if (!rows.length) return { title, role, empty: true, rows: [], hidden: hiddenHere, summary: modeLabel };
    const maxMed = Math.max(...rows.map((r) => r.med || 0)) || 1;
    const totalFiles = rows.reduce((s, r) => s + r.n, 0);
    const sign = (v: number) => (view === 'slip' && v > 0 ? '+' : '');
    return {
      title,
      role,
      empty: false,
      hidden: hiddenHere,
      summary: `${rows.length} ${rows.length === 1 ? 'person' : 'people'} · ${totalFiles} file${totalFiles === 1 ? '' : 's'}`,
      rows: rows.map((r) => ({
        who: r.who,
        n: r.n,
        medText: r.med == null ? '—' : sign(r.med) + e.tlWk(r.med),
        meanText: r.mean == null ? '—' : sign(r.mean) + e.tlWk(r.mean),
        slow: teamMed != null && r.med != null && r.med > teamMed,
        width: Math.max(4, Math.round(((r.med || 0) / maxMed) * 100)),
      })),
    };
  }

  private chart(funded: CmhcDeal[], active: CmhcDeal[], year: string | null): Chart {
    const e = this.e();
    const months: Record<string, { f: number; a: number; days: number[] }> = {};
    let order: string[] = [];
    const add = (m: string, key: 'f' | 'a', days: number | null) => {
      if (!months[m]) {
        months[m] = { f: 0, a: 0, days: [] };
        order.push(m);
      }
      months[m][key]++;
      if (days != null) months[m].days.push(days);
    };
    if (year) {
      for (let mm = 1; mm <= 12; mm++) {
        const mk = year + '-' + String(mm).padStart(2, '0');
        months[mk] = { f: 0, a: 0, days: [] };
        order.push(mk);
      }
    }
    const inYear = (o: CmhcDeal) => !year || (o.fund && o.fund.slice(0, 4) === String(year));
    funded.forEach((o) => o.fund && inYear(o) && add(o.fund.slice(0, 7), 'f', o.days));
    active.forEach((o) => o.fund && inYear(o) && add(o.fund.slice(0, 7), 'a', o.days));
    order.sort();
    // A back book can span years; keep the most recent 18 months so every projected month stays in view.
    let trimmed = 0;
    if (!year && order.length > 18) {
      trimmed = order.length - 18;
      order = order.slice(trimmed);
    }
    if (!order.length) return { empty: true, trimmed: 0, cols: '', bars: [], points: '', dots: [], xlabels: [] };

    const maxN = Math.max(...order.map((m) => months[m].f + months[m].a)) || 1;
    const meds: (number | null)[] = order.map((m) => e.tlMedian(months[m].days));
    const maxMed = Math.max(...meds.map((v) => Math.max(0, v || 0))) || 1;
    const n = order.length;
    const xPct = (i: number) => ((i + 0.5) / n) * 100;
    const yPct = (v: number) => 88 - (Math.max(0, v || 0) / maxMed) * 76;
    const pts: string[] = [];
    const dots: { left: string; top: string }[] = [];
    meds.forEach((v, i) => {
      if (v == null) return;
      pts.push(xPct(i).toFixed(2) + ',' + yPct(v).toFixed(2));
      dots.push({ left: xPct(i).toFixed(2) + '%', top: yPct(v).toFixed(2) + '%' });
    });
    const lo = (k: number) => (k === 1 ? '1 loan' : k + ' loans');
    const bars: ChartBar[] = order.map((m) => {
      const mo = months[m];
      const tot = mo.f + mo.a;
      if (!tot) {
        return { zero: true, label: 0, height: 0, fundedHeight: 0, funded: 0, projected: 0, fundedTitle: '', projectedTitle: '' };
      }
      let h = Math.max(3, Math.round((tot / maxN) * 88));
      let fh = Math.round((mo.f / tot) * 100);
      // The projected-count label needs real pixel room: grow the bar and shrink the funded share to fit it.
      if (mo.a) {
        const MIN_PX = 18;
        h = Math.max(h, Math.ceil(MIN_PX / 1.9));
        const barPx = h * 1.9;
        const maxFh = 100 - (MIN_PX / barPx) * 100;
        fh = Math.min(fh, Math.max(0, maxFh));
      }
      const md = new Date(m + '-01T00:00:00');
      const ml = e.MONTHS[md.getMonth()] + ' ' + md.getFullYear();
      return {
        zero: false,
        label: mo.a ? mo.f : tot,
        height: h,
        fundedHeight: fh,
        funded: mo.f,
        projected: mo.a,
        fundedTitle: `${ml} — Funded: ${lo(mo.f)}`,
        projectedTitle: `${ml} — Projected to fund: ${lo(mo.a)}`,
      };
    });
    return {
      empty: false,
      trimmed,
      cols: `repeat(${n},minmax(0,1fr))`,
      bars,
      points: pts.join(' '),
      dots,
      xlabels: order.map((m, i) => {
        const d = new Date(m + '-01T00:00:00');
        return {
          month: e.MONTHS[d.getMonth()].slice(0, 3) + ' ' + String(d.getFullYear()).slice(2),
          weeks: meds[i] == null ? '—' : e.tlWk(meds[i]) + 'w',
        };
      }),
    };
  }

  // ---- actions ----

  set(patch: Parameters<CmhcDataService['setTl']>[0]): void {
    this.dataService.setTl(patch);
  }

  hide(role: Role, who: string, event: Event): void {
    event.stopPropagation();
    this.dataService.setTlHidden(role, who, true);
  }

  unhide(role: Role, who: string): void {
    this.dataService.setTlHidden(role, who, false);
  }

  toggleFoot(role: Role, open: boolean): void {
    this.footOpen.update((cur) => ({ ...cur, [role]: open }));
  }

  openHistory(kind: string, label: string): void {
    const list: CmhcDeal[] = this.e().tlHistList(kind);
    if (!list.length) return;
    this.dataService.openList({
      kind: 'tl',
      label,
      sub: `${list.length} loan${list.length === 1 ? '' : 's'} · files still in the pipeline open on click`,
      list,
    });
  }

  openPerson(role: Role, who: string, title: string): void {
    const e = this.e();
    const tl = this.tl();
    const metric = tl.view === 'slip' ? 'slip' : 'days';
    const list: CmhcDeal[] = e
      .tlCurrentRows()
      .filter((o: CmhcDeal) => (o[role] || 'Unassigned') === who && o[metric] != null)
      .sort((a: CmhcDeal, b: CmhcDeal) => (b.fund || '').localeCompare(a.fund || ''));
    if (!list.length) return;
    const vals: number[] = list.map((o) => o[metric]);
    const modeWord = tl.mode === 'funded' ? 'funded' : 'active';
    this.dataService.openList({
      kind: 'tl',
      label: who,
      sub:
        `${title} · ${list.length} ${modeWord} file${list.length === 1 ? '' : 's'}` +
        ` · median ${e.tlWk(e.tlMedian(vals))} wks, mean ${e.tlWk(e.tlMean(vals))} wks`,
      list,
    });
  }

  /** Port of v4 exportTlLeaderboardXlsx(): Time to Fund and Slippage sheets for the files in view. */
  async exportToExcel(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    try {
      const e = this.e();
      const fundRows: unknown[][] = e.tlExportRows('days');
      const slipRows: unknown[][] = e.tlExportRows('slip');
      if (!fundRows.length && !slipRows.length) {
        alert('No files match the current filters, so there is nothing to export.');
        return;
      }
      const XLSX = await import('xlsx-js-style');
      const cell = (v: unknown) => {
        const o = v as { t?: string; u?: string | null; d?: string } | string;
        if (o && typeof o === 'object') return o.d != null ? xlsxDate(o.d) : xlsxLink(o.t ?? '', o.u);
        return o;
      };
      const headers = [
        'File',
        'Original Funding Date',
        'Original Date Source File',
        'Current Funding Date',
        'Current Date Source File',
        'Funder',
        'Underwriter',
        'Originator',
      ];
      const widths = [44, 20, 40, 20, 40, 22, 22, 22];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        wb,
        xlsxSheet(XLSX, [xlsxHeader(headers), ...fundRows.map((r) => r.map(cell))], widths),
        'Time to Fund',
      );
      XLSX.utils.book_append_sheet(
        wb,
        xlsxSheet(XLSX, [xlsxHeader(headers), ...slipRows.map((r) => r.map(cell))], widths),
        'Slippage',
      );
      const modeWord = this.tl().mode === 'funded' ? 'Funded' : 'Active';
      XLSX.writeFile(wb, `CMHC Leaderboard - ${modeWord} - ${this.dataService.asOf()}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Could not build the Excel file.');
    } finally {
      this.exporting.set(false);
    }
  }

  dismissNotice(): void {
    this.dataService.dismissHistNotice();
  }

  plural(n: number): string {
    return n === 1 ? '' : 's';
  }
}
