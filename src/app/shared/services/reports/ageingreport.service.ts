import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface AgeingReportFilter {
  reportType: 'Debtors' | 'Creditors';
  reportDate: string; 
}

@Injectable({ providedIn: 'root' })
export class AgeingReportService {

  constructor(private http: HttpService) {}

  getAgeingReport(filter: AgeingReportFilter): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('reportType', filter.reportType)
      .set('reportDate', filter.reportDate);
    return this.http.get<ApiResponse<any[]>>('AgeingReport/GetAgeingReport', { params });
  }
}