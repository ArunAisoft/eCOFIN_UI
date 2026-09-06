import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface TdsReportFilter {
  accountCode: string;   // Now supports comma-separated codes e.g. "L060600,L060601,L060602"
  fromDate: string;
  toDate: string;
}

@Injectable({ providedIn: 'root' })
export class TdsreportService {

  constructor(private http: HttpService) { }

  getTdsAccounts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('TdsReport/GetTdsAccounts');
  }

  getTdsReport(filter: TdsReportFilter): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>('TdsReport/GetTdsReport', filter);
  }

  getVoucherDetails(vchrNumber: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`TdsReport/GetVoucherDetails/${vchrNumber}`);
  }
}
