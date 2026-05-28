import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiService } from '../../../../core/services/api.service';
import {
  InvestorDetailDto,
  InvestorInvestmentDto,
  InvestorListItemDto,
  ListQueryParams,
  PagedResult,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CapitalInvestorsApiService {
  private readonly api = inject(ApiService);

  getInvestors(params: ListQueryParams = {}): Observable<PagedResult<InvestorListItemDto>> {
    return this.api.get<PagedResult<InvestorListItemDto>>('api/Investors', params as any);
  }

  getInvestor(investorKey: number): Observable<InvestorDetailDto> {
    return this.api.get<InvestorDetailDto>(`api/Investors/${investorKey}`);
  }

  getInvestorInvestments(investorKey: number): Observable<InvestorInvestmentDto[]> {
    return this.api.get<InvestorInvestmentDto[]>(`api/Investors/${investorKey}/investments`);
  }
}

