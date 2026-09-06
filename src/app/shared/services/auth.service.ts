import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpService } from 'src/app/shared/utils/http.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';

export interface LoginPayload { username: string; password: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'accessToken';
  private refreshKey = 'refreshToken';

  constructor(private http: HttpService) {}

  userLogin(payload: LoginPayload): Observable<ApiResponse<any>> {
    const body: LoginPayload = { username: (payload.username || '').trim(), password: payload.password || '' };
    return this.http.post<ApiResponse<any>>('User/Login', body);
    }

  refreshToken(): Observable<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const body = { accessToken: this.getToken() || '', refreshToken: this.getRefreshToken() || '' };
    return this.http.post<ApiResponse<{ accessToken: string; refreshToken: string }>>('User/RefreshToken', body);
  }

  getToken(): string | null { return localStorage.getItem(this.tokenKey); }
  setToken(token: string | null) { if (token) localStorage.setItem(this.tokenKey, token); else localStorage.removeItem(this.tokenKey); }
  getRefreshToken(): string | null { return localStorage.getItem(this.refreshKey); }
  setRefreshToken(token: string | null) { if (token) localStorage.setItem(this.refreshKey, token); else localStorage.removeItem(this.refreshKey); }
  clearAuth() { localStorage.removeItem(this.tokenKey); localStorage.removeItem(this.refreshKey); }
}
