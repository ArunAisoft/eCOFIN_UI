import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface TravelReportFilter {
  accountCode: string;
  fromDate: string;
  toDate: string;
}

@Injectable({ providedIn: 'root' })
export class TravelRegisterService {

  constructor(private http: HttpService) { }

  /** Distinct travel accounts from cfn_v_travelregister */
  getTravelAccounts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('TravelRegister/GetTravelAccounts');
  }

  /** Full travel register rows for given account + date range */
  getTravelReport(filter: TravelReportFilter): Observable<ApiResponse<any[]>> {
    return this.http.post<ApiResponse<any[]>>('TravelRegister/GetTravelReport', filter);
  }
}
