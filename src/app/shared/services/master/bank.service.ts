import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface BankDto {
  bankCode:     string;
  name:         string;
  objectStatus: string;
  addrLine1?:   string | null;
  addrLine2?:   string | null;
  addrLine3?:   string | null;
  addrLine4?:   string | null;
  addrCity?:    string | null;
  addrPin?:     string | null;
  addrState?:   string | null;
  addrCountry?: string | null;
}

export interface BankPayload extends BankDto {
  username?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class BankService {

  constructor(private http: HttpService) {}

  getAllBanks(): Observable<ApiResponse<BankDto[]>> {
    return this.http.get<ApiResponse<BankDto[]>>('Bank/GetAllBanks');
  }

  saveOrUpdateBank(payload: BankPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Bank/SaveOrUpdateBank', payload);
  }
}
