export interface ScrollListItemOptions {
  rowIndex?: number;
  onSuccess?: () => void;
  maxAttempts?: number;
  delayMs?: number;
}

export function scrollListItemIntoView(
  getContainer: () => HTMLElement | null | undefined,
  key: number | string | null | undefined,
  options: ScrollListItemOptions = {},
): void {
  if (key == null) return;

  const maxAttempts = options.maxAttempts ?? 20;
  const delayMs = options.delayMs ?? 50;
  const keyValue = String(key);

  const tryScroll = (attempt: number) => {
    const container = getContainer();
    if (!container) {
      if (attempt < maxAttempts) setTimeout(() => tryScroll(attempt + 1), delayMs);
      return;
    }

    let row =
      container.querySelector<HTMLElement>(`[data-list-key="${keyValue}"]`) ??
      container.querySelector<HTMLElement>(`tr[data-list-key="${keyValue}"]`);

    if (!row && options.rowIndex != null && options.rowIndex >= 0) {
      const rows = container.querySelectorAll<HTMLElement>('tr.mat-mdc-row');
      row = rows[options.rowIndex] ?? undefined;
    }

    if (row) {
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      options.onSuccess?.();
      return;
    }

    if (attempt < maxAttempts) setTimeout(() => tryScroll(attempt + 1), delayMs);
  };

  tryScroll(0);
}

