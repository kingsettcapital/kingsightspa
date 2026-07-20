/** Ignores stale HTTP responses when filters change faster than the API returns. */
export function createMortgageLoadRequestGuard() {
  let latestId = 0;
  return {
    next: (): number => ++latestId,
    isLatest: (id: number): boolean => id === latestId,
  };
}
