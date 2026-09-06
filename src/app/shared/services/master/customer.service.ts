import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface CustomerPayload {
  customerCode: string;
  customerName: string;
  customerType: string;
  businessNature?: string | null;
  geographyCode?: string | null;
  addrLine1?: string | null;
  addrLine2?: string | null;
  addrCity?: string | null;
  addrState?: string | null;
  addrCountry?: string | null;
  commTelephone1?: string | null;
  commEmail?: string | null;
  commContactperson?: string | null;
  objectStatus: string;
  accountCode?: string | null;
  username?: string;
  location?: string;
}

export interface ImportCustomerPayload {
  customerCode: string;
  customerName: string;
  customerType: string;
  addrLine1?: string | null;
  addrLine2?: string | null;
  addrCity?: string | null;
  addrPin?: string | null;
  addrState?: string | null;
  addrCountry?: string | null;
  commTelephone1?: string | null;
  commFaxno?: string | null;
  commEmail?: string | null;
  cstNoDate?: string | null;
  objectStatus: string;
  accountCode: string;
  username?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class CustomerService {

  constructor(private http: HttpService) { }

  getAllCustomer(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Customer/GetAllCustomer');
  }

  getAllActiveCustomers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Customer/GetAllActiveCustomers');
  }

  saveOrUpdateCustomer(payload: CustomerPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Customer/SaveOrUpdateCustomer', payload);
  }

  getImportableCustomers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Customer/GetImportableCustomers');
  }

  importCustomer(payload: ImportCustomerPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Customer/ImportCustomer', payload);
  }

  importCustomers(payloads: ImportCustomerPayload[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Customer/ImportCustomers', payloads);
  }

  getDebtorAccounts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Customer/GetDebtorAccounts');
  }

  getLinkedAccounts(customerCode: string): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`Customer/GetLinkedAccounts?customerCode=${encodeURIComponent(customerCode)}`);
  }

  saveAccountLink(payload: { customerCode: string; accountCode: string; username?: string }): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Customer/SaveAccountLink', payload);
  }
}