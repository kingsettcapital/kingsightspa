import { Injectable } from '@angular/core';

import {
  DEFAULT_SAVED_QUERIES,
  MOCK_PROPERTY_RECORDS,
  SAVED_QUERIES_STORAGE_KEY,
} from '../constants/data-explorer.constants';
import { DataExplorerRecord, SavedQuery, SaveQueryPayload } from '../interfaces/data-explorer.interfaces';
import { generateQueryId } from '../utils/data-explorer.utils';

@Injectable({
  providedIn: 'root',
})
export class DataExplorerService {
  getRecords(): DataExplorerRecord[] {
    return [...MOCK_PROPERTY_RECORDS];
  }

  getSavedQueries(): SavedQuery[] {
    const stored = localStorage.getItem(SAVED_QUERIES_STORAGE_KEY);
    if (!stored) {
      this.persistSavedQueries(DEFAULT_SAVED_QUERIES);
      return [...DEFAULT_SAVED_QUERIES];
    }

    try {
      return JSON.parse(stored) as SavedQuery[];
    } catch {
      return [...DEFAULT_SAVED_QUERIES];
    }
  }

  deleteQuery(queryId: string): void {
    const queries = this.getSavedQueries().filter((query) => query.id !== queryId);
    this.persistSavedQueries(queries);
  }

  saveQuery(payload: SaveQueryPayload, state: Omit<SavedQuery, 'id' | 'name' | 'description' | 'savedAt'>): SavedQuery {
    const queries = this.getSavedQueries();
    const newQuery: SavedQuery = {
      id: generateQueryId(),
      name: payload.name.trim(),
      description: payload.description?.trim() || undefined,
      savedAt: new Date().toISOString(),
      ...state,
    };

    queries.unshift(newQuery);
    this.persistSavedQueries(queries);
    return newQuery;
  }

  private persistSavedQueries(queries: SavedQuery[]): void {
    localStorage.setItem(SAVED_QUERIES_STORAGE_KEY, JSON.stringify(queries));
  }
}
