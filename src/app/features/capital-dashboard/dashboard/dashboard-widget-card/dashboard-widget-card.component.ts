import { Component, input } from '@angular/core';

@Component({
  selector: 'app-dashboard-widget-card',
  standalone: true,
  templateUrl: './dashboard-widget-card.component.html',
  styleUrl: './dashboard-widget-card.component.scss',
})
export class DashboardWidgetCardComponent {
  readonly title = input.required<string>();
}
