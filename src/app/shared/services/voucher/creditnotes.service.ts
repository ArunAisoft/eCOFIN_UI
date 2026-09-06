import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { CreditNotesRequestModel } from 'src/app/shared/models/creditnotes.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CreditNotesService {
  constructor(private http: HttpService) { }

  getAllCreditNotes(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('CreditNotes/GetAllCreditNotes', { params })
  }

  getCreditNote(onHoldNo: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any>>('CreditNotes/CreditNotes', { params });
  }

  getCreditNoteDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('CreditNotes/GetCreditNoteWithDetails', { params });
  }

  getCreditNoteWithDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('CreditNotes/GetCreditNoteWithDetails', { params });
  }

  saveCreditNoteOnHold(payload: CreditNotesRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('CreditNotes/OnHoldCreditNote', payload);
  }

  saveCreditNoteOnPost(payload: CreditNotesRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('CreditNotes/PostCreditNote', payload);
  }
}
