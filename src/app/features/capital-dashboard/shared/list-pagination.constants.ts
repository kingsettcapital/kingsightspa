export const LIST_PAGE_SIZE = 25;
/** Default page size for Investors / Investments / Assets list pages. */
export const LIST_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type ListPageSizeOption = (typeof LIST_PAGE_SIZE_OPTIONS)[number];

export const INVESTORS_LIST_PAGE_SIZE: ListPageSizeOption = 50;
export const FUNDS_LIST_PAGE_SIZE: ListPageSizeOption = 50;
export const ASSETS_LIST_PAGE_SIZE: ListPageSizeOption = 50;