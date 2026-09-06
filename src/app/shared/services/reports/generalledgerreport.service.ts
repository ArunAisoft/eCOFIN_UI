import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class GeneralLedgerReportService {

  constructor(private http: HttpService) {}

  getAccPeriods(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('GeneralLedgerReport/GetAccPeriods');
  }

  getGeneralLedger(fromDate: string, toDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('fromDate', fromDate).set('toDate', toDate);
    return this.http.get<ApiResponse<any[]>>('GeneralLedgerReport/GetGeneralLedger', { params });
  }
}
