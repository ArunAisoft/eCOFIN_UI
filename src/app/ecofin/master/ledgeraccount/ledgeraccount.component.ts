import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import {
  LedgerAccountService,
  AccountDto,
  ParameterDto,
  BankDto,
  EfcAccountDto
} from 'src/app/shared/services/master/ledger-account.service';

@Component({
  selector: 'app-ledgeraccount',
  templateUrl: './ledgeraccount.component.html',
  styleUrls: ['./ledgeraccount.component.css']
})
export class LedgerAccountComponent implements OnInit {

  isLoading = false;
  isSaving = false;
  userName = '';
  isEditMode = false;
  editingCode = '';
  searchText = '';

  accountForm!: FormGroup;
  accountList: AccountDto[] = [];

  accountTypes: ParameterDto[] = [];
  accountNatures: ParameterDto[] = [];
  bankList: BankDto[] = [];
  efcAccounts: EfcAccountDto[] = [];

  readonly statusOptions = [
    { value: 'ACTVE', label: 'Active' },
    { value: 'INACT', label: 'Inactive' },
    { value: 'OBSLT', label: 'Obsolete' }
  ];

  readonly groupItemOptions = [
    { value: 'N', label: 'No' },
    { value: 'Y', label: 'Yes' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: LedgerAccountService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.buildForm();
    this.loadDropdowns();
    this.loadAccounts();

    // Toggle field state based on Group Item
    this.accountForm.get('groupItem')?.valueChanges.subscribe(val => {
      this.applyGroupItemState(val);
    });

    // Toggle bank dropdown visibility based on Account Type
    this.accountForm.get('accountType')?.valueChanges.subscribe(val => {
      this.onAccountTypeChange(val);
    });
  }

  get filteredAccountList(): AccountDto[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.accountList;
    return this.accountList.filter(r =>
      r.accountCode?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.accountType?.toLowerCase().includes(q) ||
      r.natureOfAccount?.toLowerCase().includes(q) ||
      r.accountStatus?.toLowerCase().includes(q)
    );
  }

  buildForm(): void {
    this.accountForm = this.fb.group({
      accountCode: ['', [Validators.required, Validators.maxLength(20)]],
      description: ['', [Validators.required, Validators.maxLength(100)]],
      accountType: ['', Validators.required],
      natureOfAccount: ['', Validators.required],
      accountStatus: ['ACTVE', Validators.required],
      activatePeriod: [''],
      zeroLevelCheck: [false],

      groupItem: ['N'],
      parentRefr: [''],

      banker: [''],
      efcAccount: [''],

      billwiseAppl: [false],
      budgetAppl: [false],
      costAppl: [false],
      subledgerAppl: [false],
      employeeAppl: [false],
      costTypeAppl: [false],
      expenseAppl: [false]
    });
  }

  isInvalid(ctrl: string): boolean {
    const c = this.accountForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.accountForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  statusLabel(val: string): string { return this.statusOptions.find(x => x.value === val)?.label ?? val ?? ''; }
  accountTypeLabel(val: string): string { return this.accountTypes.find(x => x.parameterCode === val)?.parameterDescription ?? val ?? ''; }
  natureLabel(val: string): string { return this.accountNatures.find(x => x.parameterCode === val)?.parameterDescription ?? val ?? ''; }

  get isBankAccountType(): boolean {
    return (this.accountForm.get('accountType')?.value || '').toUpperCase() === 'BANK';
  }

  get isGroupItem(): boolean {
    return this.accountForm.get('groupItem')?.value === 'Y';
  }

  /* ================= DROPDOWNS & DATA ================= */

  loadDropdowns(): void {
    this.svc.getAccountTypes().subscribe({
      next: (res: any) => this.accountTypes = Array.isArray(res?.data) ? res.data : [],
      error: () => this.alertService.error('Failed to load account types.')
    });

    this.svc.getAccountNatures().subscribe({
      next: (res: any) => this.accountNatures = Array.isArray(res?.data) ? res.data : [],
      error: () => this.alertService.error('Failed to load account natures.')
    });

    this.svc.getBanks().subscribe({
      next: (res: any) => this.bankList = Array.isArray(res?.data) ? res.data : [],
      error: () => this.alertService.error('Failed to load banks.')
    });

    this.svc.getEfcAccounts().subscribe({
      next: (res: any) => this.efcAccounts = Array.isArray(res?.data) ? res.data : [],
      error: () => this.alertService.error('Failed to load EFC accounts.')
    });
  }

  loadAccounts(): void {
    this.isLoading = true;
    this.svc.getAllAccounts()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: any) => {
          this.accountList = Array.isArray(res?.data) ? res.data : [];
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load accounts.')
      });
  }

  /* ================= GROUP ITEM / TYPE TOGGLES ================= */

  applyGroupItemState(val: string): void {
    const disable = val === 'Y';
    const fields = ['banker', 'efcAccount', 'billwiseAppl', 'budgetAppl', 'costAppl',
      'subledgerAppl', 'employeeAppl', 'costTypeAppl', 'expenseAppl'];

    fields.forEach(f => {
      const c = this.accountForm.get(f);
      if (!c) return;
      if (disable) {
        if (typeof c.value === 'boolean') c.setValue(false, { emitEvent: false });
        else c.setValue('', { emitEvent: false });
        c.disable({ emitEvent: false });
      } else {
        c.enable({ emitEvent: false });
      }
    });
  }

  onAccountTypeChange(val: string): void {
    const isBank = (val || '').toUpperCase() === 'BANK';
    const banker = this.accountForm.get('banker');
    if (!banker) return;
    if (!isBank) banker.setValue('', { emitEvent: false });
  }

  /* ================= CRUD ================= */

  onSave(): void {
    this.accountForm.markAllAsTouched();
    if (this.accountForm.invalid) return;

    const v = this.accountForm.getRawValue();
    const code = v.accountCode as string;

    if (!this.isEditMode) {
      const dup = this.accountList.some(r => (r.accountCode ?? '') === code);
      if (dup) { this.alertService.warning(`Account code '${code}' already exists.`); return; }
    }

    this.isSaving = true;
    this.svc.saveOrUpdateAccount(this.buildPayload(v))
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (res: any) => {
          if (res?.success === false) { this.alertService.warning(res?.message || 'Failed to save.'); return; }
          this.alertService.success(res?.message || (this.isEditMode ? 'Updated successfully.' : 'Saved successfully.'));
          this.onClear();
          this.loadAccounts();
        },
        error: () => this.alertService.error(this.isEditMode ? 'Update failed.' : 'Save failed.')
      });
  }

  onClear(): void {
    this.isEditMode = false;
    this.editingCode = '';
    this.accountForm.reset({
      accountCode: '', description: '',
      accountType: '', natureOfAccount: '',
      accountStatus: 'ACTVE', activatePeriod: '', zeroLevelCheck: false,
      groupItem: 'N', parentRefr: '',
      banker: '', efcAccount: '',
      billwiseAppl: false, budgetAppl: false, costAppl: false,
      subledgerAppl: false, employeeAppl: false, costTypeAppl: false, expenseAppl: false
    });
    this.accountForm.get('accountCode')?.enable();
    this.applyGroupItemState('N');
    this.accountForm.markAsPristine();
    this.accountForm.markAsUntouched();
    this.cd.detectChanges();
  }

  startEdit(row: AccountDto): void {
    this.isEditMode = true;
    this.editingCode = row.accountCode;
    this.accountForm.patchValue({
      accountCode: row.accountCode,
      description: row.description,
      accountType: row.accountType,
      natureOfAccount: row.natureOfAccount,
      accountStatus: row.accountStatus ?? 'ACTVE',
      activatePeriod: row.activatePeriod ?? '',
      zeroLevelCheck: row.zeroLevelCheck ?? false,
      groupItem: row.controlAccount === 'Y' ? 'Y' : 'N',
      parentRefr: row.parentRefr ?? '',
      banker: row.banker ?? '',
      efcAccount: row.efcAccount ?? '',
      billwiseAppl: row.billwiseAppl === 'Y',
      budgetAppl: row.budgetAppl === 'Y',
      costAppl: row.costAppl === 'Y',
      subledgerAppl: row.subledgerAppl === 'Y',
      employeeAppl: row.employeeAppl === 'Y',
      costTypeAppl: row.costTypeAppl === 'Y',
      expenseAppl: row.expenseAppl === 'Y'
    });
    this.accountForm.get('accountCode')?.disable();
    this.applyGroupItemState(row.controlAccount === 'Y' ? 'Y' : 'N');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private buildPayload(v: any): any {
    const yn = (b: boolean) => (b ? 'Y' : 'N');
    return {
      accountCode: this.isEditMode ? this.editingCode : v.accountCode,
      description: v.description,
      accountType: v.accountType,
      natureOfAccount: v.natureOfAccount,
      accountStatus: v.accountStatus ?? 'ACTVE',
      activatePeriod: v.activatePeriod || null,
      zeroLevelCheck: yn(!!v.zeroLevelCheck),
      controlAccount: v.groupItem === 'Y' ? 'Y' : 'N',
      parentRefr: v.parentRefr || null,
      banker: v.banker || null,
      efcAccount: v.efcAccount || null,
      billwiseAppl: yn(!!v.billwiseAppl),
      budgetAppl: yn(!!v.budgetAppl),
      costAppl: yn(!!v.costAppl),
      subledgerAppl: yn(!!v.subledgerAppl),
      employeeAppl: yn(!!v.employeeAppl),
      costTypeAppl: yn(!!v.costTypeAppl),
      expenseAppl: yn(!!v.expenseAppl),
      username: this.userName,
      location: 'BILZ'
    };
  }
}