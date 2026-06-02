import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import { LIST_PAGE_SIZE } from '../list-pagination.constants';
import {
  AssetsQueryParams,
  PagedResult,
  PropertyDetailDto,
  PropertyInvestmentDto,
  PropertyListItemDto,
} from '../models/api.models';
import { CapitalFundsApiService } from './capital-funds-api.service';

@Injectable({ providedIn: 'root' })
export class CapitalAssetsApiService {
  private readonly api = inject(ApiService);
  private readonly fundsApi = inject(CapitalFundsApiService);

  getAssets(params: AssetsQueryParams = {}): Observable<PagedResult<PropertyListItemDto>> {
    return this.api.get<PagedResult<PropertyListItemDto>>('api/Assets', params as any);
  }

  getAllAssets(params: AssetsQueryParams = {}): Observable<PropertyListItemDto[]> {
    const pageSize = params.pageSize ?? LIST_PAGE_SIZE;
    return this.getAssets({ ...params, page: 1, pageSize }).pipe(
      switchMap((first) => {
        const items = [...(first.items ?? [])];
        if (!first.hasNextPage) return of(items);
        const pages: Observable<PagedResult<PropertyListItemDto>>[] = [];
        for (let page = 2; page <= first.totalPages; page++) {
          pages.push(this.getAssets({ ...params, page, pageSize }));
        }
        return forkJoin(pages).pipe(map((rest) => items.concat(...rest.flatMap((p) => p.items ?? []))));
      }),
    );
  }

  getAsset(propertyKey: number): Observable<PropertyDetailDto> {
    // Kingsight API is expected to match portal DTO shape.
    return this.api.get<PropertyDetailDto>(`api/Assets/${propertyKey}`);
  }

  getAssetInvestments(propertyKey: number): Observable<PropertyInvestmentDto[]> {
    return this.api.get<PropertyInvestmentDto[]>(`api/Assets/${propertyKey}/investments`);
  }

  getAssetsForFundPage(
    fundKey: number,
    fundCode: string | null,
    page: number,
    search: string | undefined,
    pageSize = LIST_PAGE_SIZE,
  ): Observable<PagedResult<PropertyListItemDto>> {
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
          ...new Set(funds.map((fund) => fund.summary.fundCode?.trim()).filter((c): c is string => !!c)),
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

