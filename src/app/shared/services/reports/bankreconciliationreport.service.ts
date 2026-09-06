import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class BankReconciliationReportService {

  constructor(private http: HttpService) {}

  getAccPeriods(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('BankReconciliationReport/GetAccPeriods');
  }

  getChequeIssuedNotPresented(accPeriod: string, asAtDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod).set('asAtDate', asAtDate);
    return this.http.get<ApiResponse<any[]>>('BankReconciliationReport/GetChequeIssuedNotPresented', { params });
  }

  getChequeDepositedNotPresented(accPeriod: string, asAtDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod).set('asAtDate', asAtDate);
    return this.http.get<ApiResponse<any[]>>('BankReconciliationReport/GetChequeDepositedNotPresented', { params });
  }

  getDebitedByBankNotAccounted(accPeriod: string, asAtDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod).set('asAtDate', asAtDate);
    return this.http.get<ApiResponse<any[]>>('BankReconciliationReport/GetDebitedByBankNotAccounted', { params });
  }

  getCreditedByBankNotAccounted(accPeriod: string, asAtDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod).set('asAtDate', asAtDate);
    return this.http.get<ApiResponse<any[]>>('BankReconciliationReport/GetCreditedByBankNotAccounted', { params });
  }
}
