import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

@Injectable({ providedIn: 'root' })
export class SubLedgerReportService {

    constructor(private http: HttpService) { }

    getAccPeriods(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>('SubLedgerReport/GetAccPeriods');
    }

    getDebtorLedger(accPeriod: string, fromDate: string, toDate: string): Observable<ApiResponse<any[]>> {
        const params = new HttpParams().set('accPeriod', accPeriod).set('fromDate', fromDate).set('toDate', toDate);
        return this.http.get<ApiResponse<any[]>>('SubLedgerReport/GetDebtorLedger', { params });
    }

    getCreditLedger(accPeriod: string, fromDate: string, toDate: string, userName?: string): Observable<ApiResponse<any[]>> {
        let params = new HttpParams().set('accPeriod', accPeriod).set('fromDate', fromDate).set('toDate', toDate);
        if (userName) params = params.set('userName', userName);
        return this.http.get<ApiResponse<any[]>>('SubLedgerReport/GetCreditLedger', { params });
    }

    getStaffLoanLedger(accPeriod: string, fromDate: string, toDate: string): Observable<ApiResponse<any[]>> {
        const params = new HttpParams().set('accPeriod', accPeriod).set('fromDate', fromDate).set('toDate', toDate);
        return this.http.get<ApiResponse<any[]>>('SubLedgerReport/GetStaffLoanLedger', { params });
    }

    getStaffAdvanceLedger(accPeriod: string, fromDate: string, toDate: string): Observable<ApiResponse<any[]>> {
        const params = new HttpParams().set('accPeriod', accPeriod).set('fromDate', fromDate).set('toDate', toDate);
        return this.http.get<ApiResponse<any[]>>('SubLedgerReport/GetStaffAdvanceLedger', { params });
    }
}
