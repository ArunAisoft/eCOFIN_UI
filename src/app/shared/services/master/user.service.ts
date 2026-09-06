import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface UserDto {
  username: string;
  nameDescription: string;
  objectStatus: string;
}

export interface UserPayload {
  username: string;
  nameDescription: string;
  objectStatus: string;
  password: number;
  loggedInUser?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {

  constructor(private http: HttpService) { }

  getAllUsers(): Observable<ApiResponse<UserDto[]>> {
    return this.http.get<ApiResponse<UserDto[]>>('User/GetAllUsers');
  }

  saveOrUpdateUser(payload: UserPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>('User/SaveOrUpdateUser', payload);
  }
}
