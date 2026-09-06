import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { CashReceiptsRequestModel } from 'src/app/shared/models/cashreceipts.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CashReceiptsService {
  constructor(private http: HttpService) { }

  getAllCashReceipts(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('CashReceipts/GetAllCashReceipts', { params })
  }

  getCashReceipt(onHoldNo: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any>>('CashReceipts/CashReceipts', { params });
  }

  getCashReceiptDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('CashReceipts/GetCashReceiptWithDetails', { params });
  }

  getCashReceiptWithDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('CashReceipts/GetCashReceiptWithDetails', { params });
  }

  saveCashReceiptOnHold(payload: CashReceiptsRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('CashReceipts/OnHoldCashReceipt', payload);
  }

  saveCashReceiptOnPost(payload: CashReceiptsRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('CashReceipts/PostCashReceipt', payload);
  }
}
