export interface CmhcPipelineDto {
  asOf: string;
  generatedAt: string;
  columns: string[];
  rows: (string | number | null)[][];
  links: (string | null)[];
}

export type CmhcStateKey =
  | 'hist'
  | 'alloc-locked'
  | 'alloc-weights'
  | 'alloc-workdays'
  | 'tl-hidden'
  | 'alloc-coverage'
  | 'alloc-active'
  | 'alloc-active-reset'
  | 'rev-vacations'
  | 'rev-cal-capacity'
  | 'renewal-milestones'
  | 'sponsor-pairs'
  | 'wip-marks'
  | 'wip-credits'
  | 'ffa-stamps';

export interface CmhcReportStateDto {
  key: string;
  value: unknown | null;
  version: number;
  updatedAt?: string | null;
  updatedBy?: string | null;
}

/** CMHC sub-roles (User Management). Admin is the app-level role. */
export type CmhcRole = 'Underwriter' | 'Reviewer' | 'Originator';

/** GET api/CmhcDashboard/access/me */
export interface CmhcMyAccessDto {
  isAdmin: boolean;
  roles: CmhcRole[];
  /** Name as it appears in the loan data (Funder/Underwriter or Originating Originator). */
  linkedName: string | null;
  /** Admin or Reviewer: the pipeline is not filtered. */
  seesAllLoans: boolean;
  /** False when the user has no CMHC sub-role and is not an Admin. */
  hasAccess: boolean;
}
