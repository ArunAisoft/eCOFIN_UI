import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface GstReportFilter {
  fromDate: string;
  toDate: string;
}

@Injectable({ providedIn: 'root' })
export class GstreportService {

  constructor(private http: HttpService) { }

  getGstReport(filter: GstReportFilter): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('fromDate', filter.fromDate)
      .set('toDate', filter.toDate);
    return this.http.get<ApiResponse<any[]>>('GstReport/GetGstReport', { params });
  }
}