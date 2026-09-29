import { WritableSignal } from '@angular/core';

import { InvestorDetailSidebarSection } from '../../investors/investor-detail/models/investor-detail-table.models';

const OVERVIEW_SCROLL_TOP_MAX = 48;
const SECTION_ACTIVATION_OFFSET = 96;
const SECTION_TOP_TOLERANCE_PX = 32;

export function flattenSidebarSectionIds(sections: InvestorDetailSidebarSection[]): string[] {
  return sections.flatMap((section) => section.items.map((item) => item.id));
}

function resolveSectionActivationOffset(
  offset?: number | (() => number),
): number {
  if (typeof offset === 'function') {
    return offset();
  }

  return offset ?? SECTION_ACTIVATION_OFFSET;
}

function sectionRelativeTop(target: HTMLElement, mainTop: number): number {
  return target.getBoundingClientRect().top - mainTop;
}

export function bindDetailSectionScrollSpy(params: {
  main: HTMLElement;
  sectionIds: string[];
  activeSectionId: WritableSignal<string>;
  isPaused?: () => boolean;
  sectionActivationOffset?: number | (() => number);
}): () => void {
  const { main, sectionIds, activeSectionId, isPaused, sectionActivationOffset } = params;
  let frame = 0;

  const updateActiveSection = (): void => {
    if (isPaused?.()) {
      return;
    }

    const overviewId = sectionIds[0] ?? 'overview';
    const contentSectionIds = sectionIds.slice(1);
    const activationOffset = resolveSectionActivationOffset(sectionActivationOffset);
    const mainTop = main.getBoundingClientRect().top;

    let nextActive = overviewId;
    let nearestBelowStickyId: string | null = null;
    let nearestBelowStickyTop = Number.POSITIVE_INFINITY;
    let lastPassedId: string | null = null;

    for (const id of contentSectionIds) {
      const target = main.querySelector<HTMLElement>(`#inv-section-${id}`);
      if (!target) {
        continue;
      }

      const relativeTop = sectionRelativeTop(target, mainTop);

      if (relativeTop < activationOffset) {
        lastPassedId = id;
      }

      if (
        relativeTop >= activationOffset - SECTION_TOP_TOLERANCE_PX &&
        relativeTop < nearestBelowStickyTop
      ) {
        nearestBelowStickyTop = relativeTop;
        nearestBelowStickyId = id;
      }
    }

    if (nearestBelowStickyId) {
      nextActive = nearestBelowStickyId;
    } else if (lastPassedId) {
      nextActive = lastPassedId;
    }

    if (main.scrollTop <= OVERVIEW_SCROLL_TOP_MAX) {
      nextActive = overviewId;
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
