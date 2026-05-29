import { createActionGroup, emptyProps, props } from '@ngrx/store';

import {
  FundDetailDto,
  FundInvestorDto,
  FundListItemDto,
  InvestorDetailDto,
  InvestorInvestmentDto,
  InvestorListItemDto,
  PagedResult,
  PropertyDetailDto,
  PropertyInvestmentDto,
  PropertyListItemDto,
} from '../shared/models/api.models';
import { CapitalDashboardTab } from './capital-dashboard.state';

export const CapitalDashboardShellActions = createActionGroup({
  source: 'Capital Dashboard Shell',
  events: {
    'Active Tab Changed': props<{ tab: CapitalDashboardTab }>(),
  },
});

/** Clears all Capital Dashboard API cache (call when leaving /capital-dashboard). */
export const CapitalDashboardCacheActions = createActionGroup({
  source: 'Capital Dashboard Cache',
  events: {
    'Reset All': emptyProps(),
  },
});

export const InvestorsApiActions = createActionGroup({
  source: 'Capital Dashboard Investors API',
  events: {
    'Load List': props<{ search: string; page: number; replace: boolean }>(),
    'Load List Success': props<{ result: PagedResult<InvestorListItemDto>; replace: boolean }>(),
    'Load List Failure': props<{ error: string }>(),
    'Load List More': emptyProps(),
    'Load Detail': props<{ investorKey: number }>(),
    'Load Detail Success': props<{
      investorKey: number;
      detail: InvestorDetailDto;
      investments: InvestorInvestmentDto[];
    }>(),
    'Load Detail Failure': props<{ error: string }>(),
    'Clear Detail': emptyProps(),
  },
});

export const FundsApiActions = createActionGroup({
  source: 'Capital Dashboard Funds API',
  events: {
    'Load List': props<{ search: string; page: number; replace: boolean }>(),
    'Load List Success': props<{ result: PagedResult<FundListItemDto>; replace: boolean }>(),
    'Load List Failure': props<{ error: string }>(),
    'Load List More': emptyProps(),
    'Load Detail': props<{ fundKey: number }>(),
    'Load Detail Success': props<{
      fundKey: number;
      detail: FundDetailDto;
      investors: FundInvestorDto[];
      assets: PropertyListItemDto[];
      assetsHasNextPage: boolean;
      assetsFundCode: string | null;
    }>(),
    'Load Detail Failure': props<{ error: string }>(),
    'Load Fund Assets Page': props<{ fundKey: number; fundCode: string; page: number }>(),
    'Load Fund Assets Page Success': props<{
      page: number;
      items: PropertyListItemDto[];
      hasNextPage: boolean;
      append: boolean;
    }>(),
    'Load Fund Assets Page Failure': emptyProps(),
    'Clear Detail': emptyProps(),
  },
});

export const AssetsApiActions = createActionGroup({
  source: 'Capital Dashboard Assets API',
  events: {
    'Load List': props<{ search: string; page: number; replace: boolean }>(),
    'Load List Success': props<{ result: PagedResult<PropertyListItemDto>; replace: boolean }>(),
    'Load List Failure': props<{ error: string }>(),
    'Load List More': emptyProps(),
    'Load Detail': props<{ propertyKey: number }>(),
    'Load Detail Success': props<{
      propertyKey: number;
      detail: PropertyDetailDto;
      investments: PropertyInvestmentDto[];
    }>(),
    'Load Detail Failure': props<{ error: string }>(),
    'Clear Detail': emptyProps(),
  },
});
