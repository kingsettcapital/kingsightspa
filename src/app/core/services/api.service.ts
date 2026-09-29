import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type ApiQueryParams = Record<string, string | number | boolean>;

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly base = environment.apiUrl.replace(/\/+$/, '');
  private readonly http = inject(HttpClient);

  private defaultHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    if (!environment.production) {
      headers = headers.set('ngrok-skip-browser-warning', '69420');
    }
    return headers;
  }

  private buildUrl(path: string): string {
    return `${this.base}/${path.replace(/^\/+/, '')}`;
  }

  private buildParams(params?: ApiQueryParams): HttpParams | undefined {
    if (!params) {
      return undefined;
    }

    return new HttpParams({
      fromObject: Object.fromEntries(
        Object.entries(params)
          .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
          .map(([key, value]) => [key, String(value)]),
      ),
    });
  }

  get<T>(
    path: string,
    params?: ApiQueryParams,
    extraHeaders?: HttpHeaders
  ): Observable<T> {
    const url = this.buildUrl(path);
    let headers = this.defaultHeaders();

    if (extraHeaders) {
      extraHeaders.keys().forEach((key) => {
        const value = extraHeaders.get(key);
        if (value) {
          headers = headers.set(key, value);
        }
      });
    }

    return this.http.get<T>(url, { params: this.buildParams(params), headers });
  }

  getText(path: string, params?: ApiQueryParams): Observable<string> {
    const url = this.buildUrl(path);
    return this.http.get(url, {
      params: this.buildParams(params),
      headers: this.defaultHeaders(),
      responseType: 'text',
    });
  }

  post<T>(path: string, body: object | FormData): Observable<T> {
    const url = this.buildUrl(path);
    let headers = this.defaultHeaders();

    if (!(body instanceof FormData)) {
      headers = headers.set('Content-Type', 'application/json');
    }

    return this.http.post<T>(url, body, { headers });
  }

  postText(path: string, body: object): Observable<string> {
    const url = this.buildUrl(path);
    const headers = this.defaultHeaders().set('Content-Type', 'application/json');
    return this.http.post(url, body, { headers, responseType: 'text' });
  }

  put<T>(path: string, body: object): Observable<T> {
    const url = this.buildUrl(path);
    const headers = this.defaultHeaders().set('Content-Type', 'application/json');
    return this.http.put<T>(url, body, { headers });
  }

  putText(path: string, body: object): Observable<string> {
    const url = this.buildUrl(path);
    const headers = this.defaultHeaders().set('Content-Type', 'application/json');
    return this.http.put(url, body, { headers, responseType: 'text' });
  }

  delete<T>(path: string): Observable<T> {
    const url = this.buildUrl(path);
    const headers = this.defaultHeaders();
    return this.http.delete<T>(url, { headers });
  }

  downloadFile(path: string): Observable<HttpResponse<Blob>> {
    const url = this.buildUrl(path);
    const headers = this.defaultHeaders();

    return this.http.get(url, {
      headers,
      responseType: 'blob',
      observe: 'response',
    });
  }
}
