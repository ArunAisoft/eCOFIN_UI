import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { BankPaymentsRequestModel } from 'src/app/shared/models/bankpayments.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class BankPaymentsService {
  constructor(private http: HttpService) { }

  getAllBankPayments(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('BankPayments/GetAllBankPayments', { params })
  }

  getBankPayment(onHoldNo: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any>>('BankPayments/BankPayments', { params });
  }

  getBankPaymentDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('BankPayments/GetBankPaymentWithDetails', { params });
  }

  getBankPaymentWithDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('BankPayments/GetBankPaymentWithDetails', { params });
  }

  saveBankPaymentOnHold(payload: BankPaymentsRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('BankPayments/OnHoldBankPayment', payload);
  }

  saveBankPaymentOnPost(payload: BankPaymentsRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('BankPayments/PostBankPayment', payload);
  }
}