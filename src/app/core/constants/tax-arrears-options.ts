const CURRENT_YEAR = new Date().getFullYear();

export const TAX_YEAR_OPTIONS = Array.from({ length: 16 }, (_, index) => {
  const year = String(CURRENT_YEAR - 5 + index);
  return { value: year, label: year };
});
