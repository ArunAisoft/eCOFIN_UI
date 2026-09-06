import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface DebitNoteReportFilter {
  accPeriod: string;
}

@Injectable({ providedIn: 'root' })
export class DebitNoteReportService {

  constructor(private http: HttpService) { }

  getDebitNoteReport(filter: DebitNoteReportFilter): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', filter.accPeriod);
    return this.http.get<ApiResponse<any[]>>('DebitNoteReport/GetDebitNoteReport', { params });
  }
}
