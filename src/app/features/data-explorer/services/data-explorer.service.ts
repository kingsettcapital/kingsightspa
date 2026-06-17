import { Injectable } from '@angular/core';

import { SAVED_QUERIES_STORAGE_KEY, LEGACY_SEEDED_SAVED_QUERY_IDS } from '../constants/data-explorer.constants';
import { SavedQuery, SaveQueryPayload } from '../interfaces/data-explorer.interfaces';
import { generateQueryId } from '../utils/data-explorer.utils';

@Injectable({
  providedIn: 'root',
})
export class DataExplorerService {
  getSavedQueries(): SavedQuery[] {
    const stored = localStorage.getItem(SAVED_QUERIES_STORAGE_KEY);
    if (!stored) {
      return [];
    }

    try {
      const queries = JSON.parse(stored) as SavedQuery[];
      const withoutLegacy = queries.filter((query) => !LEGACY_SEEDED_SAVED_QUERY_IDS.has(query.id));
      if (withoutLegacy.length !== queries.length) {
        this.persistSavedQueries(withoutLegacy);
      }
      return withoutLegacy;
    } catch {
      return [];
    }
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

  deleteQuery(queryId: string): void {
    const queries = this.getSavedQueries().filter((query) => query.id !== queryId);
    this.persistSavedQueries(queries);
  }

  private persistSavedQueries(queries: SavedQuery[]): void {
    localStorage.setItem(SAVED_QUERIES_STORAGE_KEY, JSON.stringify(queries));
  }
}
