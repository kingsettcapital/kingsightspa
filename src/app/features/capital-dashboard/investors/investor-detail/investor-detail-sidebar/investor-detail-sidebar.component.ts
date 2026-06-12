import { Component, input, output } from '@angular/core';

import { InvestorDetailSidebarSection } from '../models/investor-detail-table.models';

@Component({
  selector: 'app-investor-detail-sidebar',
  standalone: true,
  templateUrl: './investor-detail-sidebar.component.html',
  styleUrl: './investor-detail-sidebar.component.scss',
})
export class InvestorDetailSidebarComponent {
  readonly sections = input.required<readonly InvestorDetailSidebarSection[]>();
  readonly activeSectionId = input.required<string>();

  readonly sectionSelect = output<string>();
}
