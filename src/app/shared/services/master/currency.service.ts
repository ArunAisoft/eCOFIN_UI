import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface CurrencyPayload {
  currencyCode: string;
  currencyName: string;
  country?: string | null;
  symbol?: string | null;
  objectStatus: string;
  username?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class CurrencyService {

  constructor(private http: HttpService) { }

  getCurrencies(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Currency/GetCurrencies');
  }

  getAllActiveCurrencies(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Currency/getAllActiveCurrencies');
  }

  saveOrUpdateCurrency(payload: CurrencyPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Currency/SaveOrUpdateCurrency', payload);
  }
}