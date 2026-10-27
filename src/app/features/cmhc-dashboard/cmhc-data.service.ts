import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { CmhcApiService } from './cmhc-api.service';
import { CmhcData, CmhcListPopup, CmhcReportStateDto, CmhcStateKey } from './cmhc-dashboard.models';
import { createLegacyEngine } from './legacy-engine';

const POOL_WEEK_STORAGE_KEY = 'cmhc_pool_week_v1';
/** Source label stamped on the history snapshot a live load records (v4 used the uploaded file's name). */
const LIVE_SOURCE_LABEL = 'KingSight live pipeline';

/** Timelines tab filters and toggles (v4 TL_MODE / TL_VIEW / TL_PURPOSE / TL_PROV / TL_BACK / TL_YEAR). */
export interface CmhcTimelineState {
  mode: 'flight' | 'funded';
  view: 'fund' | 'slip';
  purpose: string;
  prov: string;
  back: 'incl' | 'excl';
  year: string;
}

/**
 * v4 kept Capacity settings in localStorage. The engine now reads and writes them through an adapter:
 * these keys are shared with the team through the API, anything else (proposed assignments, who reads
 * French, per-file language) stays in this browser exactly as in v4.
 */
const ALLOC_LOCKED_KEY = 'cmhc_alloc_locked_v1';
const ALLOC_WEIGHTS_KEY = 'cmhc_alloc_weights_v1';
const ALLOC_WEIGHTS_DEFAULT_KEY = 'cmhc_alloc_weights_default_v1';
const ALLOC_AWAY_KEY = 'cmhc_alloc_away_v1';
const ALLOC_STATE_BY_KEY: Record<string, CmhcStateKey> = {
  [ALLOC_LOCKED_KEY]: 'alloc-locked',
  [ALLOC_LOCKED_KEY + '_coi2']: 'alloc-locked',
  [ALLOC_WEIGHTS_KEY]: 'alloc-weights',
  [ALLOC_WEIGHTS_DEFAULT_KEY]: 'alloc-weights',
  [ALLOC_AWAY_KEY]: 'alloc-workdays',
};
const ALLOC_STATE_KEYS: CmhcStateKey[] = ['alloc-locked', 'alloc-weights', 'alloc-workdays'];

const parseJson = (s: string | undefined): unknown => {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

/** History is compared without snapshot timestamps so reloading the page doesn't count as a change. */
const histSignature = (hist: unknown) => JSON.stringify(hist, (k, v) => (k === 'at' ? undefined : v));

/**
 * Loads the live pipeline, runs it through the v4 calculation engine (unchanged, see
 * legacy-engine.ts) and exposes the result as signals. Also owns popup state and the
 * shared funding-history log.
 */
@Injectable({ providedIn: 'root' })
export class CmhcDataService {
  private readonly api = inject(CmhcApiService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<CmhcData | null>(null);
  readonly asOf = signal('');
  /** The v4 engine instance; its formatters (M, Mr, fmtDate, ...) are used by the templates. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly engine = signal<any | null>(null);

  /** Selected person per person-view (uw / orig / rev / pool), as v4's curUW / curOrig / curRev / curPool. */
  readonly curPerson = signal<Record<string, number>>({ uw: 0, orig: 0, rev: 0, pool: 0 });

  /** Stage filter chips per person-view (v4 STAGE_FILTER). */
  readonly stageFilter = signal<Record<string, string[]>>({ uw: [], orig: [], rev: [], pool: [] });

  readonly tl = signal<CmhcTimelineState>({
    mode: 'flight',
    view: 'fund',
    purpose: 'All',
    prov: 'All',
    back: 'incl',
    year: 'All',
  });
  /** Bumped when the hidden-people list changes, so views recompute. */
  readonly tlHiddenRev = signal(0);
  /** v4's history-log notice (e.g. snapshot older than the last recorded one). */
  readonly histNotice = signal('');

  readonly dealPopup = signal<number | null>(null);
  readonly listPopup = signal<CmhcListPopup | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private records: any[] = [];
  private histState: CmhcReportStateDto = { key: 'hist', value: null, version: 0 };
  private tlHiddenState: CmhcReportStateDto = { key: 'tl-hidden', value: null, version: 0 };
  private readonly sharedStates: Partial<Record<CmhcStateKey, CmhcReportStateDto>> = {};
  private readonly allocStore = new Map<string, string>();
  private readonly allocSaveTimers: Partial<Record<CmhcStateKey, ReturnType<typeof setTimeout>>> = {};

  async load(asOf?: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const pipeline = await firstValueFrom(this.api.getPipeline(asOf));
      this.histState = await this.loadState('hist');
      this.tlHiddenState = await this.loadState('tl-hidden');
      for (const key of ALLOC_STATE_KEYS) this.sharedStates[key] = await this.loadState(key);
      this.hydrateAllocStore();

      const hist = this.histState.value as { loans?: unknown } | null;

      // The generated engine is untyped JavaScript.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine: any = createLegacyEngine({
        hist: hist && hist.loans ? hist : null,
        poolWeekSel: this.readPoolWeek(),
        onTlHiddenChange: (hidden: unknown) => void this.saveTlHidden(hidden),
        storage: this.allocStorage(),
      });
      engine.TL_HIDDEN = this.normalizeTlHidden(this.tlHiddenState.value);

      const map = engine.autoMap(pipeline.columns);
      const nameIdx = map['name'];
      const parsed = {
        headers: pipeline.columns,
        rows: pipeline.rows,
        links: pipeline.rows.map((_, i) => (pipeline.links[i] ? { [nameIdx]: pipeline.links[i] } : null)),
      };
      this.records = engine.buildRecords(parsed, map);

      // Same sequence v4 ran on an upload: seed the history, record this snapshot (which also
      // freezes the week's pool baseline), then build the report.
      engine.CUR_META = { asOf: pipeline.asOf, fileName: LIVE_SOURCE_LABEL };
      const before = histSignature(engine.HIST);
      engine.applyHistSeed();
      const reloadOfSameDay = !!engine.HIST?.snapshots?.some((x: { asOf: string }) => x.asOf === pipeline.asOf);
      engine.ingestSnapshot(this.records, pipeline.asOf, LIVE_SOURCE_LABEL);
      // v4 warns when the same as-of date is loaded twice; a live dashboard reloads constantly.
      if (reloadOfSameDay) engine.HIST_NOTICE = '';
      const data = engine.buildData(this.records, pipeline.asOf);
      if (histSignature(engine.HIST) !== before) {
        await this.saveHist(engine.HIST);
      }

      engine.DATA = data;
      this.engine.set(engine);
      this.asOf.set(pipeline.asOf);
      this.histNotice.set(engine.HIST_NOTICE || '');
      this.data.set(data);
    } catch {
      this.error.set('The CMHC pipeline could not be loaded. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  /** Pools tab "movement measured since" picker. */
  setPoolWeek(week: string): void {
    const engine = this.engine();
    if (!engine || !this.records.length) return;
    const asOf = this.asOf();
    engine.POOL_WEEK_SEL = week && week !== engine.defaultBaselineWeek(asOf) ? week : null;
    try {
      if (engine.POOL_WEEK_SEL) localStorage.setItem(POOL_WEEK_STORAGE_KEY, engine.POOL_WEEK_SEL);
      else localStorage.removeItem(POOL_WEEK_STORAGE_KEY);
    } catch {
      /* per-browser preference only */
    }
    const data = this.data();
    if (data) {
      const next = { ...data, poolMoves: engine.computePoolMoves(this.records, asOf) };
      engine.DATA = next;
      this.data.set(next);
    }
  }

  openDeal(index: number): void {
    this.dealPopup.set(index);
  }

  openList(popup: CmhcListPopup): void {
    // Like v4: nothing opens when there is nothing to list.
    const data = this.data();
    if (popup.kind === 'deals' && !popup.deals.length) return;
    if (popup.kind === 'issue' && !popup.category.deals.length) return;
    if (popup.kind === 'funded') {
      const pool = (data?.pools ?? []).find((x: { pool: string }) => x.pool === popup.pool);
      if (!pool?.fundedList?.length) return;
    }
    if (popup.kind === 'move') {
      const mv = data?.poolMoves?.byPool?.[popup.pool];
      if (!mv || (!mv.addN && !mv.remN && !mv.fundN)) return;
    }
    this.listPopup.set(popup);
  }

  /** Empty stage clears the filter; otherwise toggles that stage on or off. */
  toggleStage(type: string, stage: string): void {
    this.stageFilter.update((all) => {
      const cur = all[type] ?? [];
      const next = stage === '' ? [] : cur.includes(stage) ? cur.filter((s) => s !== stage) : [...cur, stage];
      return { ...all, [type]: next };
    });
  }

  /** A flag chip jumps to the Methodology tab's flag legend (v4 goToFlagLegend). */
  goToFlagLegend(): void {
    this.closePopups();
    void this.router.navigate(['/cmhc-dashboard', 'methodology'], { fragment: 'legend-note-card' });
  }

  closePopups(): void {
    this.dealPopup.set(null);
    this.listPopup.set(null);
  }

  /** Timelines filters: the engine's own functions read its TL_* variables, so keep them in step. */
  setTl(patch: Partial<CmhcTimelineState>): void {
    const engine = this.engine();
    if (engine) {
      if (patch.mode) engine.TL_MODE = patch.mode;
      if (patch.view) engine.TL_VIEW = patch.view;
      if (patch.purpose) engine.TL_PURPOSE = patch.purpose;
      if (patch.prov) engine.TL_PROV = patch.prov;
      if (patch.back) engine.TL_BACK = patch.back;
      if (patch.year) engine.TL_YEAR = patch.year;
    }
    this.tl.update((cur) => ({ ...cur, ...patch }));
  }

  /** Hide or restore a person on one Timelines leaderboard (v4 tlHidePerson / tlUnhidePerson). */
  setTlHidden(role: 'uw' | 'orig', who: string, hidden: boolean): void {
    const engine = this.engine();
    if (!engine) return;
    const list: string[] = engine.tlHiddenList(role);
    if (hidden) {
      if (!list.includes(who)) list.push(who);
    } else {
      const bucket = engine.TL_HIDDEN[role];
      bucket[engine.TL_YEAR] = (bucket[engine.TL_YEAR] || []).filter((x: string) => x !== who);
    }
    engine.saveTlHidden();
    this.tlHiddenRev.update((n) => n + 1);
  }

  dismissHistNotice(): void {
    const engine = this.engine();
    if (engine) engine.HIST_NOTICE = '';
    this.histNotice.set('');
  }

  /** Seeds the engine's storage with what the team has saved, in the shapes v4's own code expects. */
  private hydrateAllocStore(): void {
    this.allocStore.clear();
    const locked = this.sharedStates['alloc-locked']?.value as { locked?: unknown; markers?: Record<string, string> } | null;
    if (locked?.locked) {
      this.allocStore.set(ALLOC_LOCKED_KEY, JSON.stringify(locked.locked));
      Object.entries(locked.markers ?? {}).forEach(([k, v]) => this.allocStore.set(`${ALLOC_LOCKED_KEY}_${k}`, v));
    }
    const weights = this.sharedStates['alloc-weights']?.value as { current?: unknown; default?: unknown } | null;
    if (weights?.current) this.allocStore.set(ALLOC_WEIGHTS_KEY, JSON.stringify(weights.current));
    if (weights?.default) this.allocStore.set(ALLOC_WEIGHTS_DEFAULT_KEY, JSON.stringify(weights.default));
    const away = this.sharedStates['alloc-workdays']?.value;
    if (away) this.allocStore.set(ALLOC_AWAY_KEY, JSON.stringify(away));
  }

  /** localStorage look-alike: shared keys live in memory and are saved to the API, the rest pass through. */
  /** Also used by the Capacity tab to save the weights' "Set as default" baseline. */
  allocStorage() {
    const local = (): Storage | null => {
      try {
        return localStorage;
      } catch {
        return null;
      }
    };
    return {
      getItem: (k: string): string | null =>
        k in ALLOC_STATE_BY_KEY ? (this.allocStore.get(k) ?? null) : (local()?.getItem(k) ?? null),
      setItem: (k: string, v: string): void => {
        if (k in ALLOC_STATE_BY_KEY) {
          this.allocStore.set(k, v);
          this.scheduleAllocSave(ALLOC_STATE_BY_KEY[k]);
        } else {
          local()?.setItem(k, v);
        }
      },
      removeItem: (k: string): void => {
        if (k in ALLOC_STATE_BY_KEY) {
          this.allocStore.delete(k);
          this.scheduleAllocSave(ALLOC_STATE_BY_KEY[k]);
        } else {
          local()?.removeItem(k);
        }
      },
    };
  }

  private scheduleAllocSave(key: CmhcStateKey): void {
    clearTimeout(this.allocSaveTimers[key]);
    this.allocSaveTimers[key] = setTimeout(() => void this.persistAlloc(key), 400);
  }

  private allocValue(key: CmhcStateKey): unknown {
    const get = (k: string) => this.allocStore.get(k);
    if (key === 'alloc-locked') {
      const coi2 = get(`${ALLOC_LOCKED_KEY}_coi2`);
      return { locked: parseJson(get(ALLOC_LOCKED_KEY)) ?? {}, markers: coi2 ? { coi2 } : {} };
    }
    if (key === 'alloc-weights') {
      return { current: parseJson(get(ALLOC_WEIGHTS_KEY)), default: parseJson(get(ALLOC_WEIGHTS_DEFAULT_KEY)) };
    }
    return parseJson(get(ALLOC_AWAY_KEY)) ?? {};
  }

  /** Capacity settings are shared; a stale version (409) is retried once on the latest version. */
  private async persistAlloc(key: CmhcStateKey): Promise<void> {
    const value = this.allocValue(key);
    try {
      this.sharedStates[key] = await firstValueFrom(this.api.putState(key, value, this.sharedStates[key]?.version ?? 0));
    } catch {
      try {
        const latest = await this.loadState(key);
        this.sharedStates[key] = await firstValueFrom(this.api.putState(key, value, latest.version));
      } catch {
        /* the setting still applies for this session */
      }
    }
  }

  private async loadState(key: CmhcStateKey): Promise<CmhcReportStateDto> {
    try {
      return await firstValueFrom(this.api.getState(key));
    } catch {
      return { key, value: null, version: 0 };
    }
  }

  /** Same upgrades v4 applied to older saved lists: bare arrays and per-board arrays become per-year buckets. */
  private normalizeTlHidden(raw: unknown): { uw: Record<string, string[]>; orig: Record<string, string[]> } {
    const out = { uw: { All: [] as string[] }, orig: { All: [] as string[] } } as {
      uw: Record<string, string[]>;
      orig: Record<string, string[]>;
    };
    if (Array.isArray(raw)) {
      out.uw = { All: raw.slice() as string[] };
      out.orig = { All: raw.slice() as string[] };
    } else if (raw && typeof raw === 'object') {
      const r = raw as { uw?: unknown; orig?: unknown };
      if (Array.isArray(r.uw) || Array.isArray(r.orig)) {
        out.uw = { All: (r.uw as string[]) || [] };
        out.orig = { All: (r.orig as string[]) || [] };
      } else {
        if (r.uw && typeof r.uw === 'object') out.uw = r.uw as Record<string, string[]>;
        if (r.orig && typeof r.orig === 'object') out.orig = r.orig as Record<string, string[]>;
      }
    }
    if (!out.uw['All']) out.uw['All'] = [];
    if (!out.orig['All']) out.orig['All'] = [];
    return out;
  }

  /** Hidden people are shared by the team; a stale version (409) is retried once on the latest version. */
  private async saveTlHidden(hidden: unknown): Promise<void> {
    try {
      this.tlHiddenState = await firstValueFrom(this.api.putState('tl-hidden', hidden, this.tlHiddenState.version));
    } catch {
      try {
        const latest = await this.loadState('tl-hidden');
        this.tlHiddenState = await firstValueFrom(this.api.putState('tl-hidden', hidden, latest.version));
      } catch {
        /* the list still applies for this session */
      }
    }
  }

  /** Funding-history log is shared; a stale version (409) means someone saved first, so keep theirs. */
  private async saveHist(hist: unknown): Promise<void> {
    try {
      this.histState = await firstValueFrom(this.api.putState('hist', hist, this.histState.version));
    } catch {
      /* the report still renders from the computed history */
    }
  }

  private readPoolWeek(): string | null {
    try {
      return localStorage.getItem(POOL_WEEK_STORAGE_KEY) || null;
    } catch {
      return null;
    }
  }
}
