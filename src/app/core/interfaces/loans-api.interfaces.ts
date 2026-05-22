import { LoanApiRecord } from './loan.interfaces';

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
