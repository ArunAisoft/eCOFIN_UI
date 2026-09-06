import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { JournalsRequestModel } from 'src/app/shared/models/journals.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class JournalsService {
  constructor(private http: HttpService) { }

  getAllJournals(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('Journals/GetAllJournals', { params })
  }

  getJournal(onHoldNo: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any>>('Journals/Journals', { params });
  }

  getJournalDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('Journals/GetJournalWithDetails', { params });
  }

  getJournalWithDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('Journals/GetJournalWithDetails', { params });
  }

  saveJournalOnHold(payload: JournalsRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Journals/OnHoldJournal', payload);
  }

  saveJournalOnPost(payload: JournalsRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Journals/PostJournal', payload);
  }
}
