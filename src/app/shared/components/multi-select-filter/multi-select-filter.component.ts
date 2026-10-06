import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

/**
 * Searchable checkbox dropdown for report filter panels.
 * `allValue` is exclusive: picking it clears other selections; clearing every
 * other selection falls back to it.
 */
@Component({
  selector: 'app-multi-select-filter',
  standalone: true,
  templateUrl: './multi-select-filter.component.html',
  styleUrl: './multi-select-filter.component.css',
})
export class MultiSelectFilterComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly options = input<string[]>([]);
  readonly selected = input<string[]>([]);
  readonly allValue = input('All');
  readonly placeholder = input('Search…');
  readonly ariaLabel = input('');

  readonly selectedChange = output<string[]>();

  readonly isOpen = signal(false);
  readonly searchText = signal('');

  private readonly selectedSet = computed(
    () => new Set(this.selected().map((value) => value.toLowerCase())),
  );

  readonly isAllSelected = computed(() => {
    const all = this.allValue().toLowerCase();
    const values = this.selected().filter((value) => value.trim());
    return !values.length || values.some((value) => value.toLowerCase() === all);
  });

  readonly triggerLabel = computed(() => {
    if (this.isAllSelected()) {
      return this.allValue();
    }
    const values = this.selected();
    return values.length === 1 ? values[0] : `${values.length} selected`;
  });

  readonly triggerTitle = computed(() => (this.isAllSelected() ? this.allValue() : this.selected().join('; ')));

  /** Non-All options matching the search; selected items float to the top when not searching. */
  readonly visibleOptions = computed(() => {
    const all = this.allValue().toLowerCase();
    const term = this.searchText().trim().toLowerCase();
    const options = this.options().filter((option) => option.trim() && option.toLowerCase() !== all);
    if (term) {
      return options.filter((option) => option.toLowerCase().includes(term));
    }
    const selected = this.selectedSet();
    return [
      ...options.filter((option) => selected.has(option.toLowerCase())),
      ...options.filter((option) => !selected.has(option.toLowerCase())),
    ];
  });

  isSelected(option: string): boolean {
    return !this.isAllSelected() && this.selectedSet().has(option.toLowerCase());
  }

  toggleOpen(): void {
    if (this.isOpen()) {
      this.close();
      return;
    }
    this.isOpen.set(true);
    queueMicrotask(() => this.searchInput()?.nativeElement.focus());
  }

  close(): void {
    this.isOpen.set(false);
    this.searchText.set('');
  }

  selectAll(): void {
    this.selectedChange.emit([this.allValue()]);
  }

  toggleOption(option: string): void {
    const key = option.toLowerCase();
    const current = this.isAllSelected() ? [] : this.selected();
    const next = current.some((value) => value.toLowerCase() === key)
      ? current.filter((value) => value.toLowerCase() !== key)
      : [...current, option];
    this.selectedChange.emit(next.length ? next : [this.allValue()]);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const [first] = this.visibleOptions();
      if (first) {
        this.toggleOption(first);
      }
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isOpen() && !this.host.nativeElement.contains(event.target as Node)) {
      this.close();
    }
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.close();
  }
}
