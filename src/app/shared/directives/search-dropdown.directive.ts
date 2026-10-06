import { DestroyRef, Directive, ElementRef, HostListener, inject, output, Renderer2 } from '@angular/core';

export type SearchDropdownDismissEvent = {
  /** True when at least one suggestion was picked since the dropdown last opened. */
  picked: boolean;
};

const DISMISSED_CLASS = 'ks-fp__search-block--dismissed';

/**
 * Search box + suggestion list (`.ks-fp__autocomplete`) behaviour shared by the capture pages:
 * a plain click picks and closes the list; Ctrl/Shift+click picks and keeps it open for more
 * picks. Clicking outside, tabbing away or pressing Escape also closes it. Typing shows it again.
 */
@Directive({
  selector: '.ks-fp__search-block',
  standalone: true,
})
export class SearchDropdownDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private picked = false;
  private dismissed = false;

  readonly dismissedChange = output<SearchDropdownDismissEvent>({ alias: 'searchDismissed' });

  @HostListener('click', ['$event'])
  @HostListener('mousedown', ['$event'])
  onPick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.ks-fp__autocomplete button')) {
      return;
    }
    this.picked = true;
    if (event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    // Pages select on click, or on mousedown + preventDefault; close only after the page's handler ran.
    if (event.type === 'click' || event.defaultPrevented) {
      this.dismiss();
    }
  }

  @HostListener('input', ['$event'])
  onInputActivity(event: Event): void {
    if ((event.target as HTMLElement | null)?.matches('input')) {
      this.show();
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.dismiss();
  }

  @HostListener('focusout', ['$event'])
  onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && !this.host.nativeElement.contains(next)) {
      this.dismiss();
    }
  }

  constructor() {
    // Capture phase: grid ng-selects and similar widgets stop mousedown/click propagation.
    const onPointerDown = (event: Event) => {
      if (!event.composedPath().includes(this.host.nativeElement)) {
        this.dismiss();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    inject(DestroyRef).onDestroy(() =>
      document.removeEventListener('pointerdown', onPointerDown, true),
    );
  }

  private show(): void {
    if (this.dismissed) {
      this.dismissed = false;
      this.renderer.removeClass(this.host.nativeElement, DISMISSED_CLASS);
    }
  }

  private dismiss(): void {
    if (this.dismissed) {
      return;
    }
    this.dismissed = true;
    this.renderer.addClass(this.host.nativeElement, DISMISSED_CLASS);
    const picked = this.picked;
    this.picked = false;
    this.dismissedChange.emit({ picked });
  }
}
