import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { BankReceiptsRequestModel } from 'src/app/shared/models/bankreceipts.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class BankReceiptsService {
  constructor(private http: HttpService) { }

  getAllBankReceipts(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('BankReceipts/GetAllBankReceipts', { params })
  }

  getBankReceipt(onHoldNo: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any>>('BankReceipts/BankReceipts', { params });
  }

  getBankReceiptDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('BankReceipts/GetBankReceiptWithDetails', { params });
  }

  getBankReceiptWithDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('BankReceipts/GetBankReceiptWithDetails', { params });
  }

  saveBankReceiptOnHold(payload: BankReceiptsRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('BankReceipts/OnHoldBankReceipt', payload);
  }

  saveBankReceiptOnPost(payload: BankReceiptsRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('BankReceipts/PostBankReceipt', payload);
  }
}
