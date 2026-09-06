import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { CompanyService } from 'src/app/shared/services/master/company.service';

@Component({
  selector: 'app-company',
  templateUrl: './company.component.html'
})
export class CompanyComponent implements OnInit {

  isLoading = false;
  userName = '';

  companyForm!: FormGroup;

  readonly statusOptions = [
    { value: 'ACTVE', label: 'Active' },
    { value: 'INACT', label: 'Inactive' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: CompanyService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.buildForm();
    this.loadCompany();
  }

  buildForm(): void {
    this.companyForm = this.fb.group({
      companyCode: ['', [Validators.required, Validators.maxLength(5)]],
      companyName: ['', [Validators.required, Validators.maxLength(50)]],
      objectStatus: ['ACTVE', Validators.required],
      addrLine1: ['', Validators.maxLength(100)],
      addrLine2: ['', Validators.maxLength(100)],
      addrLine3: ['', Validators.maxLength(100)],
      addrLine4: ['', Validators.maxLength(100)],
      addrCity: ['', Validators.maxLength(50)],
      addrPin: ['', Validators.maxLength(10)],
      addrState: ['', Validators.maxLength(50)],
      addrCountry: ['', Validators.maxLength(50)]
    });
  }

  isInvalid(ctrl: string): boolean {
    const c = this.companyForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.companyForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  loadCompany(): void {
    this.isLoading = true;
    this.svc.getCompany()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          const d = resp?.data;
          if (d) {
            this.companyForm.patchValue({
              companyCode: d.companyCode,
              companyName: d.companyName,
              objectStatus: d.objectStatus ?? 'ACTVE',
              addrLine1: d.addrLine1,
              addrLine2: d.addrLine2,
              addrLine3: d.addrLine3,
              addrLine4: d.addrLine4,
              addrCity: d.addrCity,
              addrPin: d.addrPin,
              addrState: d.addrState,
              addrCountry: d.addrCountry
            });
            this.companyForm.get('companyCode')?.disable();
          }
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load company.')
      });
  }

  onSave(): void {
    this.companyForm.markAllAsTouched();
    if (this.companyForm.invalid) return;

    this.isLoading = true;
    this.svc.saveOrUpdateCompany(this.buildPayload())
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Failed to save.');
            return;
          }
          this.alertService.success(resp?.message || 'Company saved successfully.');
          this.loadCompany();
        },
        error: () => this.alertService.error('Save failed.')
      });
  }

  private buildPayload(): any {
    const v = this.companyForm.getRawValue();
    return {
      companyCode: v.companyCode,
      companyName: v.companyName,
      objectStatus: v.objectStatus ?? 'ACTVE',
      addrLine1: v.addrLine1 || null,
      addrLine2: v.addrLine2 || null,
      addrLine3: v.addrLine3 || null,
      addrLine4: v.addrLine4 || null,
      addrCity: v.addrCity || null,
      addrPin: v.addrPin || null,
      addrState: v.addrState || null,
      addrCountry: v.addrCountry || null,
      username: this.userName,
      location: 'BILZ'
    };
  }
}