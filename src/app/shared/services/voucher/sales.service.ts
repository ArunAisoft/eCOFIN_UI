import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { SalesRequestModel } from 'src/app/shared/models/sales.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class SalesService {
  constructor(private http: HttpService) { }

  getAllSales(accPeriod: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('accPeriod', accPeriod);
    return this.http.get<ApiResponse<any[]>>('Sales/GetAllSales', { params })
  }

  getSale(onHoldNo: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any>>('Sales/Sales', { params });
  }

  getSaleDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('Sales/GetSaleWithDetails', { params });
  }

  getSaleWithDetails(onHoldNo: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('onHoldNo', onHoldNo);
    return this.http.get<ApiResponse<any[]>>('Sales/GetSaleWithDetails', { params });
  }

  saveSaleOnHold(payload: SalesRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Sales/OnHoldSale', payload);
  }

  saveSaleOnPost(payload: SalesRequestModel): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Sales/PostSale', payload);
  }

  getSaleDomesticData(fromDate: string, toDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    return this.http.get<ApiResponse<any[]>>('Sales/GetSaleDomesticData', { params });
  }

  getSaleExportData(fromDate: string, toDate: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams()
      .set('fromDate', fromDate)
      .set('toDate', toDate);
    return this.http.get<ApiResponse<any[]>>('Sales/GetSaleExportData', { params });
  }

  // generateDomestic(domesticNos: string[]): Observable<ApiResponse<any>> {
  //   return this.http.post<ApiResponse<any>>('Sales/GenerateDomestic', { domesticNos });
  // }

  // generateExport(exportNos: string[]): Observable<ApiResponse<any>> {
  //   return this.http.post<ApiResponse<any>>('Sales/GenerateExport', { exportNos });
  // }

  OnHoldDomesticSales(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Sales/OnHoldDomesticSales', payload);
  }

  OnHoldExportSales(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Sales/OnHoldExportSales', payload);
  }

  postMultipleSaleBills(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Sales/PostMultipleSales', payload);
  }
}