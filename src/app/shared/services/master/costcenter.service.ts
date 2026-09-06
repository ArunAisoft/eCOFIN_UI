import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface CostCentrePayload {
  costCentreCode: string;
  description: string;
  centreType?: string | null;
  costCentreStatus?: string | null;
  objectStatus: string;
  username?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class CostCenterService {

  constructor(private http: HttpService) { }

  getAllCostCentre(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('CostCentre/GetAllCostCentre');
  }

  getAllActiveCostCentres(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('CostCentre/GetAllActiveCostCentres');
  }

  saveOrUpdateCostCentre(payload: CostCentrePayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('CostCentre/SaveOrUpdateCostCentre', payload);
  }
}
