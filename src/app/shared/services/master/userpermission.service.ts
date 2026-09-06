import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

/* ================= DTOs ================= */
export interface UserListDto {
  username: string;
  nameDescription: string;
}
export interface TaskDto {
  taskId: number;
  taskFullName: string;
}
export interface PanelDto {
  panelId: number;
  panelFullName: string;
}
export interface UserPermissionDto {
  taskIds: number[];
  panelIds: number[];
  levelNumber: number;
}
export interface PermissionSummaryDto {
  username: string;
  nameDescription: string;
  levelNumber: number;
  taskCount: number;
  panelCount: number;
}

/* ================= Payload ================= */
export interface SaveUserPermissionPayload {
  username: string;
  taskIds: number[];
  panelIds: number[];
  levelNumber: number;
  loggedInUser?: string;
  location?: string;
}

/* ================= SERVICE ================= */
@Injectable({ providedIn: 'root' })
export class UserPermissionService {

  constructor(private http: HttpService) { }

  getAllUsers(): Observable<ApiResponse<UserListDto[]>> {
    return this.http.get<ApiResponse<UserListDto[]>>('UserPermission/GetAllUsers');
  }

  getAllPermissions(): Observable<ApiResponse<PermissionSummaryDto[]>> {
    return this.http.get<ApiResponse<PermissionSummaryDto[]>>('UserPermission/GetAllPermissions');
  }

  getTasks(): Observable<ApiResponse<TaskDto[]>> {
    return this.http.get<ApiResponse<TaskDto[]>>('UserPermission/GetTasks');
  }

  getPanels(taskId: number): Observable<ApiResponse<PanelDto[]>> {
    return this.http.get<ApiResponse<PanelDto[]>>(`UserPermission/GetPanels/${taskId}`);
  }

  getUserPermissions(username: string): Observable<ApiResponse<UserPermissionDto>> {
    return this.http.get<ApiResponse<UserPermissionDto>>(
      `UserPermission/GetUserPermissions/${encodeURIComponent(username)}`
    );
  }

  savePermissions(payload: SaveUserPermissionPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('UserPermission/SaveOrUpdatePermissions', payload);
  }
}