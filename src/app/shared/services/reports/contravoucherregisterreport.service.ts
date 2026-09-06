import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface ContraReportFilter {
  accPeriod: string;
}

@Injectable({ providedIn: 'root' })
export class ContraReportService {

  constructor(private http: HttpService) { }

  getContraReport(filter: ContraReportFilter): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', filter.accPeriod);
    return this.http.get<ApiResponse<any[]>>('ContraReport/GetContraReport', { params });
  }
}