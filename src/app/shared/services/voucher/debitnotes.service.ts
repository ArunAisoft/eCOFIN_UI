import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { DebitNotesRequestModel } from 'src/app/shared/models/debitnotes.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class DebitNotesService {
  constructor(private http: HttpService) { }

  getAllDebitNotes(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('DebitNotes/GetAllDebitNotes', { params })
  }

  getDebitNote(onHoldNo: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any>>('DebitNotes/DebitNotes', { params });
  }

  getDebitNoteDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('DebitNotes/GetDebitNoteWithDetails', { params });
  }

  getDebitNoteWithDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('DebitNotes/GetDebitNoteWithDetails', { params });
  }

  saveDebitNoteOnHold(payload: DebitNotesRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('DebitNotes/OnHoldDebitNote', payload);
  }

  saveDebitNoteOnPost(payload: DebitNotesRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('DebitNotes/PostDebitNote', payload);
  }
}
