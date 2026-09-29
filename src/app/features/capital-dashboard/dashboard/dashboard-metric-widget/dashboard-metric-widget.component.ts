import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type DashboardMetricVariant = 'navy' | 'blue' | 'blue-light' | 'gold' | 'slate';

@Component({
  selector: 'app-dashboard-metric-widget',
  standalone: true,
  imports: [NgClass, MatIconModule],
  templateUrl: './dashboard-metric-widget.component.html',
  styleUrl: './dashboard-metric-widget.component.scss',
})
export class DashboardMetricWidgetComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly hint = input('');
  readonly change = input('');
  readonly changePositive = input(true);
  readonly variant = input<DashboardMetricVariant>('blue');
}
