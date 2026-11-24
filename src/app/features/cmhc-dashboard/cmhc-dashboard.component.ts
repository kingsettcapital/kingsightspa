import { Component, DestroyRef, inject, NgZone, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { KingsettLogoComponent } from '../../shared/components/kingsett-logo';
import { CMHC_PAGES, CmhcAccessService, CmhcPage } from './cmhc-access.service';
import { CmhcDataService, CmhcStorage } from './cmhc-data.service';
import { CmhcPipelineDto } from './cmhc-dashboard.models';

/** What the hosted MMG dashboard reads from window.parent.__cmhcHost (public/cmhc/cmhc-host.js). */
interface CmhcHost {
  pipeline: CmhcPipelineDto;
  storage: CmhcStorage;
  viewer: { name: string; lockUw: boolean; lockOrig: boolean };
  view(): string | null;
  navigate(view: string): void;
  ready(win: Window): void;
  failed(message: string): void;
}

/** The hosted report's own functions the page calls. */
interface CmhcReportWindow extends Window {
  __cmhcShow?: (view: string) => void;
}

declare global {
  interface Window {
    __cmhcHost?: CmhcHost;
  }
}

/**
 * CMHC Dashboard: KingSight's one-row header and menu (NAV-05..NAV-11), with the business's MMG dashboard
 * (public/cmhc/mmg-dashboard.html, built from their HTML by tools/cmhc/build-v7-host.mjs) shown below it,
 * unchanged, on the live pipeline. The API filters the pipeline to the user's loans (ACC-08); the menu and
 * routes decide which pages they can open (cmhc-access.service.ts, cmhc-dashboard.routes.ts).
 */
@Component({
  selector: 'app-cmhc-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, KingsettLogoComponent],
  templateUrl: './cmhc-dashboard.component.html',
  styleUrls: ['./cmhc-dashboard-shell.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class CmhcDashboardComponent implements OnInit {
  protected readonly dataService = inject(CmhcDataService);
  protected readonly access = inject(CmhcAccessService);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  private report: CmhcReportWindow | null = null;
  /** The frame is drawn only once window.__cmhcHost is in place for the report to read. */
  protected readonly hostReady = signal(false);

  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.showCurrentPage());
    this.destroyRef.onDestroy(() => {
      delete window.__cmhcHost;
      this.report = null;
    });
  }

  async ngOnInit(): Promise<void> {
    const access = await this.access.ensureLoaded();
    if (!access.hasAccess) return;
    // Underwriters / Originators get a filtered pipeline; their copy must not overwrite team-wide state.
    this.dataService.canWriteShared = access.seesAllLoans;
    await this.load();
  }

  async reload(): Promise<void> {
    this.report = null;
    await this.load();
  }

  private async load(): Promise<void> {
    this.hostReady.set(false);
    await this.dataService.load();
    const pipeline = this.dataService.pipeline();
    if (pipeline) {
      window.__cmhcHost = this.createHost(pipeline);
      this.hostReady.set(true);
    }
  }

  private createHost(pipeline: CmhcPipelineDto): CmhcHost {
    const a = this.access.access();
    return {
      pipeline,
      storage: this.dataService.storage,
      viewer: {
        name: a?.linkedName?.trim() ?? '',
        lockUw: this.access.lockedPerson('uw') !== null,
        lockOrig: this.access.lockedPerson('orig') !== null,
      },
      view: () => this.currentView(),
      // Tab switches from inside the report go through the router, so the URL and role access apply.
      navigate: (view) =>
        this.zone.run(() => {
          const page = this.access.pageOfView(view);
          if (page && this.access.canOpen(page)) void this.router.navigate(['/cmhc-dashboard', page]);
        }),
      ready: (win) =>
        this.zone.run(() => {
          this.report = win as CmhcReportWindow;
        }),
      failed: (message) => this.zone.run(() => this.dataService.fail(message)),
    };
  }

  private currentPage(): CmhcPage | null {
    const path = this.router.url.split(/[?#]/)[0].split('/').filter(Boolean);
    const i = path.indexOf('cmhc-dashboard');
    const page = (i >= 0 ? path[i + 1] : null) as CmhcPage | null;
    return page && this.access.canOpen(page) ? page : null;
  }

  private currentView(): string | null {
    const page = this.currentPage();
    return CMHC_PAGES.find((p) => p.path === page)?.view ?? null;
  }

  private showCurrentPage(): void {
    const view = this.currentView();
    if (view && this.report?.__cmhcShow) this.report.__cmhcShow(view);
  }
}
