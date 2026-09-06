import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface SalesReportFilter {
  accountCode: string;
  fromDate: string;
  toDate: string;
}

@Injectable({ providedIn: 'root' })
export class SalesRegisterService {

  constructor(private http: HttpService) { }

  /** Distinct sales accounts (DBCRFLAG = 'C' in CFN_SALVDETAIL) */
  getSalesAccounts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('SalesRegister/GetSalesAccounts');
  }

  /** Full sales register rows for given account + date range */
  getSalesReport(filter: SalesReportFilter): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>('SalesRegister/GetSalesReport', filter);
  }
}
