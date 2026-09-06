import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface VendorPayload {
  vendorCode: string;
  vendorName: string;
  vendorType?: string | null;
  vendorCategory?: string | null;
  panNumber?: string | null;
  lstNumber?: string | null;
  cstNumber?: string | null;
  tinNumber?: string | null;
  serviceTax?: string | null;
  eccNumber?: string | null;
  vendorStatus?: string | null;
  objectStatus: string;
  addrLine1?: string | null;
  addrLine2?: string | null;
  addrLine3?: string | null;
  addrLine4?: string | null;
  addrCity?: string | null;
  addrPin?: string | null;
  addrState?: string | null;
  addrCountry?: string | null;
  username?: string;
  location?: string;
}

export interface ImportVendorPayload {
  vendorCode: string;
  vendorName: string;
  vendorType?: string | null;
  addrLine1?: string | null;
  addrLine2?: string | null;
  addrCity?: string | null;
  addrPin?: string | null;
  addrState?: string | null;
  addrCountry?: string | null;
  panNumber?: string | null;
  tinNumber?: string | null;
  eccNumber?: string | null;
  objectStatus: string;
  accountCode: string;
  source: string;
  username?: string;
  location?: string;
}

export interface AccVendorSavePayload {
  vendorCode: string;
  rows: { accountCode: string; vendorStatus: string }[];
}

@Injectable({ providedIn: 'root' })
export class VendorService {

  constructor(private http: HttpService) { }

  getAllVendor(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Vendor/GetAllVendor');
  }

  getAllActiveVendors(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Vendor/GetAllActiveVendors');
  }

  saveOrUpdateVendor(payload: VendorPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Vendor/SaveOrUpdateVendor', payload);
  }

  getByVendor(vendorCode: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('vendorCode', vendorCode);
    return this.http.get<ApiResponse<any[]>>('Vendor/GetByVendor', { params });
  }

  getVendorAccounts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Vendor/GetVendorAccounts');
  }

  saveAccVendor(payload: AccVendorSavePayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Vendor/SaveAccVendor', payload);
  }

  getImportableSuppliers(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Vendor/GetImportableSuppliers');
  }

  getImportableVendors(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Vendor/GetImportableVendors');
  }

  importVendor(payload: ImportVendorPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Vendor/ImportVendor', payload);
  }

  importVendors(payloads: ImportVendorPayload[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Vendor/ImportVendors', payloads);
  }
}