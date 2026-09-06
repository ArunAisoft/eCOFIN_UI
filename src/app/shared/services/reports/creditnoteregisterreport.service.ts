import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface CreditNoteReportFilter {
  accPeriod: string;
}

@Injectable({ providedIn: 'root' })
export class CreditNoteReportService {

  constructor(private http: HttpService) { }

  getCreditNoteReport(filter: CreditNoteReportFilter): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', filter.accPeriod);
    return this.http.get<ApiResponse<any[]>>('CreditNoteReport/GetCreditNoteReport', { params });
  }
}
