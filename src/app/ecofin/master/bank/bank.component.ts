import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { BankService, BankDto } from 'src/app/shared/services/master/bank.service';

@Component({
  selector: 'app-bank',
  templateUrl: './bank.component.html'
})
export class BankComponent implements OnInit {

  isLoading = false;
  isEditMode = false;
  userName = '';
  editingCode = '';
  searchText = '';

  bankForm!: FormGroup;
  bankList: BankDto[] = [];

  readonly statusOptions = [
    { value: 'ACTVE', label: 'Active' },
    { value: 'INACT', label: 'Inactive' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: BankService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.buildForm();
    this.loadBanks();
  }

  get filteredBankList(): BankDto[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.bankList;
    return this.bankList.filter(r =>
      r.bankCode?.toLowerCase().includes(q) ||
      r.name?.toLowerCase().includes(q) ||
      r.addrLine1?.toLowerCase().includes(q) ||
      r.addrLine2?.toLowerCase().includes(q) ||
      r.addrCity?.toLowerCase().includes(q) ||
      r.addrState?.toLowerCase().includes(q) ||
      r.addrCountry?.toLowerCase().includes(q)
    );
  }

  buildForm(): void {
    this.bankForm = this.fb.group({
      bankCode: ['', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
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
    const c = this.bankForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.bankForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  statusLabel(val: string): string {
    return this.statusOptions.find(x => x.value === val)?.label ?? val ?? '';
  }

  loadBanks(): void {
    this.isLoading = true;
    this.svc.getAllBanks()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.bankList = Array.isArray(resp?.data) ? resp.data : [];
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load bank list.')
      });
  }

  startEdit(bank: BankDto): void {
    this.isEditMode = true;
    this.editingCode = bank.bankCode;
    this.bankForm.patchValue({
      bankCode: bank.bankCode,
      name: bank.name,
      objectStatus: bank.objectStatus ?? 'ACTVE',
      addrLine1: bank.addrLine1,
      addrLine2: bank.addrLine2,
      addrLine3: bank.addrLine3,
      addrLine4: bank.addrLine4,
      addrCity: bank.addrCity,
      addrPin: bank.addrPin,
      addrState: bank.addrState,
      addrCountry: bank.addrCountry
    });
    this.bankForm.get('bankCode')?.disable();
    this.bankForm.markAsUntouched();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onClear(): void {
    this.isEditMode = false;
    this.editingCode = '';
    this.bankForm.reset({ objectStatus: 'ACTVE' });
    this.bankForm.get('bankCode')?.enable();
    this.bankForm.markAsPristine();
    this.bankForm.markAsUntouched();
    this.cd.detectChanges();
  }

  onSave(): void {
    this.bankForm.markAllAsTouched();
    if (this.bankForm.invalid) return;

    const v = this.bankForm.getRawValue();
    const code = v.bankCode as string;

    if (!this.isEditMode) {
      const dup = this.bankList.some(r => (r.bankCode ?? '') === code);
      if (dup) { this.alertService.warning(`Bank code '${code}' already exists.`); return; }
    }

    this.isLoading = true;
    this.svc.saveOrUpdateBank(this.buildPayload())
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Failed to save.');
            return;
          }
          this.alertService.success(resp?.message || (this.isEditMode ? 'Updated successfully.' : 'Saved successfully.'));
          this.onClear();
          this.loadBanks();
        },
        error: () => this.alertService.error(this.isEditMode ? 'Update failed.' : 'Save failed.')
      });
  }

  private buildPayload(): any {
    const v = this.bankForm.getRawValue();
    return {
      bankCode: this.isEditMode ? this.editingCode : v.bankCode,
      name: v.name,
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