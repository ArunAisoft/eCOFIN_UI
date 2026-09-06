import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpParams } from '@angular/common/http';
import { HttpService } from 'src/app/shared/utils/http.service';
import { DashboardSummaryDto, VoucherTypeDrillDto, MonthlyTrendDto, BankSummaryDto, RecentVoucherDto } from 'src/app/shared/models/dashboard.models';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {

  constructor(private http: HttpService) { }

  getSummary(userName: string, bankCode?: string, accPeriod?: string, finYear?: string): Observable<ApiResponse<DashboardSummaryDto>> {
    let params = new HttpParams()
      .set('userName', userName);
    if (bankCode) { params = params.set('bankCode', bankCode); }
    if (accPeriod) { params = params.set('accPeriod', accPeriod); }
    if (finYear)   { params = params.set('finYear', finYear); }
    return this.http.get<ApiResponse<DashboardSummaryDto>>('Dashboard/Summary', { params });
  }

  getDrillDown(voucherSysCategory: string, userName: string, bankCode?: string): Observable<ApiResponse<VoucherTypeDrillDto>> {
    let params = new HttpParams()
      .set('voucherSysCategory', voucherSysCategory)
      .set('userName', userName);
    if (bankCode) { params = params.set('bankCode', bankCode); }
    return this.http.get<ApiResponse<VoucherTypeDrillDto>>('Dashboard/DrillDown', { params });
  }

  getMonthlyTrend(voucherGroup?: string): Observable<ApiResponse<MonthlyTrendDto[]>> {
    let params = new HttpParams();
    if (voucherGroup) { params = params.set('voucherGroup', voucherGroup); }
    return this.http.get<ApiResponse<MonthlyTrendDto[]>>('Dashboard/MonthlyTrend', { params });
  }

  getBankSummary(userName: string, bankCode?: string): Observable<ApiResponse<BankSummaryDto[]>> {
    let params = new HttpParams().set('userName', userName);
    if (bankCode) { params = params.set('bankCode', bankCode); }
    return this.http.get<ApiResponse<BankSummaryDto[]>>('Dashboard/BankSummary', { params });
  }

  getRecentVouchers(voucherSysCategory?: string, bankCode?: string, ctrlStatus?: string, top: number = 20): Observable<ApiResponse<RecentVoucherDto[]>> {
    let params = new HttpParams().set('top', top.toString());
    if (voucherSysCategory) { params = params.set('voucherSysCategory', voucherSysCategory); }
    if (bankCode) { params = params.set('bankCode', bankCode); }
    if (ctrlStatus) { params = params.set('ctrlStatus', ctrlStatus); }
    return this.http.get<ApiResponse<RecentVoucherDto[]>>('Dashboard/RecentVouchers', { params });
  }
}