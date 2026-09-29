/** True when the loan has no alias assigned yet. */
export function isUnassignedLoanAlias(alias: string | null | undefined): boolean {
  const normalized = alias?.trim() ?? '';
  return !normalized || normalized === '-' || normalized === '—';
}
