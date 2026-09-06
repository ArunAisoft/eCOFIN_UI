import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class AccountingCalendarService {

  constructor(private http: HttpService) { }

  getFinancialYears(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('FinancialYearsWithPeriods/GetFinancialYears');
  }

  createFinancialYear(payload: any) {
    return this.http.post('FinancialYearsWithPeriods/CreateFinancialYear', payload);
  }

  getFinancialYears2(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('FinancialYearsWithPeriods/GetFinancialYears2');
  }

  createFinancialYear2(payload: any) {
    return this.http.post('FinancialYearsWithPeriods/CreateFinancialYear2', payload);
  }

  getPeriodsByYear(financialYear: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('financialYear', financialYear);
    return this.http.get<ApiResponse<any[]>>('FinancialYearsWithPeriods/GetPeriodsByYear', { params });
  }

  saveOrUpdatePeriod(payload: any) {
    return this.http.post('FinancialYearsWithPeriods/SaveOrUpdatePeriod', payload);
  }
}