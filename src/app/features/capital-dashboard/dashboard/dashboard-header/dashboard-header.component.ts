import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { DASHBOARD_WIDGET_MAX } from '../dashboard-widgets.model';

@Component({
  selector: 'app-dashboard-header',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './dashboard-header.component.html',
  styleUrl: './dashboard-header.component.scss',
})
export class DashboardHeaderComponent {
  readonly lastUpdated = input('—');
  readonly visibleWidgets = input(0);
  readonly totalWidgets = input(DASHBOARD_WIDGET_MAX);
  readonly managePanelOpen = input(false);

  readonly manageWidgetsToggle = output<void>();
}
