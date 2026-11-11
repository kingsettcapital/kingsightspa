export interface CmhcPipelineDto {
  asOf: string;
  generatedAt: string;
  columns: string[];
  rows: (string | number | null)[][];
  links: (string | null)[];
}

export type CmhcStateKey = 'hist' | 'alloc-locked' | 'alloc-weights' | 'alloc-workdays' | 'tl-hidden';

export interface CmhcReportStateDto {
  key: string;
  value: unknown | null;
  version: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

/** The report's computed model (`buildData` output). Produced by the generated legacy engine. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CmhcData = any;
/** One deal row inside {@link CmhcData}. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CmhcDeal = any;

/** What the shared list modal is showing. */
export type CmhcListPopup =
  | { kind: 'deals'; name: string; sub: string; deals: CmhcDeal[]; showOrig: boolean }
  | { kind: 'issue'; category: CmhcIssueCategory; funded: boolean; uwFilter: string }
  | { kind: 'tl'; label: string; sub: string; list: CmhcDeal[] }
  | { kind: 'move'; pool: string }
  | { kind: 'funded'; pool: string };

/** One Data Issues category (v4 computeDataIssues / computeFundedIssues). */
export interface CmhcIssueCategory {
  title: string;
  desc: string;
  dot: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deals: any[];
  key?: string | null;
}
