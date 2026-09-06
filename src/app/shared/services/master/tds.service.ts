import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface TdsPayload {
  tdscode: string;
  tdsdescription: string;
  tdsperc?: number | null;
  objectStatus: string;
  username?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class TdsService {

  constructor(private http: HttpService) { }

  getAllTDS(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Tds/GetAllTDS');
  }

  getAllActiveTDS(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Tds/GetAllActiveTDS');
  }

  saveOrUpdateTds(payload: TdsPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Tds/SaveOrUpdateTds', payload);
  }
}