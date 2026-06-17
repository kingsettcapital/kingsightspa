import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { parseJsonPreservingLongIds, TEMPLATE_ID_JSON_KEYS } from '../../../core/utils/json-id-parse.util';
import { ApiService } from '../../../core/services/api.service';
import {
  DataExplorerColumnGroupDto,
  DataExplorerDataRequest,
  DataExplorerDataResponse,
  DataExplorerTemplateDto,
  DataExplorerTemplateListItemDto,
  DataExplorerTemplateUpsertRequest,
} from '../interfaces/data-explorer-api.models';

import { DATA_EXPLORER_DEFAULT_PAGE_SIZE } from '../constants/data-explorer.constants';

export const DATA_EXPLORER_PAGE_SIZE = DATA_EXPLORER_DEFAULT_PAGE_SIZE;

@Injectable({ providedIn: 'root' })
export class DataExplorerApiService {
  private readonly api = inject(ApiService);

  getColumns(): Observable<DataExplorerColumnGroupDto[]> {
    return this.api.get<DataExplorerColumnGroupDto[]>('api/data-explorer/columns');
  }

  queryData(request: DataExplorerDataRequest): Observable<DataExplorerDataResponse> {
    return this.api.post<DataExplorerDataResponse>('api/data-explorer/data', request);
  }

  listTemplates(): Observable<DataExplorerTemplateListItemDto[]> {
    return this.api.getText('api/data-explorer/templates').pipe(
      map((json) => parseJsonPreservingLongIds<DataExplorerTemplateListItemDto[]>(json, TEMPLATE_ID_JSON_KEYS)),
    );
  }

  getTemplate(templateId: string): Observable<DataExplorerTemplateDto> {
    return this.api.getText(`api/data-explorer/templates/${templateId}`).pipe(
      map((json) => parseJsonPreservingLongIds<DataExplorerTemplateDto>(json, TEMPLATE_ID_JSON_KEYS)),
    );
  }

  createTemplate(request: DataExplorerTemplateUpsertRequest): Observable<DataExplorerTemplateDto> {
    return this.api.postText('api/data-explorer/templates', request).pipe(
      map((json) => parseJsonPreservingLongIds<DataExplorerTemplateDto>(json, TEMPLATE_ID_JSON_KEYS)),
    );
  }

  updateTemplate(
    templateId: string,
    request: DataExplorerTemplateUpsertRequest,
  ): Observable<DataExplorerTemplateDto> {
    return this.api.putText(`api/data-explorer/templates/${templateId}`, request).pipe(
      map((json) => parseJsonPreservingLongIds<DataExplorerTemplateDto>(json, TEMPLATE_ID_JSON_KEYS)),
    );
  }

  deleteTemplate(templateId: string): Observable<void> {
    return this.api.delete<void>(`api/data-explorer/templates/${templateId}`);
  }
}
