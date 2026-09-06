import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface BankInstrumentPayload {
  bankCode: string;
  accountCode: string;
  instrumentCategory: string;
  instrumentType: string;
  instrumentBookNo?: number | null;
  bookDescription?: string | null;
  startingSerialNo: number;
  endingSerialNo: number;
  runningSerialNo?: number | null;
  instrumentLeaves?: number | null;
  activeStatus: string;
  username?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class BankInstrumentService {

  constructor(private http: HttpService) { }

  getAllBanksWithAccounts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('BankInstrument/GetAllBanksWithAccounts');
  }

  getAllInstruments(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('BankInstrument/GetAllInstruments');
  }

  saveOrUpdateInstrument(payload: BankInstrumentPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('BankInstrument/SaveOrUpdateInstrument', payload);
  }
}