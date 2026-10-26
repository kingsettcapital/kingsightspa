import { inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CmhcApiService } from './cmhc-api.service';
import { CmhcData, CmhcListPopup, CmhcReportStateDto } from './cmhc-dashboard.models';
import { createLegacyEngine } from './legacy-engine';

const POOL_WEEK_STORAGE_KEY = 'cmhc_pool_week_v1';

/**
 * Loads the live pipeline, runs it through the v4 calculation engine (unchanged, see
 * legacy-engine.ts) and exposes the result as signals. Also owns popup state and the
 * shared funding-history log.
 */
@Injectable({ providedIn: 'root' })
export class CmhcDataService {
  private readonly api = inject(CmhcApiService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly data = signal<CmhcData | null>(null);
  readonly asOf = signal('');
  /** The v4 engine instance; its formatters (M, Mr, fmtDate, ...) are used by the templates. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly engine = signal<any | null>(null);

  /** Selected person per person-view (uw / orig / rev / pool), as v4's curUW / curOrig / curRev / curPool. */
  readonly curPerson = signal<Record<string, number>>({ uw: 0, orig: 0, rev: 0, pool: 0 });

  readonly dealPopup = signal<number | null>(null);
  readonly listPopup = signal<CmhcListPopup | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private records: any[] = [];
  private histState: CmhcReportStateDto = { key: 'hist', value: null, version: 0 };

  async load(asOf?: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const pipeline = await firstValueFrom(this.api.getPipeline(asOf));
      this.histState = await this.loadHist();

      // The generated engine is untyped JavaScript.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const engine: any = createLegacyEngine({
        hist: this.histState.value,
        poolWeekSel: this.readPoolWeek(),
      });

      const map = engine.autoMap(pipeline.columns);
      const nameIdx = map['name'];
      const parsed = {
        headers: pipeline.columns,
        rows: pipeline.rows,
        links: pipeline.rows.map((_, i) => (pipeline.links[i] ? { [nameIdx]: pipeline.links[i] } : null)),
      };
      this.records = engine.buildRecords(parsed, map);

      const before = JSON.stringify(engine.HIST);
      engine.recordPoolBaseline(this.records, pipeline.asOf);
      const data = engine.buildData(this.records, pipeline.asOf);
      if (JSON.stringify(engine.HIST) !== before) {
        await this.saveHist(engine.HIST);
      }

      this.engine.set(engine);
      this.asOf.set(pipeline.asOf);
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
      this.data.set({ ...data, poolMoves: engine.computePoolMoves(this.records, asOf) });
    }
  }

  openDeal(index: number): void {
    this.dealPopup.set(index);
  }

  openList(popup: CmhcListPopup): void {
    this.listPopup.set(popup);
  }

  closePopups(): void {
    this.dealPopup.set(null);
    this.listPopup.set(null);
  }

  private async loadHist(): Promise<CmhcReportStateDto> {
    try {
      const state = await firstValueFrom(this.api.getState('hist'));
      const value = state.value as { loans?: unknown } | null;
      return { ...state, value: value && value.loans ? value : null };
    } catch {
      return { key: 'hist', value: null, version: 0 };
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
