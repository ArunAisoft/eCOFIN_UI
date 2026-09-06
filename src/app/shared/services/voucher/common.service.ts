import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { BillPaymentAdjustmentRequest, GroupAccountModel } from 'src/app/shared/models/common.models';
import { HttpParams } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CommonService {
    constructor(private http: HttpService) { }

    getYearList(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>('FinancialYearsWithPeriods/GetFinancialYearPeriods');
    }

    getTDSList(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>('Tds/GetAllTDS');
    }

    getAllActiveCurrencies(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>('Currency/GetAllActiveCurrencies');
    }

    getAllBanksWithAccountsVouchersBalances(userName: string, voucherGroup: string) {
        const params = new HttpParams()
            .set('userName', userName)
            .set('voucherGroup', voucherGroup);
        return this.http.get<ApiResponse<any[]>>('BanksAndAccounts/GetAllBanksWithAccountsVouchersBalances', { params });
    }

    getAllAccountsVouchersBalances(userName: string, accountType: string, voucherGroup: string) {
        const params = new HttpParams()
            .set('userName', userName)
            .set('accountType', accountType)
            .set('voucherGroup', voucherGroup);
        return this.http.get<ApiResponse<any[]>>('BanksAndAccounts/GetAllAccountsVouchersBalances', { params });
    }

    getAllCreditAccountsVouchers(userName: string, voucherGroup: string) {
        const params = new HttpParams()
            .set('userName', userName)
            .set('voucherGroup', voucherGroup);
        return this.http.get<ApiResponse<any[]>>('BanksAndAccounts/GetAllCreditAccountsVouchers', { params });
    }

    getAllDebitAccountsVouchers(userName: string, voucherGroup: string) {
        const params = new HttpParams()
            .set('userName', userName)
            .set('voucherGroup', voucherGroup);
        return this.http.get<ApiResponse<any[]>>('BanksAndAccounts/GetAllDebitAccountsVouchers', { params });
    }

    getAllCreditDebitAccountsVouchers(userName: string, voucherGroup: string) {
        const params = new HttpParams()
            .set('userName', userName)
            .set('voucherGroup', voucherGroup);
        return this.http.get<ApiResponse<any[]>>('BanksAndAccounts/GetAllCreditDebitAccountsVouchers', { params });
    }

    getAllDebitCreditVoucherTypes(userName: string, voucherGroup: string) {
        const params = new HttpParams()
            .set('userName', userName)
            .set('voucherGroup', voucherGroup);
        return this.http.get<ApiResponse<any[]>>('BanksAndAccounts/GetAllDebitCreditVoucherTypes', { params });
    }

    getAllGroupAccountsByVoucherType(voucherType: string): Observable<ApiResponse<GroupAccountModel[]>> {
        const params = new HttpParams().set('voucherType', voucherType);
        return this.http.get<ApiResponse<GroupAccountModel[]>>('BanksAndAccounts/GetAllGroupAccountsByVoucherType', { params });
    }

    getAllSubAccountsByCodeAndType(accountCode: string, accountType: string, includeCostCentres: boolean): Observable<ApiResponse<any[]>> {
        const params = new HttpParams()
            .set('accountCode', accountCode)
            .set('accountType', accountType)
            .set('includeCostCentres', includeCostCentres);
        return this.http.get<ApiResponse<any[]>>('BanksAndAccounts/GetAllSubAccountsByCodeAndType', { params });
    }

    getVendorInvoices(invoiceAccount: string, invoiceVendor: string): Observable<ApiResponse<any[]>> {
        const params = new HttpParams()
            .set('invoiceAccount', invoiceAccount)
            .set('invoiceVendor', invoiceVendor);
        return this.http.get<ApiResponse<any[]>>('BanksAndAccounts/GetVendorInvoices', { params });
    }

    getBillAndPaymentDetails(account: string, subaccount: string): Observable<ApiResponse<any>> {
        const params = new HttpParams()
            .set('accountCode', account)
            .set('subAccountCode', subaccount);
        return this.http.get<ApiResponse<any[]>>('BanksAndAccounts/GetBillAndPaymentDetails', { params });
    }

    saveBillAndPaymentAdjustment(payload: BillPaymentAdjustmentRequest): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>('BanksAndAccounts/SaveBillAndPaymentAdjustment', payload);
    }

    checkBillExists(bankCode: string, bankAccount: string, billNo: string, billDate: string | Date, excludeOnHoldNo?: string | null): Observable<ApiResponse<boolean>> {
        const formattedDate = this.formatDate(billDate);
        let  params = new HttpParams()
            .set('bankCode', bankCode)
            .set('bankAccount', bankAccount)
            .set('billNo', billNo)
            .set('billDate', formattedDate);
        if (excludeOnHoldNo) {
            params = params.set('excludeOnHoldNo', excludeOnHoldNo);
        }
        return this.http.get<ApiResponse<boolean>>('BanksAndAccounts/CheckBillExists', { params });
    }

    private formatDate(date: string | Date): string {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
}
