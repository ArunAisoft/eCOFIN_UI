import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { PurchasesRequestModel } from 'src/app/shared/models/purchases.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class PurchasesService {
  constructor(private http: HttpService) { }

  getAllPurchases(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('PurchaseBills/GetAllPurchaseBills', { params })
  }

  getPurchaseWithDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('PurchaseBills/GetPurchaseBillWithDetails', { params });
  }

  savePurchaseOnHold(payload: PurchasesRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('PurchaseBills/OnHoldPurchaseBill', payload);
  }

  savePurchaseOnPost(payload: PurchasesRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('PurchaseBills/PostPurchaseBill', payload);
  }

  getGINData(fromDate: string, toDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    return this.http.get<ApiResponse<any[]>>('PurchaseBills/GetGINImportData', { params });
  }

  getJINData(fromDate: string, toDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    return this.http.get<ApiResponse<any[]>>('PurchaseBills/GetJINImportData', { params });
  }

  // generateGIN(ginNos: string[]): Observable<ApiResponse<any>> {
  //   return this.http.post<ApiResponse<any>>('PurchaseBills/GenerateGIN', { ginNos });
  // }

  // generateJIN(jinNos: string[]): Observable<ApiResponse<any>> {
  //   return this.http.post<ApiResponse<any>>('PurchaseBills/GenerateJIN', { jinNos });
  // }

  OnHoldGIN(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('PurchaseBills/OnHoldGIN', payload);
  }

  OnHoldJIN(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('PurchaseBills/OnHoldJIN', payload);
  }

  postMultiplePurchaseBills(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('PurchaseBills/PostMultiplePurchaseBills', payload);
  }
}
