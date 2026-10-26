import { Component, computed, HostListener, inject, OnInit, signal } from '@angular/core';

import { CmhcData, CmhcDeal } from '../cmhc-dashboard.models';
import { CmhcDataService } from '../cmhc-data.service';

const ROLE = 'underwriter';

interface Slider {
  label: string;
  path: string;
  val: number;
  locked: boolean;
  moved: boolean;
  flash: boolean;
  tip: string;
}

interface WeightSection {
  title: string;
  note: string;
  collapsedNote?: boolean;
  stage?: { label: string; bg: string };
  sliders: Slider[];
}

interface Seg {
  proposed: boolean;
  width: number;
  color: string;
  title: string;
}

interface Row {
  name: string;
  label: string;
  tag: 'away' | 'over' | 'under' | '';
  meta: string;
  metaTitle: string;
  segs: Seg[];
  medianLeft: number;
  overLeft: number | null;
  scoreColor: string;
  score: string;
  draft: { text: string; color: string } | null;
  allScore: string;
  allCount: number;
  allTitle: string;
  open: boolean;
  files: FileVm[];
}

interface FileVm {
  deal: CmhcDeal;
  index: number;
  stage: { label: string; bg: string; fg: string };
  breakdown: string;
  score: string;
  proposed: boolean;
}

interface ToAllocateVm {
  deal: CmhcDeal;
  index: number;
  day: string | number;
  mon: string;
  stage: { label: string; bg: string; fg: string };
  breakdown: string;
  score: string;
  key: string;
}

interface CalCell {
  off: boolean;
  day?: number;
  today?: boolean;
  past?: boolean;
  done?: { n: number; vol: number };
  chips?: { index: number; name: string; loan: number; score: string; bg: string; fg: string; title: string; proposed: boolean }[];
}

/** Capacity tab (v4 "Allocations"): workload scoring, to-allocate list, funding calendar, weights and languages. */
@Component({
  selector: 'app-cmhc-capacity',
  standalone: true,
  templateUrl: './cmhc-capacity.component.html',
})
export class CmhcCapacityComponent implements OnInit {
  private readonly dataService = inject(CmhcDataService);

  readonly e = computed(() => this.dataService.engine());

  readonly sub = signal<'workload' | 'calendar'>('workload');
  readonly panel = signal(false);
  readonly langPanel = signal(false);
  readonly calMonth = signal<string | null>(null);
  readonly open = signal<string | null>(null);
  readonly testOpen = signal(false);
  readonly lastChg = signal<string | null>(null);
  /** Bumped whenever settings inside the engine change, so the computed views refresh. */
  private readonly rev = signal(0);
  readonly test = signal<{ a: CmhcData; b: CmhcData } | null>(null);

  ngOnInit(): void {
    // v4 runs this on every render: a proposal the export has caught up with has nothing left to say.
    this.e().reconcileProposals();
  }

  private touch(): void {
    this.rev.update((n) => n + 1);
  }

  private sig() {
    this.rev();
    this.dataService.data();
    return this.e();
  }

  readonly allStages = computed(() => this.e().ALLOC_STAGES as [string, string, string, string][]);

  private stageDef(st: string): { label: string; bg: string; fg: string } {
    const d = (this.e().ALLOC_STAGES as string[][]).find((s) => s[0] === st) || this.e().ALLOC_STAGES[0];
    return { label: d[1], bg: d[2], fg: d[3] };
  }

  readonly changed = computed<string[]>(() => this.sig().allocChangedPaths());
  readonly proposals = computed<number>(() => this.sig().proposalCount());

  readonly draftDirty = computed(() => {
    const e = this.sig();
    return this.panel() && JSON.stringify(e.allocWDraft()) !== JSON.stringify(e.allocW());
  });

  // ---- workload ----

  readonly totals = computed<CmhcData>(() => this.sig().allocTotals(ROLE));

  readonly rows = computed<Row[]>(() => {
    const e = this.sig();
    const T = this.totals();
    const wd = this.draftDirty() ? e.allocWDraft() : null;
    const openName = this.open();
    const asOf = this.dataService.asOf();
    const deals: CmhcDeal[] = this.dataService.data()?.deals ?? [];
    return (T.rows as CmhcData[]).map((r) => {
      const away = e.isAway(r.name, asOf);
      const over = T.median > 0 && r.total > T.overLine;
      const room = T.median > 0 && r.total < T.roomLine;
      const proposedFiles: CmhcDeal[] = r.files.filter((d: CmhcDeal) => e.allocIsProposed(d, ROLE));
      const actualFiles: CmhcDeal[] = r.files.filter((d: CmhcDeal) => !e.allocIsProposed(d, ROLE));
      const actualByStage: Record<string, number> = { coip: 0, ccs: 0, funding: 0 };
      actualFiles.forEach((d) => (actualByStage[e.allocStage(d) || 'coip'] += e.allocScore(d, r.name, ROLE)));
      const segs: Seg[] = [];
      (e.ALLOC_STAGES as string[][]).forEach((s) => {
        const v = actualByStage[s[0]] || 0;
        if (v) segs.push({ proposed: false, width: (v / T.max) * 100, color: s[2], title: `${s[1]} ${e.fmtScore(v)}` });
        proposedFiles
          .filter((d) => (e.allocStage(d) || 'coip') === s[0])
          .forEach((d) => {
            const sc = e.allocScore(d, r.name, ROLE);
            segs.push({
              proposed: true,
              width: (sc / T.max) * 100,
              color: s[2],
              title: `${d.name || 'Proposed file'} · ${s[1]} · proposed · ${e.fmtScore(sc)}`,
            });
          });
      });
      const draftTotal = wd
        ? e.half(r.files.reduce((sum: number, d: CmhcDeal) => sum + e.allocScore(d, r.name, ROLE, wd), 0))
        : null;
      const files: FileVm[] =
        openName === r.name
          ? (r.files as CmhcDeal[])
              .slice()
              .sort((a, b) => ((a.fundDate || '9') < (b.fundDate || '9') ? -1 : 1))
              .map((d) => ({
                deal: d,
                index: deals.indexOf(d),
                stage: this.stageDef(e.allocStage(d) || 'coip'),
                breakdown: this.breakdownText(e.allocBreakdown(d, r.name, ROLE)),
                score: e.fmtScore(e.allocScore(d, r.name, ROLE)),
                proposed: !!e.allocIsProposed(d, ROLE),
              }))
          : [];
      return {
        name: r.name,
        label: e.abbrevName(r.name),
        tag: away ? 'away' : over ? 'over' : room ? 'under' : '',
        meta: `${r.count} in score · ${r.allCount} file${r.allCount === 1 ? '' : 's'} total`,
        metaTitle: `${r.count} file${r.count === 1 ? '' : 's'} counted in the workload score · ${r.allCount} assigned in total, matching the Underwriter tab`,
        segs,
        medianLeft: T.max ? (T.median / T.max) * 100 : 0,
        overLeft: T.max && T.overLine <= T.max ? (T.overLine / T.max) * 100 : null,
        scoreColor: e.scoreColor(r.total, T.median, T.maxDev, away),
        score: e.fmtScore(r.total),
        draft:
          draftTotal != null && draftTotal !== r.total
            ? { text: '→ ' + e.fmtScore(draftTotal), color: draftTotal > r.total ? '#661910' : '#00529B' }
            : null,
        allScore: e.fmtScore(r.allScore),
        allCount: r.allCount,
        allTitle: `Total score across all ${r.allCount} file${r.allCount === 1 ? '' : 's'} assigned to this person, at any stage`,
        open: openName === r.name,
        files,
      };
    });
  });

  readonly toAllocate = computed<ToAllocateVm[]>(() => {
    const e = this.sig();
    const deals: CmhcDeal[] = this.dataService.data()?.deals ?? [];
    return deals
      .filter((d) => e.inWorkload(d) && !e.allocHolder(d, ROLE))
      .sort((a, b) => {
        if (a.fundDate && !b.fundDate) return -1;
        if (!a.fundDate && b.fundDate) return 1;
        return (a.fundDate || '') < (b.fundDate || '') ? -1 : 1;
      })
      .map((d) => {
        const dt = d.fundDate ? new Date(d.fundDate + 'T00:00:00') : null;
        return {
          deal: d,
          index: deals.indexOf(d),
          day: dt ? dt.getDate() : '—',
          mon: dt ? e.MONTHS[dt.getMonth()] : '',
          stage: this.stageDef(e.allocStage(d) || 'coip'),
          breakdown: this.breakdownText(e.allocBreakdown(d, '', ROLE)),
          score: e.fmtScore(e.allocScore(d, '', ROLE)),
          key: e.allocKey(d),
        };
      });
  });

  readonly toAllocateVol = computed(() => this.toAllocate().reduce((s, x) => s + (x.deal.loan || 0), 0));

  readonly roster = computed<string[]>(() => this.sig().allocRoster(ROLE));

  private breakdownText(b: { l: string; v: number }[]): string {
    const e = this.e();
    return b.map((x) => `${x.l} ${e.fmtW(x.v)}`).join(' · ');
  }

  // ---- calendar ----

  readonly calendar = computed(() => {
    const e = this.sig();
    const ym = this.calMonth() || e.todayISO().slice(0, 7);
    const y = parseInt(ym.slice(0, 4), 10);
    const mo = parseInt(ym.slice(5, 7), 10);
    const today = e.todayISO();
    const data = this.dataService.data();
    const deals: CmhcDeal[] = data?.deals ?? [];
    const byDay: Record<string, CmhcDeal[]> = {};
    deals.forEach((d) => {
      if (!d.fundDate || d.fundDate.slice(0, 7) !== ym) return;
      (byDay[d.fundDate] = byDay[d.fundDate] || []).push(d);
    });
    // Funded files are stripped out of the deals list, so days already past would read empty.
    const doneDay: Record<string, { n: number; vol: number }> = {};
    ((data?.fundedNow ?? []) as CmhcDeal[]).forEach((r) => {
      if (!r.fundDate || r.fundDate.slice(0, 7) !== ym) return;
      const x = (doneDay[r.fundDate] = doneDay[r.fundDate] || { n: 0, vol: 0 });
      x.n++;
      x.vol += r.loan || 0;
    });
    let monthVol = 0;
    let monthN = 0;
    let doneN = 0;
    let doneVol = 0;
    Object.keys(byDay).forEach((k) => byDay[k].forEach((d) => ((monthVol += d.loan || 0), monthN++)));
    Object.keys(doneDay).forEach((k) => ((doneN += doneDay[k].n), (doneVol += doneDay[k].vol)));

    const first = new Date(y, mo - 1, 1);
    const last = new Date(y, mo, 0);
    const cells: CalCell[] = [];
    const lead = (first.getDay() + 6) % 7; // Monday-first grid
    for (let i = 0; i < Math.min(lead, 5); i++) cells.push({ off: true });
    const cur = new Date(first);
    while (cur <= last) {
      const wd = cur.getDay();
      if (wd >= 1 && wd <= 5) {
        const iso = e._iso(cur);
        const list = byDay[iso] || [];
        cells.push({
          off: false,
          day: cur.getDate(),
          today: iso === today,
          past: iso < today && iso !== today,
          done: doneDay[iso],
          chips: list.map((d) => {
            const holder = e.allocHolder(d, ROLE);
            const s = e.allocScore(d, holder, ROLE);
            const b = e.allocBand(s);
            return {
              index: deals.indexOf(d),
              name: d.name || '—',
              loan: d.loan || 0,
              score: e.fmtScore(s),
              bg: b.bg,
              fg: b.fg,
              title: `${holder ? e.abbrevName(holder) : 'Unassigned'} · ${e.allocStage(d) || 'no stage'} · ${e.fmtScore(s)}`,
              proposed: !!e.allocIsProposed(d, ROLE),
            };
          }),
        });
      }
      cur.setDate(cur.getDate() + 1);
    }
    return {
      title: `${e.MONTHS[mo - 1]} ${y}`,
      summary:
        (doneN ? `${doneN} funded · ${e.Mr(doneVol)}${monthN ? ' · ' : ''}` : '') +
        (monthN ? `${monthN} scheduled · ${e.Mr(monthVol)}` : doneN ? '' : 'nothing scheduled'),
      cells,
      legend: [0.5, 1, 2, 4].map((v) => e.allocBand(v)),
    };
  });

  // ---- scoring weights panel ----

  readonly weightSections = computed<WeightSection[]>(() => {
    const e = this.sig();
    const W = e.allocWDraft();
    const saved = e.allocW();
    const last = this.lastChg();
    const slider = (label: string, path: string, value: number): Slider => {
      const locked = !!e.isLocked(path);
      const val = locked ? 0 : value;
      const was = e.getWeightPath(saved, path);
      const moved = !locked && typeof was === 'number' && was !== val;
      return {
        label,
        path,
        val,
        locked,
        moved,
        flash: moved && last === path,
        tip:
          (moved ? `Unsaved — was ${e.fmtW(was)}. ` : '') +
          `Click to ${locked ? 'unlock' : 'lock at 0 (grey out, irrelevant here)'}`,
      };
    };
    const out: WeightSection[] = [];
    out.push({
      title: 'Base',
      note: `Every file starts here, counted once. Characteristics below move it in half points, and no file ever scores less than ${e.fmtScore(e.ALLOC_SCORE_FLOOR)}.`,
      sliders: [slider('Standard file', 'base', W.base), slider('Construction', 'construction', W.construction)],
    });
    const any: Slider[] = [];
    (e.HOUSING_TYPES as string[]).forEach((k) => any.push(slider('Housing: ' + k, 'housing.' + k, W.housing[k] || 0)));
    (e.PROGRAM_TYPES as string[]).forEach((k) => any.push(slider('Program: ' + k, 'program.' + k, W.program[k] || 0)));
    (e.SOURCE_TYPES as string[]).forEach((k) => any.push(slider('Source Type: ' + k, 'sourceType.' + k, W.sourceType[k] || 0)));
    out.push({
      title: 'Any stage',
      note: 'These read the same wherever a file sits, so they are counted once.',
      sliders: any,
    });
    const purposes: string[] = e.allocPurposes();
    (e.ALLOC_STAGES as string[][]).forEach((s, i) => {
      const sl: Slider[] = [];
      (e.COI_SOURCES as string[]).forEach((k) =>
        sl.push(slider('COI ' + k, `coiSource.${k}.${s[0]}`, (W.coiSource[k] || {})[s[0]] || 0)),
      );
      (e.FORM_OF_COIP as string[]).forEach((k) =>
        sl.push(slider('Form of COIP: ' + k, `formOfCoip.${k}.${s[0]}`, (W.formOfCoip[k] || {})[s[0]] || 0)),
      );
      sl.push(slider('Mixed-Use', 'mixedUse.' + s[0], (W.mixedUse || {})[s[0]] || 0));
      sl.push(slider('Affordable', 'affordable.' + s[0], W.affordable[s[0]] || 0));
      sl.push(slider('FR Deal', 'qc.' + s[0], W.qc[s[0]] || 0));
      purposes.forEach((p) => sl.push(slider(p, `purpose.${p}.${s[0]}`, (W.purpose[p] || {})[s[0]] || 0)));
      out.push({
        title: i === 0 ? 'By deal stage' : '',
        note:
          i === 0
            ? 'These read differently depending on where a file sits, and only its current stage counts. A broker-prepared COIP saves work up front and costs it at CCS; an internally prepared one does the reverse. <b>COI Source and Form of COIP are the same fact in two columns, so a file counts one of them, never both:</b> COI Source is used whenever it is populated, Form of COIP only as the fallback when it is blank. <b>FR Deal</b> applies to a Quebec file marked FR under Languages and held by someone who does not read French.'
            : '',
        stage: { label: s[1], bg: s[2] },
        sliders: sl,
      });
    });
    return out;
  });

  // ---- test two deals ----

  readonly testSides = computed(() => {
    const e = this.sig();
    const T = this.test() ?? { a: e.allocTestDefault(), b: e.allocTestDefault() };
    const W = e.allocWDraft();
    const side = (c: CmhcData) => ({
      c,
      score: e.fmtScore(e.allocTestScore(c, W)),
      breakdown: (e.allocTestBreakdown(c, W) as { l: string; v: number }[]).map((b) => ({ l: b.l, v: e.fmtW(b.v) })),
    });
    return [
      { id: 'a' as const, label: 'Deal A', ...side(T.a) },
      { id: 'b' as const, label: 'Deal B', ...side(T.b) },
    ];
  });

  readonly testFields = computed(() => {
    const e = this.e();
    return [
      { field: 'housing', label: 'Housing Type', options: e.HOUSING_TYPES as string[] },
      { field: 'program', label: 'Program Type', options: e.PROGRAM_TYPES as string[] },
      { field: 'sourceType', label: 'Source Type', options: e.SOURCE_TYPES as string[] },
      { field: 'coiSource', label: 'COI Source', options: e.COI_SOURCES as string[] },
      { field: 'formOfCoip', label: 'Form of COIP', options: e.FORM_OF_COIP as string[] },
      { field: 'purpose', label: 'Purpose', options: e.allocPurposes() as string[] },
    ];
  });

  // ---- languages panel ----

  readonly languages = computed(() => {
    const e = this.sig();
    const roster: string[] = e.allocRoster(ROLE);
    const qd: CmhcDeal[] = e.qcDeals();
    const deals: CmhcDeal[] = this.dataService.data()?.deals ?? [];
    let fr = 0;
    let en = 0;
    qd.forEach((d) => {
      const l = e.dealLang(d);
      if (l === 'FR') fr++;
      else if (l === 'EN') en++;
    });
    return {
      marked: e.francophoneCount(),
      people: roster.map((n, i) => ({ i, label: e.abbrevName(n), fr: !!e.isFrancophone(n) })),
      rosterCount: roster.length,
      qcCount: qd.length,
      fr,
      en,
      unset: qd.length - fr - en,
      files: qd.map((d) => {
        const lv: string = e.dealLang(d);
        const holder: string = e.allocHolder(d, ROLE);
        const reads = !!holder && e.isFrancophone(holder);
        return {
          index: deals.indexOf(d),
          name: d.name || '—',
          meta: `${d.city || ''} · ${e.M(d.loan || 0)}`,
          lang: lv,
          holder: holder ? e.abbrevName(holder) : '',
          reads,
          costs: lv === 'FR' && !!holder && !reads,
          idx: deals.indexOf(d),
        };
      }),
    };
  });

  // ---- actions (ports of the v4 handlers that also re-rendered the DOM) ----

  setSub(s: 'workload' | 'calendar'): void {
    this.sub.set(s);
  }

  togglePanel(): void {
    const on = !this.panel();
    this.panel.set(on);
    if (on) {
      this.langPanel.set(false);
      const e = this.e();
      e.ALLOC_W_DRAFT = JSON.parse(JSON.stringify(e.allocW()));
      this.touch();
    }
  }

  toggleLangPanel(): void {
    const on = !this.langPanel();
    this.langPanel.set(on);
    if (on) this.panel.set(false);
  }

  togglePerson(name: string): void {
    this.open.update((cur) => (cur === name ? null : name));
  }

  navCal(n: number): void {
    const e = this.e();
    const m = this.calMonth() || e.todayISO().slice(0, 7);
    const d = new Date(parseInt(m.slice(0, 4), 10), parseInt(m.slice(5, 7), 10) - 1 + n, 1);
    this.calMonth.set(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
  }

  toggleLock(path: string): void {
    const e = this.e();
    const L = e.allocLocked();
    let nowLocked: boolean;
    if (L[path]) {
      delete L[path];
      nowLocked = false;
    } else {
      L[path] = true;
      nowLocked = true;
    }
    e.saveAllocLocked();
    if (nowLocked) {
      e.setWeightPath(e.allocWDraft(), path, 0);
      e.setWeightPath(e.allocW(), path, 0);
      e.saveAllocW();
    }
    this.touch();
  }

  setWeight(path: string, value: string): void {
    const e = this.e();
    if (e.isLocked(path)) return;
    const v = parseFloat(value);
    if (isNaN(v)) return;
    e.setWeightPath(e.allocWDraft(), path, v);
    this.lastChg.set(path);
    this.touch();
  }

  resetDraft(): void {
    const e = this.e();
    e.ALLOC_W_DRAFT = JSON.parse(JSON.stringify(e.allocDefaultBase()));
    this.touch();
  }

  setAsDefault(): void {
    const e = this.e();
    this.dataService.allocStorage().setItem(e.ALLOC_WD_KEY, JSON.stringify(e.allocWDraft()));
    this.touch();
  }

  saveDraft(): void {
    const e = this.e();
    e.ALLOC_W = JSON.parse(JSON.stringify(e.allocWDraft()));
    e.saveAllocW();
    this.lastChg.set(null);
    this.touch();
  }

  discardDraft(): void {
    const e = this.e();
    e.ALLOC_W_DRAFT = JSON.parse(JSON.stringify(e.allocW()));
    this.lastChg.set(null);
    this.touch();
  }

  proposeAssign(key: string, name: string): void {
    const e = this.e();
    const P = e.allocProposals();
    if (!P[key]) P[key] = {};
    if (name) P[key][ROLE] = name;
    else delete P[key][ROLE];
    if (!Object.keys(P[key]).length) delete P[key];
    e.saveAllocP();
    this.touch();
  }

  clearProposals(): void {
    const e = this.e();
    e.ALLOC_P = {};
    e.saveAllocP();
    this.touch();
  }

  setFrancophone(i: number, isFr: boolean): void {
    const e = this.e();
    const n: string = e.allocRoster(ROLE)[i];
    if (!n) return;
    const F = e.allocFranco();
    if (isFr) F[n] = true;
    else delete F[n];
    e.saveAllocFranco();
    this.touch();
  }

  setDealLang(index: number, value: string): void {
    const e = this.e();
    const d = (this.dataService.data()?.deals ?? [])[index];
    if (!d) return;
    const L = e.allocLangMap();
    const k = e.allocKey(d);
    if (value) L[k] = value;
    else delete L[k];
    e.saveAllocLang();
    this.touch();
  }

  setTest(side: 'a' | 'b', field: string, value: string | boolean): void {
    const e = this.e();
    const T = this.test() ?? { a: e.allocTestDefault(), b: e.allocTestDefault() };
    const boolField = field === 'construction' || field === 'mixedUse' || field === 'affordable' || field === 'qc';
    T[side] = { ...T[side], [field]: boolField ? !!value : value };
    this.test.set({ ...T });
  }

  resetTest(side: 'a' | 'b'): void {
    const e = this.e();
    const T = this.test() ?? { a: e.allocTestDefault(), b: e.allocTestDefault() };
    T[side] = e.allocTestDefault();
    this.test.set({ ...T });
  }

  openDeal(index: number, event?: Event): void {
    event?.stopPropagation();
    if (index >= 0) this.dataService.openDeal(index);
  }

  /** Unsaved weights are lost on close, as in v4. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.changed().length) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  plural(n: number): string {
    return n === 1 ? '' : 's';
  }
}
