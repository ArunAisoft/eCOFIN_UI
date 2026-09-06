import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { UserService, UserDto } from 'src/app/shared/services/master/user.service';

export function passwordMatchValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const pwd = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    if (confirm && pwd !== confirm) {
      group.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      const existing = group.get('confirmPassword')?.errors;
      if (existing) {
        const { mismatch, ...rest } = existing;
        group.get('confirmPassword')?.setErrors(Object.keys(rest).length ? rest : null);
      }
    }
    return null;
  };
}

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html'
})
export class UserComponent implements OnInit {

  isLoading = false;
  isEditMode = false;
  loggedInUser = '';
  editingCode = '';
  searchText = '';

  userForm!: FormGroup;
  userList: UserDto[] = [];

  readonly statusOptions = [
    { value: 'ACTVE', label: 'Active' },
    { value: 'INACT', label: 'Inactive' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: UserService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.loggedInUser = u;
    this.buildForm();
    this.loadUsers();
  }

  get filteredUserList(): UserDto[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.userList;
    return this.userList.filter(r =>
      r.username?.toLowerCase().includes(q) ||
      r.nameDescription?.toLowerCase().includes(q) ||
      r.objectStatus?.toLowerCase().includes(q)
    );
  }

  buildForm(): void {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(30)]],
      nameDescription: ['', [Validators.required, Validators.maxLength(100)]],
      objectStatus: ['ACTVE', Validators.required],
      password: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator() });
  }

  isInvalid(ctrl: string): boolean {
    const c = this.userForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.userForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  statusLabel(val: string): string {
    return this.statusOptions.find(x => x.value === val)?.label ?? val ?? '';
  }

  loadUsers(): void {
    this.isLoading = true;
    this.svc.getAllUsers()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.userList = Array.isArray(resp?.data) ? resp.data : [];
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load user list.')
      });
  }

  startEdit(user: UserDto): void {
    this.isEditMode = true;
    this.editingCode = user.username;
    this.userForm.patchValue({
      username: user.username,
      nameDescription: user.nameDescription,
      objectStatus: user.objectStatus ?? 'ACTVE',
      password: '',
      confirmPassword: ''
    });
    this.userForm.get('username')?.disable();
    this.userForm.markAsUntouched();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onClear(): void {
    this.isEditMode = false;
    this.editingCode = '';
    this.userForm.reset({ objectStatus: 'ACTVE' });
    this.userForm.get('username')?.enable();
    this.userForm.markAsPristine();
    this.userForm.markAsUntouched();
    this.cd.detectChanges();
  }

  onSave(): void {
    this.userForm.markAllAsTouched();
    if (this.userForm.invalid) return;

    const v = this.userForm.getRawValue();
    const uname = v.username as string;

    if (!this.isEditMode) {
      const dup = this.userList.some(r => (r.username ?? '') === uname);
      if (dup) { this.alertService.warning(`Username '${uname}' already exists.`); return; }
    }

    this.isLoading = true;
    this.svc.saveOrUpdateUser(this.buildPayload())
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Failed to save.');
            return;
          }
          this.alertService.success(resp?.message || (this.isEditMode ? 'Updated successfully.' : 'Saved successfully.'));
          this.onClear();
          this.loadUsers();
        },
        error: () => this.alertService.error(this.isEditMode ? 'Update failed.' : 'Save failed.')
      });
  }

  private buildPayload(): any {
    const v = this.userForm.getRawValue();
    return {
      username: this.isEditMode ? this.editingCode : v.username,
      nameDescription: v.nameDescription,
      objectStatus: v.objectStatus ?? 'ACTVE',
      password: Number(v.password),
      loggedInUser: this.loggedInUser,
      location: 'BILZ'
    };
  }
}