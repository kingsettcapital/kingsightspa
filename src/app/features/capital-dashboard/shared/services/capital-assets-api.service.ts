import { inject, Injectable } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import { LIST_PAGE_SIZE } from '../list-pagination.constants';
import {
  AssetsFilterOptionsDto,
  AssetsPagedResult,
  AssetsQueryParams,
  AssetFundHoldingDto,
  AssetFinancialMetricsDto,
  AssetAcquisitionSaleDto,
  AssetPropertyDetailDto,
  AssetTypeSummaryDto,
  PropertyDetailDto,
  PropertyLeasingSummaryDto,
  PropertyListItemDto,
} from '../models/api.models';
import { CapitalFundsApiService } from './capital-funds-api.service';

@Injectable({ providedIn: 'root' })
export class CapitalAssetsApiService {
  private readonly api = inject(ApiService);
  private readonly fundsApi = inject(CapitalFundsApiService);

  getAssets(params: AssetsQueryParams = {}): Observable<AssetsPagedResult> {
    return this.api.get<AssetsPagedResult>('api/Assets', params as any);
  }

  getFilterOptions(): Observable<AssetsFilterOptionsDto> {
    return this.api.get<AssetsFilterOptionsDto>('api/Assets/filter-options');
  }

  getAllAssets(params: AssetsQueryParams = {}): Observable<PropertyListItemDto[]> {
    const pageSize = params.pageSize ?? LIST_PAGE_SIZE;
    return this.getAssets({ ...params, page: 1, pageSize }).pipe(
      switchMap((first) => {
        const items = [...(first.items ?? [])];
        if (!first.hasNextPage) return of(items);
        const pages: Observable<AssetsPagedResult>[] = [];
        for (let page = 2; page <= first.totalPages; page++) {
          pages.push(this.getAssets({ ...params, page, pageSize }));
        }
        return forkJoin(pages).pipe(map((rest) => items.concat(...rest.flatMap((p) => p.items ?? []))));
      }),
    );
  }

  getAsset(propertyKey: number): Observable<PropertyDetailDto> {
    return this.api.get<PropertyDetailDto>(`api/Assets/${propertyKey}`);
  }

  getAssetLeasingSummary(propertyKey: number): Observable<PropertyLeasingSummaryDto> {
    return this.api.get<PropertyLeasingSummaryDto>(`api/Assets/${propertyKey}/leasing-summary`);
  }

  getAssetFundHoldings(propertyKey: number): Observable<AssetFundHoldingDto[]> {
    return this.api.get<AssetFundHoldingDto[]>(`api/Assets/${propertyKey}/fund-holdings`);
  }

  getAssetPropertyDetails(propertyKey: number): Observable<AssetPropertyDetailDto[]> {
    return this.api.get<AssetPropertyDetailDto[]>(`api/Assets/${propertyKey}/property-details`);
  }

  getAssetTypeSummary(propertyKey: number): Observable<AssetTypeSummaryDto[]> {
    return this.api.get<AssetTypeSummaryDto[]>(`api/Assets/${propertyKey}/asset-type-summary`);
  }

  getAssetFinancialMetrics(propertyKey: number): Observable<AssetFinancialMetricsDto | null> {
    return this.api.get<AssetFinancialMetricsDto>(`api/Assets/${propertyKey}/financial-metrics`).pipe(
      catchError(() => of(null)),
    );
  }

  getAssetAcquisitionSale(propertyKey: number): Observable<AssetAcquisitionSaleDto | null> {
    return this.api.get<AssetAcquisitionSaleDto>(`api/Assets/${propertyKey}/acquisition-sale`).pipe(
      catchError(() => of(null)),
    );
  }

  getAssetsForFundPage(
    fundKey: number,
    fundCode: string | null,
    page: number,
    search: string | undefined,
    pageSize = LIST_PAGE_SIZE,
  ): Observable<AssetsPagedResult> {
    if (!fundCode?.trim()) {
      return of({
        items: [],
        page,
        pageSize,
        totalCount: 0,
        totalPages: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    }
    return this.getAssets({ fundCode: fundCode.trim(), fundKey, search, page, pageSize });
  }

  getAssetsForInvestorFundKeys(fundKeys: readonly number[]): Observable<PropertyListItemDto[]> {
    const uniqueKeys = [...new Set(fundKeys)];
    if (uniqueKeys.length === 0) return of([]);

    return forkJoin(uniqueKeys.map((fundKey) => this.fundsApi.getFund(fundKey))).pipe(
      switchMap((funds) => {
        const codes = [
          ...new Set(funds.map((fund) => fund.summary?.fundCode?.trim()).filter((c): c is string => !!c)),
        ];
        if (codes.length === 0) return of([]);
        return forkJoin(codes.map((code) => this.getAllAssets({ search: code }))).pipe(
          map((pages) => dedupeProperties(pages.flat())),
        );
      }),
    );
  }
}

function dedupeProperties(items: PropertyListItemDto[]): PropertyListItemDto[] {
  const seen = new Set<number>();
  return items.filter((item) => {
    if (seen.has(item.propertyKey)) return false;
    seen.add(item.propertyKey);
    return true;
  });
}

