import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class AuthService {

  constructor(private router: Router) { }

  getUserDetails(): any | null {
    try {
      const raw = localStorage.getItem('userDetails');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    const user = this.getUserDetails();
    return user?.token ?? user?.accessToken ?? user?.jwtToken ?? null;
  }

  isAuthenticated(): boolean {
    const user = this.getUserDetails();
    if (!user) return false;

    const token = user?.token;
    if (!token) return false;

    if (this.isTokenExpired(token)) {
      const newToken = this.generateFakeToken(user.username);
      user.token = newToken;
      localStorage.setItem('userDetails', JSON.stringify(user));
      return true;
    }
    return true;
  }

  generateFakeToken(username: string): string {
    const payload = {
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
      username
    };
    return `header.${btoa(JSON.stringify(payload))}.signature`;
  }

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}