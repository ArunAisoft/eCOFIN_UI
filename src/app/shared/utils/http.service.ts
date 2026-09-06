import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams, } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment.development';

type BodyOnlyOptions = {
  headers?: HttpHeaders | { [header: string]: string | string[] };
  params?: HttpParams | { [param: string]: string | number | boolean | ReadonlyArray<string | number | boolean> };
  reportProgress?: boolean;
  withCredentials?: boolean;
  observe?: 'body';
  responseType?: 'json';
};

@Injectable({ providedIn: 'root' })
export class HttpService {
  private readonly baseUrl = environment.baseApiUrl;

  constructor(private http: HttpClient) { }

  get<T>(endpoint: string, options?: BodyOnlyOptions): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}/${endpoint}`, { observe: 'body', responseType: 'json', ...(options ?? {}) })
      .pipe(catchError(this.handleError));
  }

  post<T>(endpoint: string, data: any, options?: BodyOnlyOptions): Observable<T> {
    return this.http
      .post<T>(`${this.baseUrl}/${endpoint}`, data, { observe: 'body', responseType: 'json', ...(options ?? {}) })
      .pipe(catchError(this.handleError));
  }

  put<T>(endpoint: string, data: any, options?: BodyOnlyOptions): Observable<T> {
    return this.http
      .put<T>(`${this.baseUrl}/${endpoint}`, data, { observe: 'body', responseType: 'json', ...(options ?? {}) })
      .pipe(catchError(this.handleError));
  }

  delete<T>(endpoint: string, options?: BodyOnlyOptions): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}/${endpoint}`, { observe: 'body', responseType: 'json', ...(options ?? {}) })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    const serverBody = error.error;
    const serverText = typeof serverBody === 'string' ? serverBody : JSON.stringify(serverBody);
    const msg = error.status
      ? `Server Error ${error.status}: ${error.statusText || error.message}\n${serverText || ''}`
      : `Client Error: ${error.message}`;
    console.error('HTTP Error:', msg, error);
    return throwError(() => new Error(msg));
  }
}
