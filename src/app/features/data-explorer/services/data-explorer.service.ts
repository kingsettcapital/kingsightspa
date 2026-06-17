import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import { SavedQuery, SaveQueryPayload } from '../interfaces/data-explorer.interfaces';
import {
  mapSavedQueryStateToTemplateRequest,
  mapTemplateListItemToSavedQuery,
  mapTemplateToSavedQuery,
} from '../utils/data-explorer.mapper';
import { DataExplorerApiService } from './data-explorer-api.service';

@Injectable({
  providedIn: 'root',
})
export class DataExplorerService {
  private readonly api = inject(DataExplorerApiService);

  getSavedQueries(): Observable<SavedQuery[]> {
    return this.api.listTemplates().pipe(
      map((items) => items.map(mapTemplateListItemToSavedQuery)),
      catchError(() => throwError(() => new Error('Unable to load saved queries. Please try again.'))),
    );
  }

  getQuery(templateId: string): Observable<SavedQuery> {
    return this.api.getTemplate(templateId).pipe(
      map(mapTemplateToSavedQuery),
      catchError(() => throwError(() => new Error('Unable to load saved query. Please try again.'))),
    );
  }

  saveQuery(
    payload: SaveQueryPayload,
    state: Omit<SavedQuery, 'id' | 'name' | 'description' | 'savedAt'>,
  ): Observable<SavedQuery> {
    const request = mapSavedQueryStateToTemplateRequest(payload, state);
    return this.api.createTemplate(request).pipe(
      map(mapTemplateToSavedQuery),
      catchError(() => throwError(() => new Error('Unable to save query. Please try again.'))),
    );
  }

  updateQuery(
    templateId: string,
    payload: SaveQueryPayload,
    state: Omit<SavedQuery, 'id' | 'name' | 'description' | 'savedAt'>,
  ): Observable<SavedQuery> {
    const request = mapSavedQueryStateToTemplateRequest(payload, state);
    return this.api.updateTemplate(templateId, request).pipe(
      map(mapTemplateToSavedQuery),
      catchError(() => throwError(() => new Error('Unable to update query. Please try again.'))),
    );
  }

  deleteQuery(templateId: string): Observable<void> {
    return this.api.deleteTemplate(templateId).pipe(
      catchError(() => throwError(() => new Error('Unable to delete query. Please try again.'))),
    );
  }
}
