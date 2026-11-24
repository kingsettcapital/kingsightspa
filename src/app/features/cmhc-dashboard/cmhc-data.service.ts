import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CmhcApiService } from './cmhc-api.service';
import { CmhcPipelineDto, CmhcReportStateDto, CmhcStateKey } from './cmhc-dashboard.models';

/**
 * The MMG dashboard (public/cmhc/mmg-dashboard.html) keeps its settings in localStorage. Its storage is routed
 * here (see public/cmhc/cmhc-host.js):
 *   - team settings and the funding-history log are shared through the API (saved by Admins / Reviewers only);
 *   - the report's copies of the dataset (pipeline, renewals, column matches) stay in memory: the live
 *     pipeline is the source, and they are too large for browser storage;
 *   - anything else (view preferences, proposed assignments, FFA upload) stays in this browser, as in the report.
 */
const ALLOC_LOCKED_KEY = 'cmhc_alloc_locked_v1';
const ALLOC_WEIGHTS_KEY = 'cmhc_alloc_weights_v1';
const ALLOC_WEIGHTS_DEFAULT_KEY = 'cmhc_alloc_weights_default_v1';
const ALLOC_AWAY_KEY = 'cmhc_alloc_away_v1';

/** Report settings saved as-is under their own shared state key. */
const MIRRORED_STATE_BY_KEY: Record<string, CmhcStateKey> = {
  cmhc_pipeline_hist_v2: 'hist',
  cmhc_tl_hidden_v2: 'tl-hidden',
  [ALLOC_AWAY_KEY]: 'alloc-workdays',
  cmhc_alloc_coverage_v1: 'alloc-coverage',
  cmhc_alloc_active_v1: 'alloc-active',
  cmhc_alloc_active_reset_v1: 'alloc-active-reset',
  mmg_rev_vac_v1: 'rev-vacations',
  mmg_revcal_cap: 'rev-cal-capacity',
  mmg_ren_ms_v1: 'renewal-milestones',
  mmg_rp_sponsor_pairs: 'sponsor-pairs',
  mmg_wip_marks_v1: 'wip-marks',
  mmg_wip_uw_v1: 'wip-credits',
  mmg_ffa_stamps_v1: 'ffa-stamps',
};
/** Every report key that is shared, including the two composite states (locked weights, weights + default). */
const SHARED_BY_KEY: Record<string, CmhcStateKey> = {
  [ALLOC_LOCKED_KEY]: 'alloc-locked',
  [ALLOC_LOCKED_KEY + '_coi2']: 'alloc-locked',
  [ALLOC_WEIGHTS_KEY]: 'alloc-weights',
  [ALLOC_WEIGHTS_DEFAULT_KEY]: 'alloc-weights',
  ...MIRRORED_STATE_BY_KEY,
};
const SHARED_STATE_KEYS = [...new Set(Object.values(SHARED_BY_KEY))];
/** The report's own copies of the dataset: rebuilt from the live pipeline on every load. */
const MEMORY_ONLY_KEYS = new Set(['cmhc_pipeline_v2', 'cmhc_pipeline_colmap_v3', 'mmg_mat_v1']);

const parseJson = (s: string | undefined): unknown => {
  try {
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
};

/** Snapshot timestamps are ignored, so reloading the page doesn't count as a change to the history. */
const signature = (v: unknown) => JSON.stringify(v, (k, x) => (k === 'at' ? undefined : x));

export interface CmhcStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Loads the live (role-filtered) pipeline and the team's shared settings for the hosted MMG dashboard. */
@Injectable({ providedIn: 'root' })
export class CmhcDataService {
  private readonly api = inject(CmhcApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly pipeline = signal<CmhcPipelineDto | null>(null);

  /**
   * False for Underwriters / Originators: their pipeline is filtered to their own loans, so their copy must not
   * overwrite the team's shared history or settings (the API also refuses with 403). Their changes apply for
   * the session only — view-only for the team.
   */
  canWriteShared = false;

  private readonly states: Partial<Record<CmhcStateKey, CmhcReportStateDto>> = {};
  private readonly savedSig: Partial<Record<CmhcStateKey, string>> = {};
  private readonly shared = new Map<string, string>();
  private readonly memory = new Map<string, string>();
  private readonly saveTimers: Partial<Record<CmhcStateKey, ReturnType<typeof setTimeout>>> = {};

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const [pipeline, ...states] = await Promise.all([
        firstValueFrom(this.api.getPipeline()),
        ...SHARED_STATE_KEYS.map((key) => this.loadState(key)),
      ]);
      SHARED_STATE_KEYS.forEach((key, i) => {
        this.states[key] = states[i];
        this.savedSig[key] = signature(states[i].value);
      });
      this.hydrate();
      this.memory.clear();
      this.pipeline.set(pipeline);
    } catch {
      this.error.set('The CMHC pipeline could not be loaded. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  fail(message: string): void {
    this.error.set(message);
  }

  /** localStorage look-alike handed to the report. */
  readonly storage: CmhcStorage = {
    getItem: (k) => {
      if (k in SHARED_BY_KEY) return this.shared.get(k) ?? null;
      if (MEMORY_ONLY_KEYS.has(k)) return this.memory.get(k) ?? null;
      return this.local()?.getItem(k) ?? null;
    },
    setItem: (k, v) => {
      if (k in SHARED_BY_KEY) {
        this.shared.set(k, v);
        this.scheduleSave(SHARED_BY_KEY[k]);
      } else if (MEMORY_ONLY_KEYS.has(k)) {
        this.memory.set(k, v);
      } else {
        try {
          this.local()?.setItem(k, v);
        } catch {
          /* browser storage full: the setting applies for this session */
        }
      }
    },
    removeItem: (k) => {
      if (k in SHARED_BY_KEY) {
        this.shared.delete(k);
        this.scheduleSave(SHARED_BY_KEY[k]);
      } else if (MEMORY_ONLY_KEYS.has(k)) {
        this.memory.delete(k);
      } else {
        this.local()?.removeItem(k);
      }
    },
  };

  private local(): Storage | null {
    try {
      return localStorage;
    } catch {
      return null;
    }
  }

  /** Seeds the report's storage with what the team has saved, in the shapes the report's own code expects. */
  private hydrate(): void {
    this.shared.clear();
    const locked = this.states['alloc-locked']?.value as { locked?: unknown; markers?: Record<string, string> } | null;
    if (locked?.locked) {
      this.shared.set(ALLOC_LOCKED_KEY, JSON.stringify(locked.locked));
      Object.entries(locked.markers ?? {}).forEach(([k, v]) => this.shared.set(`${ALLOC_LOCKED_KEY}_${k}`, v));
    }
    const weights = this.states['alloc-weights']?.value as { current?: unknown; default?: unknown } | null;
    if (weights?.current) this.shared.set(ALLOC_WEIGHTS_KEY, JSON.stringify(weights.current));
    if (weights?.default) this.shared.set(ALLOC_WEIGHTS_DEFAULT_KEY, JSON.stringify(weights.default));
    for (const [localKey, stateKey] of Object.entries(MIRRORED_STATE_BY_KEY)) {
      const value = this.states[stateKey]?.value;
      if (value != null) this.shared.set(localKey, JSON.stringify(value));
    }
  }

  private valueOf(key: CmhcStateKey): unknown {
    const get = (k: string) => this.shared.get(k);
    if (key === 'alloc-locked') {
      const coi2 = get(`${ALLOC_LOCKED_KEY}_coi2`);
      return { locked: parseJson(get(ALLOC_LOCKED_KEY)) ?? {}, markers: coi2 ? { coi2 } : {} };
    }
    if (key === 'alloc-weights') {
      return { current: parseJson(get(ALLOC_WEIGHTS_KEY)), default: parseJson(get(ALLOC_WEIGHTS_DEFAULT_KEY)) };
    }
    const localKey = Object.keys(MIRRORED_STATE_BY_KEY).find((k) => MIRRORED_STATE_BY_KEY[k] === key);
    return localKey ? parseJson(get(localKey)) : null;
  }

  private scheduleSave(key: CmhcStateKey): void {
    if (!this.canWriteShared) return;
    clearTimeout(this.saveTimers[key]);
    this.saveTimers[key] = setTimeout(() => void this.save(key), 400);
  }

  /** Saves a shared setting when it actually changed; a stale version (409) is retried once on the latest. */
  private async save(key: CmhcStateKey): Promise<void> {
    if (!this.canWriteShared) return;
    const value = this.valueOf(key);
    const sig = signature(value);
    if (sig === this.savedSig[key]) return;
    try {
      this.states[key] = await firstValueFrom(this.api.putState(key, value, this.states[key]?.version ?? 0));
      this.savedSig[key] = sig;
    } catch {
      // The history log keeps whoever saved first; other settings retry on the latest version.
      if (key === 'hist') return;
      try {
        const latest = await this.loadState(key);
        this.states[key] = await firstValueFrom(this.api.putState(key, value, latest.version));
        this.savedSig[key] = sig;
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
}
