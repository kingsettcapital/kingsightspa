import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { MORTGAGE_DEFAULT_ROUTE, MORTGAGE_NAV_ITEMS } from '../../mortgage/mortgage-nav.config';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  /** Placeholder Home cards — kept in template, gated by env flag. */
  readonly showHomeCapitalAndDataExplorer =
    environment.showHomeCapitalAndDataExplorer === true;

  readonly mortgageHomePath = `/mortgage/${MORTGAGE_DEFAULT_ROUTE}`;

  readonly mortgageLinks = MORTGAGE_NAV_ITEMS.filter(
    (item) =>
      item.path !== 'management-summary' || environment.managementSummaryEnabled === true,
  );
}
