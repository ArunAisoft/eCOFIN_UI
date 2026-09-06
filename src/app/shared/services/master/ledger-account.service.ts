import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

/* ================= DTOs ================= */
export interface AccountDto {
  accountCode: string;
  description: string;
  accountType: string;
  natureOfAccount: string;
  accountStatus: string;
  activatePeriod?: string;
  zeroLevelCheck?: boolean;
  controlAccount: string;    // 'Y' = Group Item
  parentRefr?: string;
  banker?: string;
  efcAccount?: string;
  billwiseAppl?: string;
  budgetAppl?: string;
  costAppl?: string;
  subledgerAppl?: string;
  employeeAppl?: string;
  costTypeAppl?: string;
  expenseAppl?: string;
  createdOn?: string;
}

export interface ParameterDto {
  parameterGroup: string;
  parameterCode: string;
  parameterDescription: string;
  activeStatus: string;
}

export interface BankDto {
  bankCode: string;
  name: string;
}

export interface EfcAccountDto {
  code: string;
  description: string;
}

export interface SaveAccountPayload {
  accountCode: string;
  description: string;
  accountType: string;
  natureOfAccount: string;
  accountStatus: string;
  activatePeriod?: string | null;
  zeroLevelCheck: string;
  controlAccount: string;
  parentRefr?: string | null;
  banker?: string | null;
  efcAccount?: string | null;
  billwiseAppl: string;
  budgetAppl: string;
  costAppl: string;
  subledgerAppl: string;
  employeeAppl: string;
  costTypeAppl: string;
  expenseAppl: string;
  username: string;
  location: string;
}

/* ================= SERVICE ================= */
@Injectable({ providedIn: 'root' })
export class LedgerAccountService {

  constructor(private http: HttpService) { }

  getAllAccounts(): Observable<ApiResponse<AccountDto[]>> {
    return this.http.get<ApiResponse<AccountDto[]>>('LedgerAccount/GetAllAccounts');
  }

  getAccountTypes(): Observable<ApiResponse<ParameterDto[]>> {
    return this.http.get<ApiResponse<ParameterDto[]>>('LedgerAccount/GetAccountTypes');
  }

  getAccountNatures(): Observable<ApiResponse<ParameterDto[]>> {
    return this.http.get<ApiResponse<ParameterDto[]>>('LedgerAccount/GetAccountNatures');
  }

  getBanks(): Observable<ApiResponse<BankDto[]>> {
    return this.http.get<ApiResponse<BankDto[]>>('LedgerAccount/GetBanks');
  }

  getEfcAccounts(): Observable<ApiResponse<EfcAccountDto[]>> {
    return this.http.get<ApiResponse<EfcAccountDto[]>>('LedgerAccount/GetEfcAccounts');
  }

  saveOrUpdateAccount(payload: SaveAccountPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('LedgerAccount/SaveOrUpdateAccount', payload);
  }
}