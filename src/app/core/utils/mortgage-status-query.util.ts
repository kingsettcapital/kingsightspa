import { HttpParams } from '@angular/common/http';

/** Appends mortgage status filter query params (supports status_key 0 and "(null)"). */
export function appendMortgageStatusParams(
  params: HttpParams,
  statuses: readonly (string | number | null | undefined)[],
): HttpParams {
  let next = params;
  for (const raw of statuses) {
    if (raw === null || raw === undefined) {
      continue;
    }
    const token = String(raw).trim();
    if (!token.length) {
      continue;
    }
    next = next.append('statuses', token);
  }
  return next;
}
