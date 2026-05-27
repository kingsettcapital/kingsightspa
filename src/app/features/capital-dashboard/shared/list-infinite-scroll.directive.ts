import { Directive, ElementRef, EventEmitter, inject, Output } from '@angular/core';

@Directive({
  selector: '[appListInfiniteScroll]',
  standalone: true,
})
export class ListInfiniteScrollDirective {
  private readonly el = inject(ElementRef<HTMLElement>);

  @Output() scrolledToEnd = new EventEmitter<void>();

  private readonly onScroll = () => {
    const element = this.el.nativeElement;
    const thresholdPx = 120;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - thresholdPx) {
      this.scrolledToEnd.emit();
    }
  };

  constructor() {
    queueMicrotask(() => {
      this.el.nativeElement.addEventListener('scroll', this.onScroll, { passive: true });
    });
  }
}

