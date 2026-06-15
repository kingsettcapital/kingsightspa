import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { DashboardMetricViewModel } from '../dashboard-widget-api.util';

@Component({
  selector: 'app-portfolio-value-widget',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './portfolio-value-widget.component.html',
  styleUrl: './portfolio-value-widget.component.scss',
})
export class PortfolioValueWidgetComponent {
  readonly metric = input<DashboardMetricViewModel | null>(null);
}
