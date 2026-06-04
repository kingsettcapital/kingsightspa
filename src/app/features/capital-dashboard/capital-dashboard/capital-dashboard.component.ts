import { Component, DestroyRef, inject, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { Store } from '@ngrx/store';
import { filter } from 'rxjs';

import { CapitalDashboardCacheActions, CapitalDashboardShellActions } from '../store';
import { CapitalDashboardTab } from '../store/capital-dashboard.state';

@Component({
  selector: 'app-capital-dashboard',
  standalone: true,
  imports: [
    MatTabsModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './capital-dashboard.component.html',
  styleUrls: ['./capital-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class CapitalDashboardComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly store = inject(Store);

  /** Clears deep-link query params when switching tabs via routerLink. */
  readonly tabClearQueryParams = {
    selected: null,
    search: null,
    detailTab: null,
  };

  constructor() {
    document.body.setAttribute('data-ks-capital-dashboard', 'true');
    this.destroyRef.onDestroy(() => {
      this.store.dispatch(CapitalDashboardCacheActions.resetAll());
      document.body.removeAttribute('data-ks-capital-dashboard');
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.syncActiveTabToStore());
  }

  private syncActiveTabToStore(): void {
    this.store.dispatch(
      CapitalDashboardShellActions.activeTabChanged({ tab: this.readTabFromRoute() }),
    );
  }

  private readTabFromRoute(): CapitalDashboardTab {
    const path = this.route.firstChild?.snapshot?.url?.[0]?.path;
    if (path === 'investor' || path === 'investment' || path === 'asset') {
      return path;
    }

    const urlMatch = this.router.url.match(/\/capital-dashboard\/(investor|investment|asset)(?:\/|$|\?)/);
    const urlTab = urlMatch?.[1];
    if (urlTab === 'investor' || urlTab === 'investment' || urlTab === 'asset') {
      return urlTab;
    }

    return 'investor';
  }
}
