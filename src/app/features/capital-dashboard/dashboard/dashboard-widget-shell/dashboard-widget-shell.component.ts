import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type DashboardWidgetCloseVariant = 'on-dark' | 'on-light';

@Component({
  selector: 'app-dashboard-widget-shell',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './dashboard-widget-shell.component.html',
  styleUrl: './dashboard-widget-shell.component.scss',
})
export class DashboardWidgetShellComponent {
  readonly closeVariant = input<DashboardWidgetCloseVariant>('on-dark');
  readonly ariaLabel = input('Remove widget');

  readonly remove = output<void>();

  onRemove(): void {
    this.remove.emit();
  }
}
