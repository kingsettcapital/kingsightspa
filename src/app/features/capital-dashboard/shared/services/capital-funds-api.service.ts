import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import { FundDetailDto, FundInvestorDto, FundListItemDto, ListQueryParams, PagedResult } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CapitalFundsApiService {
  private readonly api = inject(ApiService);

  getFunds(params: ListQueryParams = {}): Observable<PagedResult<FundListItemDto>> {
    return this.api.get<PagedResult<FundListItemDto>>('api/Funds', params as any);
  }

  getFund(fundKey: number): Observable<FundDetailDto> {
    return this.api.get<FundDetailDto>(`api/Funds/${fundKey}`);
  }

  getFundInvestors(fundKey: number, params: { search?: string } = {}): Observable<FundInvestorDto[]> {
    return this.api.get<FundInvestorDto[]>(`api/Funds/${fundKey}/investors`, params as any);
  }
}

