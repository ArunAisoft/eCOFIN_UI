import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpStatusCode } from '@angular/common/http';
import { Router } from '@angular/router';
import { UserService } from 'src/app/shared/services/user.service';
import { AbstractControl, FormBuilder, FormGroup, Validators, } from '@angular/forms';
import { noWhitespaceValidator } from 'src/app/shared/validators/whitespace.validator';
import { ProfileService } from 'src/app/shared/services/profile.service';
import { CustomValidators } from 'src/app/shared/validators/custom-validators';
import { AlertService } from 'src/app/shared/utils/alert.service';

declare var $: any;
@Component({
  selector: 'app-my-profile',
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.css'],
})
export class MyProfileComponent implements OnInit {
  pageNo: any;
  pageSize: any;
  createUserGroup: any;
  editForm: any;
  createPasswordGroup!: FormGroup;
  submitted: boolean = false;
  confirmpasswordview: boolean = false;
  passwordview: boolean = false;
  diagnosticValues: any[] = [];
  id: any;
  userId: any;
  profile: any | null;
  showDiagnostic: boolean = true;

  constructor(
    private router: Router,
    private http: HttpClient,
    private userService: UserService,
    private profileService: ProfileService,
    private formBuilder: FormBuilder,
    private alertService: AlertService

  ) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.createUserGroup = this.formBuilder.group({
      id: [0, [Validators.required]],
      roleId: ['', [Validators.required]],
      diagnosticsId: ['', [Validators.required]],
      firstName: ['', [Validators.required, noWhitespaceValidator(), CustomValidators.onlyLettersAndSpaces()]],
      lastName: ['', [Validators.required, noWhitespaceValidator(), CustomValidators.onlyLettersAndSpaces()]],
      email: ['', [Validators.required, Validators.email]],
      // password: ['', [Validators.required]],
      telephoneNo: ['', [Validators.pattern(/^[6-9]\d{9}$/)]],
      status: ['1', [Validators.required]],
    });

    const profileObject = localStorage.getItem('user');
    if (profileObject) { this.profile = JSON.parse(profileObject); }

    this.userId = this.profile.userId;

    this.getProfileData();
    this.createUserGroup.get('email')?.disable();
    this.createUserGroup.get('roleId')?.disable();
  }

  ConfirmPasswordValidator(controlName: string, matchingControlName: string) {
    return (formGroup: FormGroup) => {
      let control = formGroup.controls[controlName];
      let matchingControl = formGroup.controls[matchingControlName];
      if (
        matchingControl.errors &&
        !matchingControl.errors['confirmPasswordValidator']
      ) {
        return;
      }
      if (control.value !== matchingControl.value) {
        matchingControl.setErrors({ confirmPasswordValidator: true });
      } else {
        matchingControl.setErrors(null);
      }
    };
  }

  get f(): { [key: string]: AbstractControl } {
    return this.createUserGroup.controls;
  }

  getProfileData() {
    this.profileService.fetchUserById(this.userId).subscribe((data) => {
      if (data.content) {
        let { telephoneNo, diagnosticsId, roleId, firstName, lastName, email, status } = data.content;

        if (telephoneNo) {
          if (telephoneNo.startsWith('+91')) {
            telephoneNo = telephoneNo.replace('+91', '');
          }
          telephoneNo = telephoneNo.length === 10 ? telephoneNo : '';
        }

        if (!this.diagnosticValues.some((option) => option.id === diagnosticsId)) {
          diagnosticsId = '';
        }
        this.createUserGroup.patchValue({
          id: this.userId,
          roleId,
          firstName,
          lastName,
          email,
          telephoneNo,
          status,
        });

        if (roleId === 4 || roleId === 6 || roleId === 9 || roleId === 10 || roleId === 11 || roleId === 12 || roleId === 13 || roleId == 14) {
          this.showDiagnostic = false;
          this.createUserGroup.get('diagnosticsId')?.disable();
          this.createUserGroup.patchValue({ diagnosticsId: '' });
        } else {
          this.showDiagnostic = true;
          this.createUserGroup.get('diagnosticsId')?.enable();
          this.createUserGroup.patchValue({ diagnosticsId: Number(diagnosticsId) });
        }
      }
    });
  }

  //function to send/create User
  createUser() {
    this.submitted = true;

    if (this.createUserGroup.invalid) {
      return;
    }
    const formValue = { ...this.createUserGroup.value };
    const pData = { ...this.createUserGroup.value };
    formValue.diagnosticsId = Number(formValue.diagnosticsId);

    if (pData.telephoneNo && pData.telephoneNo.length == 10) {
      pData.telephoneNo = '+91' + pData.telephoneNo;
    }
    this.profileService.updateDiag(pData).subscribe((data) => {
      if (data && data.status == HttpStatusCode.Ok) {
        this.profile.userFullName = `${this.createUserGroup.controls['firstName'].value} ${this.createUserGroup.controls['lastName'].value}`;
        localStorage.setItem('user', JSON.stringify(this.profile));
        this.profileService.setProfileData(this.profile);
        this.alertService.error('Profile Updated Successfully!').then(() => {
          this.submitted = false;
        });
      } else {
        this.alertService.error(data.statusMessage).then(() => { });
      }
    });
  }

  toggleCnfPasswordview() {
    this.confirmpasswordview = !this.confirmpasswordview;
  }

  cancelAction() {
    this.router.navigate(['/dashboard']);
  }

  onlyAlphabetsAndSpace(event: KeyboardEvent) {
    const char = event.key;
    const regex = /^[a-zA-Z\s]$/;

    if (!regex.test(char)) {
      event.preventDefault();
    }
  }
}
