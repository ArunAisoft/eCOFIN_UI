import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface CompanyPayload {
  companyCode:  string;
  companyName:  string;
  objectStatus: string;
  addrLine1?:   string | null;
  addrLine2?:   string | null;
  addrLine3?:   string | null;
  addrLine4?:   string | null;
  addrCity?:    string | null;
  addrPin?:     string | null;
  addrState?:   string | null;
  addrCountry?: string | null;
  username?:    string;
  location?:    string;
}

@Injectable({ providedIn: 'root' })
export class CompanyService {

  constructor(private http: HttpService) {}

  getCompany(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>('Company/GetCompany');
  }

  saveOrUpdateCompany(payload: CompanyPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Company/SaveOrUpdateCompany', payload);
  }
}