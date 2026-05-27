import { Component, DestroyRef, inject, ViewEncapsulation } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

import { CapitalDashboardAssetsComponent } from '../assets/capital-dashboard-assets.component';
import { CapitalDashboardInvestmentsComponent } from '../investments/capital-dashboard-investments.component';
import { CapitalDashboardInvestorsComponent } from '../investors/capital-dashboard-investors.component';

@Component({
  selector: 'app-capital-dashboard',
  standalone: true,
  imports: [
    MatTabsModule,
    CapitalDashboardInvestorsComponent,
    CapitalDashboardInvestmentsComponent,
    CapitalDashboardAssetsComponent,
  ],
  templateUrl: './capital-dashboard.component.html',
  styleUrls: ['./capital-dashboard.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class CapitalDashboardComponent {
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    document.body.setAttribute('data-ks-capital-dashboard', 'true');
    this.destroyRef.onDestroy(() => {
      document.body.removeAttribute('data-ks-capital-dashboard');
    });
  }
}

