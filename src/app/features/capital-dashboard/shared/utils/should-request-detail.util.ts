/** Skip duplicate detail fetches when the same key is already loading or loaded. */
export function shouldRequestDetail(
  selectedKey: number | null,
  loading: boolean,
  hasDetail: boolean,
  requestedKey: number,
): boolean {
  if (selectedKey !== requestedKey) return true;
  if (hasDetail) return false;
  if (loading) return false;
  return true;
}
