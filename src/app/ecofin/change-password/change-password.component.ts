import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from 'src/app/shared/services/profile.service';
import { CustomValidators } from 'src/app/shared/validators/custom-validators';
import { HttpStatusCode } from '@angular/common/http';
import { AlertService } from 'src/app/shared/utils/alert.service';

@Component({
  selector: 'app-changepassword',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.css'],
})
export class ChangePasswordComponent implements OnInit {

  changePasswordForm!: FormGroup;
  submitted = false;
  oldPasswordView = false;
  passwordView = false;
  confirmPasswordView = false;
  userId!: string;

  constructor(
    private fb: FormBuilder,
    private profileService: ProfileService,
    private router: Router,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const profile = JSON.parse(storedUser);
      this.userId = profile.userId;
    }

    this.initForm();
  }

  private initForm(): void {
    this.changePasswordForm = this.fb.group(
      {
        oldPwd: ['', [Validators.required, Validators.maxLength(20), CustomValidators.noWhitespace()]],
        newPwd: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(20), CustomValidators.strongPassword()]],
        confirmPwd: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  private passwordMatchValidator(group: AbstractControl): { [key: string]: any } | null {
    const newPwd = group.get('newPwd')?.value;
    const confirmPwd = group.get('confirmPwd')?.value;
    return newPwd && confirmPwd && newPwd !== confirmPwd ? { mismatch: true } : null;
  }

  changePassword(): void {
    this.submitted = true;
    this.changePasswordForm.markAllAsTouched();

    if (this.changePasswordForm.invalid) {
      return;
    }

    const { oldPwd, newPwd, confirmPwd } = this.changePasswordForm.value;

    if (oldPwd === newPwd) {
      this.alertService.warning('The New Password must be different from the Old Password.');
      return;
    }

    const request = {
      oldpassword: oldPwd,
      password: newPwd,
      userId: this.userId,
    };

    this.profileService.changePasswordApi(request).subscribe({
      next: (response) => {
        if (response.status === HttpStatusCode.Ok) {
          this.alertService.success(
            'Your Password has been changed successfully. Please log in again with your New Password.'
          ).then(() => {
            localStorage.clear();
            this.router.navigate(['/login']);
          });
        } else {
          this.alertService.error(response.statusMessage || 'Password change failed.');
        }
      },
      error: (err) => {
        this.alertService.error(err.message || 'Something went wrong!');
      },
    });
  }

  resetData(): void {
    this.submitted = false;
    this.changePasswordForm.reset();
  }

  toggleOldPasswordview() { this.oldPasswordView = !this.oldPasswordView; }
  togglePasswordview() { this.passwordView = !this.passwordView; }
  toggleConfirmPasswordview() { this.confirmPasswordView = !this.confirmPasswordView; }
}
