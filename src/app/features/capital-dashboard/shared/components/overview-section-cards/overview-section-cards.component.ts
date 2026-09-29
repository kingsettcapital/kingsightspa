import { Component, input } from '@angular/core';

import type { SectionCard } from '../../utils/dynamic-sections.util';

@Component({
  selector: 'app-overview-section-cards',
  standalone: true,
  templateUrl: './overview-section-cards.component.html',
  styleUrl: './overview-section-cards.component.scss',
})
export class OverviewSectionCardsComponent {
  readonly cards = input.required<readonly SectionCard[]>();
}
