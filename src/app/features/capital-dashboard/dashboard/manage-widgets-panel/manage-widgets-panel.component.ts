import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { DASHBOARD_WIDGET_MAX, DashboardWidgetDefinition, DashboardWidgetId } from '../dashboard-widgets.model';

@Component({
  selector: 'app-manage-widgets-panel',
  standalone: true,
  imports: [MatIconModule],
  templateUrl: './manage-widgets-panel.component.html',
  styleUrl: './manage-widgets-panel.component.scss',
})
export class ManageWidgetsPanelComponent {
  readonly widgets = input.required<readonly DashboardWidgetDefinition[]>();
  readonly selectedIds = input.required<readonly DashboardWidgetId[]>();
  readonly maxSelection = input(DASHBOARD_WIDGET_MAX);

  readonly selectionChange = output<DashboardWidgetId[]>();

  isSelected(id: DashboardWidgetId): boolean {
    return this.selectedIds().includes(id);
  }

  isDisabled(id: DashboardWidgetId): boolean {
    return !this.isSelected(id) && this.selectedIds().length >= this.maxSelection();
  }

  toggleWidget(id: DashboardWidgetId): void {
    if (this.isSelected(id)) {
      this.selectionChange.emit(this.selectedIds().filter((widgetId) => widgetId !== id));
      return;
    }

    if (this.isDisabled(id)) {
      return;
    }

    this.selectionChange.emit([...this.selectedIds(), id]);
  }
}
