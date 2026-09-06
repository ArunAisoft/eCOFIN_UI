import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HttpErrorResponse, } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { ApiResponse } from '../models/api-response.model';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    constructor(private router: Router, private auth: AuthService) { }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const authToken = this.auth.getToken();
        const u = (req.url || '').toLowerCase();
        const isAuthEndpoint = u.includes('/user/login') || u.includes('/user/refreshtoken');

        const authReq = authToken && !isAuthEndpoint
            ? req.clone({ setHeaders: { Authorization: `Bearer ${authToken}` } })
            : req;

        return next.handle(authReq).pipe(
            catchError((error: HttpErrorResponse) => {
                if (error.status === 401 && !isAuthEndpoint) {
                    return this.auth.refreshToken().pipe(
                        switchMap((res: ApiResponse<{ accessToken: string; refreshToken: string } | null>) => {
                            const ok = res?.status === 200 && !!res?.data?.accessToken;
                            if (!ok) {
                                this.handleAuthError();
                                return throwError(() => error);
                            }
                            this.auth.setToken(res.data!.accessToken);
                            if (res.data!.refreshToken) this.auth.setRefreshToken(res.data!.refreshToken);
                            const retried = req.clone({ setHeaders: { Authorization: `Bearer ${res.data!.accessToken}` } });
                            return next.handle(retried);
                        }),
                        catchError((e) => {
                            this.handleAuthError();
                            return throwError(() => e);
                        })
                    );
                }
                return throwError(() => error);
            })
        );
    }

    private handleAuthError() {
        this.auth.clearAuth();
        this.router.navigate(['login'], { replaceUrl: true });
    }
}
