import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface EmployeePayload {
  employeeCode:       string;
  employeeName:       string;
  employeeType?:      string | null;
  bankAccount?:       string | null;
  reportTo?:          string | null;
  addrLine1?:         string | null;
  addrLine2?:         string | null;
  addrLine3?:         string | null;
  addrLine4?:         string | null;
  addrCity?:          string | null;
  addrPin?:           string | null;
  addrState?:         string | null;
  addrCountry?:       string | null;
  commTelephone1?:    string | null;
  commTelephone2?:    string | null;
  commEmail?:         string | null;
  commTelexno?:       string | null;
  commFaxno?:         string | null;
  commGrams?:         string | null;
  commContactperson?: string | null;
  objectStatus:       string;
  username?:          string;
  location?:          string;
}

export interface ImportEmployeePayload {
  employeeCode:    string;
  employeeName:    string;
  bankAccount?:    string | null;
  reportTo?:       string | null;
  addrLine1?:      string | null;
  addrLine2?:      string | null;
  addrCity?:       string | null;
  addrState?:      string | null;
  addrPin?:        string | null;
  addrCountry?:    string | null;
  commTelephone1?: string | null;
  commTelephone2?: string | null;
  accountCode:     string;
  objectStatus:    string;
  username?:       string;
  location?:       string;
}

export interface AccEmployeeSavePayload {
  employeeCode: string;
  rows: { accountCode: string; employeeStatus: string }[];
}

@Injectable({ providedIn: 'root' })
export class EmployeeService {

  constructor(private http: HttpService) {}

  getAllEmployee(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Employee/GetAllEmployee');
  }

  getAllActiveEmployees(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Employee/GetAllActiveEmployees');
  }

  saveOrUpdateEmployee(payload: EmployeePayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Employee/SaveOrUpdateEmployee', payload);
  }

  getByEmployee(employeeCode: string): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('employeeCode', employeeCode);
    return this.http.get<ApiResponse<any[]>>('Employee/GetByEmployee', { params });
  }

  getEmployeeAccounts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Employee/GetEmployeeAccounts');
  }

  saveAccEmployee(payload: AccEmployeeSavePayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Employee/SaveAccEmployee', payload);
  }

  getPendingPersonnel(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Employee/GetPendingPersonnel');
  }

  getEmpAccounts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>('Employee/GetEmpAccounts');
  }

  importEmployee(payload: ImportEmployeePayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Employee/ImportEmployee', payload);
  }

  importEmployees(payloads: ImportEmployeePayload[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('Employee/ImportEmployees', payloads);
  }
}