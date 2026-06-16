import { WritableSignal } from '@angular/core';

import { InvestorDetailSidebarSection } from '../../investors/investor-detail/models/investor-detail-table.models';

const OVERVIEW_SCROLL_TOP_MAX = 48;
const SECTION_ACTIVATION_OFFSET = 96;

export function flattenSidebarSectionIds(sections: InvestorDetailSidebarSection[]): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.id));
}

export function bindDetailSectionScrollSpy(params: {
  main: HTMLElement;
  sectionIds: string[];
  activeSectionId: WritableSignal<string>;
  isPaused?: () => boolean;
}): () => void {
  const { main, sectionIds, activeSectionId, isPaused } = params;
  let frame = 0;

  const updateActiveSection = (): void => {
    if (isPaused?.()) {
      return;
    }

    const overviewId = sectionIds[0] ?? 'overview';

    if (main.scrollTop <= OVERVIEW_SCROLL_TOP_MAX) {
      if (activeSectionId() !== overviewId) {
        activeSectionId.set(overviewId);
      }
      return;
    }

    const mainTop = main.getBoundingClientRect().top;
    let nextActive = overviewId;

    for (const id of sectionIds.slice(1)) {
      const target = main.querySelector<HTMLElement>(`#inv-section-${id}`);
      if (!target) {
        continue;
      }

      const relativeTop = target.getBoundingClientRect().top - mainTop;
      if (relativeTop <= SECTION_ACTIVATION_OFFSET) {
        nextActive = id;
      }
    }

    if (activeSectionId() !== nextActive) {
      activeSectionId.set(nextActive);
    }
  };

  const onScroll = (): void => {
    if (frame) {
      cancelAnimationFrame(frame);
    }

    frame = requestAnimationFrame(updateActiveSection);
  };

  main.addEventListener('scroll', onScroll, { passive: true });
  requestAnimationFrame(updateActiveSection);

  return () => {
    main.removeEventListener('scroll', onScroll);
    if (frame) {
      cancelAnimationFrame(frame);
    }
  };
}
