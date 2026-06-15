import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { DashboardMetricViewModel } from '../dashboard-widget-api.util';

@Component({
  selector: 'app-total-assets-widget',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './total-assets-widget.component.html',
  styleUrl: './total-assets-widget.component.scss',
})
export class TotalAssetsWidgetComponent {
  readonly metric = input<DashboardMetricViewModel | null>(null);
}
