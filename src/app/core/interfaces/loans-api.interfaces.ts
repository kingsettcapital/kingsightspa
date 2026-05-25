import { LoanApiRecord } from './loan.interfaces';

/** Per-call override for mock vs live Loans API (used by Loans & Ranking). */
export type LoansApiCallOptions = {
  useExampleData?: boolean;
};

/** GET /api/Loans paginated response. */
export type LoansPagedApiResponse = {
  items?: LoanApiRecord[];
  Items?: LoanApiRecord[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
};
