import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from 'src/app/shared/services/auth.service';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { normalizeResponse } from 'src/app/shared/utils/normalize-response.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  formSubmit = false;
  passwordview = false;
  isLoading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
  }

  togglePasswordview(): void {
    this.passwordview = !this.passwordview;
  }

  onSubmit(): void {
    this.formSubmit = true;
    if (this.loginForm.invalid) return;

    this.isLoading = true;

    const username = (this.loginForm.get('username')?.value || '').trim();
    const password = (this.loginForm.get('password')?.value || '').toString();

    normalizeResponse<any>(this.authService.userLogin({ username, password }), 'login')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: ApiResponse<any | null>) => {
          const user = res.data;
          if (res.success && res.status === 200 && user) {
            const fakeToken = this.generateFakeToken();
            user.token = fakeToken;
            localStorage.setItem('userDetails', JSON.stringify(user));
            localStorage.setItem('userName', user.username || '');
            this.router.navigate(['/dashboard']);
            return;
          }
          this.alertService.showCommonError(res.status, res.message, 'login');
          this.formSubmit = false;
        },
        error: (err) => {
          const status = err?.status ?? 0;
          const message = (err?.error?.message ?? err?.message ?? '').toString().trim();
          this.alertService.showCommonError(status, message, 'login');
          this.formSubmit = false;
        },
      });
  }

  generateFakeToken(): string {
    const payload = {
      exp: Math.floor(Date.now() / 1000) + (60 * 60),
      username: this.loginForm.get('username')?.value
    };
    return `header.${btoa(JSON.stringify(payload))}.signature`;
  }
}
