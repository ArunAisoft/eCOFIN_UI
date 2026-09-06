import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface PurchaseReportFilter {
  accountCode: string;
  fromDate: string;
  toDate: string;
}

@Injectable({ providedIn: 'root' })
export class PurchaseRegisterService {

  constructor(private http: HttpService) { }

  /** Distinct purchase detail accounts (DBCRFLAG = 'D' in CFN_PURJDETAIL) */
  getPurchaseAccounts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('PurchaseRegister/GetPurchaseAccounts');
  }

  /** Full purchase register rows for given account + date range */
  getPurchaseReport(filter: PurchaseReportFilter): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>('PurchaseRegister/GetPurchaseReport', filter);
  }
}
