import { DestroyRef, Directive, ElementRef, EventEmitter, inject, Output } from '@angular/core';

@Directive({
  selector: '[appListInfiniteScroll]',
  standalone: true,
})
export class ListInfiniteScrollDirective {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  @Output() scrolledToEnd = new EventEmitter<void>();

  private scrollHost: HTMLElement | null = null;

  private readonly onScroll = () => {
    const element = this.scrollHost ?? this.el.nativeElement;
    const thresholdPx = 120;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - thresholdPx) {
      this.scrolledToEnd.emit();
    }
  };

  constructor() {
    queueMicrotask(() => {
      const host = findScrollableHost(this.el.nativeElement) ?? this.el.nativeElement;
      this.scrollHost = host;
      host.addEventListener('scroll', this.onScroll, { passive: true });
      this.destroyRef.onDestroy(() => {
        host.removeEventListener('scroll', this.onScroll);
      });
    });
  }
}

function findScrollableHost(start: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = start;
  while (node) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY;
    const canScrollY = overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
    if (canScrollY && node.scrollHeight > node.clientHeight + 1) return node;
    node = node.parentElement;
  }
  return null;
}

