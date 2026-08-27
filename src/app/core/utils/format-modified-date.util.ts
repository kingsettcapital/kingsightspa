/** Shared Modified Date display: Eastern Time, 24-hour clock, no AM/PM. */
export function formatModifiedDate(value: string | null | undefined): string {
  if (!value?.trim() || value === '-') {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
