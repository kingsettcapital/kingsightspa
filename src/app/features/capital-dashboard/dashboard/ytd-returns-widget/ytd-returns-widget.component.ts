import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { DashboardMetricViewModel } from '../dashboard-widget-api.util';

@Component({
  selector: 'app-ytd-returns-widget',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './ytd-returns-widget.component.html',
  styleUrl: './ytd-returns-widget.component.scss',
})
export class YtdReturnsWidgetComponent {
  readonly metric = input<DashboardMetricViewModel | null>(null);
}
