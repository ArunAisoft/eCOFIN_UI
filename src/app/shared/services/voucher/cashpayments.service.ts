import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { CashPaymentsRequestModel } from 'src/app/shared/models/cashpayments.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CashPaymentsService {
  constructor(private http: HttpService) { }

  getAllCashPayments(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('CashPayments/GetAllCashPayments', { params })
  }

  getCashPayment(onHoldNo: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any>>('CashPayments/CashPayments', { params });
  }

  getCashPaymentDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('CashPayments/GetCashPaymentWithDetails', { params });
  }

  getCashPaymentWithDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('CashPayments/GetCashPaymentWithDetails', { params });
  }

  saveCashPaymentOnHold(payload: CashPaymentsRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('CashPayments/OnHoldCashPayment', payload);
  }

  saveCashPaymentOnPost(payload: CashPaymentsRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('CashPayments/PostCashPayment', payload);
  }
}
