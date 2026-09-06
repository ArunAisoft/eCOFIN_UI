import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { SessionTimeoutService } from 'src/app/shared/utils/session-timeout.service';
import { AuthService } from 'src/app/shared/utils/auth.service';
import { AlertService } from 'src/app/shared/utils/alert.service';

@Component({
  selector: 'app-ecofin',
  templateUrl: './ecofin.component.html',
  styleUrls: ['./ecofin.component.css'],
  providers: [SessionTimeoutService]
})
export class EcofinComponent implements OnInit, OnDestroy {
  private sessionExpired = false;
  userId!: string | null;
  userProfile: any;

  constructor(
    private router: Router,
    private sessionTimeoutService: SessionTimeoutService,
    private authService: AuthService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);

    if (!this.authService.isAuthenticated()) {
      localStorage.clear();
      this.router.navigate(['/login']);
      return;
    }

    this.userProfile = this.authService.getUserDetails();
    this.userId = this.userProfile?.userId || null;
    this.startSessionTimeout();
  }

  navigateToPage(): void {
    this.router.navigate([this.userId ? '/ecofin/dashboard' : '/login']);
  }

  private startSessionTimeout(): void {
    this.sessionTimeoutService.start(() => this.handleSessionTimeout());
  }

  private handleSessionTimeout(): void {
    if (this.sessionExpired) return;

    this.sessionExpired = true;
    localStorage.clear();

    this.alertService.sessionExpired().then(() => {
      this.router.navigate(['/login']).then(() => window.location.reload());
    });
  }

  ngOnDestroy(): void {
    this.sessionTimeoutService.ngOnDestroy();
  }
}