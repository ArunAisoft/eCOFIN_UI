import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class TrialBalanceService {

  constructor(private http: HttpService) {}

  // ── existing methods (unchanged) ─────────────────────────────────────────

  getTrialBalance(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('TrialBalance/GetTrialBalance', { params });
  }

  getGLDetails(accPeriod: string,accCode: string, fromDate: string, toDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('accPeriod', accPeriod)
      .set('accCode',  accCode)
      .set('fromDate', fromDate)
      .set('toDate',   toDate);
    return this.http.get<ApiResponse<any[]>>('TrialBalance/GetGLDetails', { params });
  }

  getSubledgerSchedule(accPeriod: string, accCode: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('accPeriod', accPeriod)
      .set('accCode',   accCode);
    return this.http.get<ApiResponse<any[]>>('TrialBalance/GetSubledgerSchedule', { params });
  }

  getSubledgerAccountDetails(
    accPeriod: string, accountCode: string, subAccountCode: string,
    fromDate: string,  toDate: string
  ): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('accPeriod', accPeriod)
      .set('accCode',   accountCode)
      .set('subCode',   subAccountCode)
      .set('fromDate',  fromDate)
      .set('toDate',    toDate);
    return this.http.get<ApiResponse<any[]>>('TrialBalance/GetSubledgerAccountDetails', { params });
  }

  getBillsAndPayments(accountCode: string, subAccountCode: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('accCode', accountCode)
      .set('subCode', subAccountCode);
    return this.http.get<ApiResponse<any[]>>('TrialBalance/GetBillsAndPayments', { params });
  }

  getVoucherEntries(voucherNumber: string, voucherDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('voucherNumber', voucherNumber)
      .set('voucherDate',   voucherDate);
    return this.http.get<ApiResponse<any[]>>('TrialBalance/GetVoucherEntries', { params });
  }

  // ── NEW ───────────────────────────────────────────────────────────────────

  /**
   * Cost / Product entries for a voucher.
   * Service resolves ctrl_onholdno internally then queries cfn_costdetail.
   * GET api/TrialBalance/GetCostProductEntries?voucherNumber=...
   */
  getCostProductEntries(voucherNumber: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('voucherNumber', voucherNumber);
    return this.http.get<ApiResponse<any[]>>('TrialBalance/GetCostProductEntries', { params });
  }

  /**
   * Bills / Payments Adjusted popup table (Image 2 bottom grid).
   * Columns: VoucherNumber | VoucherDate | ReferenceNumber | ReferenceDate |
   *          BillNumber    | BillDate    | BillAdjustedAmount
   * GET api/TrialBalance/GetBillsPaymentsAdjusted?voucherNumber=...
   */
  getBillsPaymentsAdjusted(voucherNumber: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('voucherNumber', voucherNumber);
    return this.http.get<ApiResponse<any[]>>('TrialBalance/GetBillsPaymentsAdjusted', { params });
  }
}