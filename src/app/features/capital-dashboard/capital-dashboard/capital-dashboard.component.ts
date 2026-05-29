import { Component, DestroyRef, inject, ViewEncapsulation } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map } from 'rxjs';

import { CapitalDashboardShellActions } from '../store';
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

  activeTab: CapitalDashboardTab = 'investor';

  constructor() {
    document.body.setAttribute('data-ks-capital-dashboard', 'true');
    this.destroyRef.onDestroy(() => {
      document.body.removeAttribute('data-ks-capital-dashboard');
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        map(() => (this.route.firstChild?.snapshot.url[0]?.path ?? 'investor') as CapitalDashboardTab),
        takeUntilDestroyed(),
      )
      .subscribe((tab) => {
        this.activeTab = tab;
        this.store.dispatch(CapitalDashboardShellActions.activeTabChanged({ tab }));
      });
  }

  goToTab(tab: CapitalDashboardTab): void {
    this.activeTab = tab;
    this.store.dispatch(CapitalDashboardShellActions.activeTabChanged({ tab }));
    void this.router.navigate(['./', tab], {
      relativeTo: this.route,
      queryParams: {
        // If the user manually switches tabs mid deep-link, clear pending redirect params
        // so they don't populate the next tab's search or selection state.
        selected: null,
        search: null,
        detailTab: null,
        focusInvestor: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}

