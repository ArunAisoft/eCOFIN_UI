import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { ContrasRequestModel } from 'src/app/shared/models/contras.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ContrasService {
  constructor(private http: HttpService) { }

  getAllContras(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('Contras/GetAllContras', { params })
  }

  getContra(onHoldNo: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any>>('Contras/Contras', { params });
  }

  getContraDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('Contras/GetContraWithDetails', { params });
  }

  getContraWithDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('Contras/GetContraWithDetails', { params });
  }

  saveContraOnHold(payload: ContrasRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Contras/OnHoldContra', payload);
  }

  saveContraOnPost(payload: ContrasRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Contras/PostContra', payload);
  }
}
