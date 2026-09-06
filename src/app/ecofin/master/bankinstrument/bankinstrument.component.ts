import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { BankInstrumentService } from 'src/app/shared/services/master/bankinstrument.service';

@Component({
  selector: 'app-bankinstrument',
  templateUrl: './bankinstrument.component.html',
  styleUrls: ['./bankinstrument.component.css']
})
export class BankInstrumentComponent implements OnInit {

  isLoading = false;
  isEditMode = false;
  userName = '';
  editBankCode = '';
  editBookNo = 0;

  serialRangeError = false;
  overlapError = false;

  instrForm!: FormGroup;

  bankList: { bankCode: string; bankName: string; accounts: any[] }[] = [];
  instrumentList: any[] = [];
  filteredAccounts: { accountCode: string; accountName: string }[] = [];

  searchText = '';
  filteredRows: any[] = [];

  readonly categoryOptions = [
    { value: 'CHEQ', label: 'Cheque' },
    { value: 'DD', label: 'DD' },
    { value: 'PO', label: 'PO' },
    { value: 'NEFT', label: 'NEFT' },
    { value: 'RTGS', label: 'RTGS' },
    { value: 'IMPS', label: 'IMPS' }
  ];

  readonly typeOptions = [
    { value: 'PAYM', label: 'Payment' },
    { value: 'RCPT', label: 'Receipt' }
  ];

  readonly statusOptions = [
    { value: 'ACTVE', label: 'Active' },
    { value: 'OBSLT', label: 'Obsolete' },
    { value: 'INACTV', label: 'Inactive' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: BankInstrumentService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.buildForm();
    this.loadBanks();
    this.loadInstruments();
  }

  buildForm(): void {
    this.instrForm = this.fb.group({
      bankCode: ['', Validators.required],
      accountCode: ['', Validators.required],
      instrumentCategory: [''],
      instrumentType: [''],
      instrumentBookNo: [{ value: '', disabled: true }],
      bookDescription: ['', Validators.required],
      startingSerialNo: ['', Validators.required],
      endingSerialNo: ['', Validators.required],
      runningSerialNo: [{ value: '', disabled: true }],
      instrumentLeaves: [{ value: '', disabled: true }],
      activeStatus: ['ACTVE', Validators.required]
    });

    this.instrForm.get('startingSerialNo')?.valueChanges.subscribe(() => this.calcLeaves());
    this.instrForm.get('endingSerialNo')?.valueChanges.subscribe(() => this.calcLeaves());
  }

  private calcLeaves(): void {
    const start = Number(this.instrForm.get('startingSerialNo')?.value);
    const end = Number(this.instrForm.get('endingSerialNo')?.value);
    this.serialRangeError = !!end && !!start && end < start;
    if (!isNaN(start) && !isNaN(end) && end >= start && start > 0) {
      this.instrForm.get('instrumentLeaves')?.setValue(end - start + 1, { emitEvent: false });
    } else {
      this.instrForm.get('instrumentLeaves')?.setValue('', { emitEvent: false });
    }
  }

  isInvalid(ctrl: string): boolean {
    const c = this.instrForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.instrForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  categoryLabel(val: string): string { return this.categoryOptions.find(x => x.value === val)?.label ?? val ?? ''; }
  typeLabel(val: string): string { return this.typeOptions.find(x => x.value === val)?.label ?? val ?? ''; }
  statusLabel(val: string): string { return this.statusOptions.find(x => x.value === val)?.label ?? val ?? ''; }

  onBankChange(): void {
    const code = this.instrForm.get('bankCode')?.value;
    const bank = this.bankList.find(b => b.bankCode === code);
    this.filteredAccounts = bank?.accounts ?? [];
    this.instrForm.get('accountCode')?.setValue('');
    this.applyFilter();
  }

  loadBanks(): void {
    this.svc.getAllBanksWithAccounts().subscribe({
      next: (resp: any) => {
        const raw: any[] = Array.isArray(resp?.data) ? resp.data : [];
        this.bankList = raw.map(b => ({
          bankCode: b.bankCode,
          bankName: b.bankName,
          accounts: (b.bankAccounts ?? []).map((a: any) => ({
            accountCode: a.accountCode,
            accountName: a.accountName
          }))
        }));
        this.cd.detectChanges();
      },
      error: () => this.alertService.error('Failed to load banks.')
    });
  }

  loadInstruments(): void {
    this.isLoading = true;
    this.svc.getAllInstruments()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.instrumentList = Array.isArray(resp?.data) ? resp.data : [];
          this.applyFilter();
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load instrument books.')
      });
  }

  applyFilter(): void {
    let list = this.instrumentList;
    if (this.searchText) {
      const q = this.searchText.trim().toLowerCase();
      list = list.filter(r =>
        r.bankName?.toLowerCase().includes(q) ||
        r.accountCode?.toLowerCase().includes(q) ||
        r.bookDescription?.toLowerCase().includes(q)
      );
    }
    this.filteredRows = list;
  }

  clearFilters(): void {
    this.searchText = '';
    this.applyFilter();
  }

  onSave(): void {
    this.instrForm.markAllAsTouched();
    this.serialRangeError = false;
    this.overlapError = false;

    if (this.instrForm.invalid) return;

    const v = this.instrForm.getRawValue();
    const start = Number(v.startingSerialNo);
    const end = Number(v.endingSerialNo);

    if (end < start) { this.serialRangeError = true; return; }

    const others = this.instrumentList.filter(r =>
      r.bankCode === v.bankCode &&
      r.accountCode === v.accountCode &&
      !(this.isEditMode && r.bankCode === this.editBankCode && r.instrumentBookNo === this.editBookNo)
    );
    const hasOverlap = others.some(r =>
      start <= Number(r.endingSerialNo) && end >= Number(r.startingSerialNo)
    );
    if (hasOverlap) { this.overlapError = true; return; }

    if (this.isEditMode) {
      const running = Number(v.runningSerialNo);
      if (!isNaN(running) && running > 0 && end < running) {
        this.alertService.warning(`Ending serial (${end}) must be ≥ running serial (${running}).`);
        return;
      }
    }

    this.isLoading = true;
    this.svc.saveOrUpdateInstrument(this.buildPayload(v))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Failed to save.');
            return;
          }
          this.alertService.success(resp?.message || (this.isEditMode ? 'Updated successfully.' : 'Saved successfully.'));
          this.onClear();
          this.loadInstruments();
        },
        error: () => this.alertService.error(this.isEditMode ? 'Update failed.' : 'Save failed.')
      });
  }

  onClear(): void {
    const v = this.instrForm.getRawValue();
    const savedBankCode = v.bankCode;
    const savedAccountCode = v.accountCode;
    const savedCategory = v.instrumentCategory;
    const savedType = v.instrumentType;

    this.isEditMode = false;
    this.editBankCode = '';
    this.editBookNo = 0;
    this.serialRangeError = false;
    this.overlapError = false;

    Object.keys(this.instrForm.controls).forEach(ctrl =>
      this.instrForm.get(ctrl)?.enable()
    );

    this.instrForm.reset({ activeStatus: 'ACTVE' });
    this.instrForm.markAsPristine();
    this.instrForm.markAsUntouched();

    this.instrForm.patchValue({
      bankCode: savedBankCode,
      accountCode: savedAccountCode,
      instrumentCategory: savedCategory,
      instrumentType: savedType
    });

    this.instrForm.get('instrumentBookNo')?.disable();
    this.instrForm.get('runningSerialNo')?.disable();
    this.instrForm.get('instrumentLeaves')?.disable();

    const bank = this.bankList.find(b => b.bankCode === savedBankCode);
    this.filteredAccounts = bank?.accounts ?? [];
  }

  startEdit(row: any): void {
    this.isEditMode = true;
    this.editBankCode = row.bankCode;
    this.editBookNo = row.instrumentBookNo;
    this.serialRangeError = false;
    this.overlapError = false;

    const bank = this.bankList.find(b => b.bankCode === row.bankCode);
    this.filteredAccounts = bank?.accounts ?? [];

    Object.keys(this.instrForm.controls).forEach(ctrl =>
      this.instrForm.get(ctrl)?.enable()
    );

    this.instrForm.patchValue({
      bankCode: row.bankCode,
      accountCode: row.accountCode,
      instrumentCategory: row.instrumentCategory ?? '',
      instrumentType: row.instrumentType ?? '',
      instrumentBookNo: row.instrumentBookNo,
      bookDescription: row.bookDescription,
      startingSerialNo: row.startingSerialNo,
      endingSerialNo: row.endingSerialNo,
      runningSerialNo: row.runningSerialNo,
      instrumentLeaves: row.instrumentLeaves,
      activeStatus: row.activeStatus ?? 'ACTVE'
    });

    this.instrForm.get('bankCode')?.disable();
    this.instrForm.get('accountCode')?.disable();
    this.instrForm.get('instrumentBookNo')?.disable();

    this.instrForm.get('startingSerialNo')?.disable();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private buildPayload(v: any): any {
    return {
      bankCode: v.bankCode,
      accountCode: v.accountCode,
      instrumentCategory: v.instrumentCategory,
      instrumentType: v.instrumentType,
      instrumentBookNo: v.instrumentBookNo || null,
      bookDescription: v.bookDescription || null,
      startingSerialNo: Number(v.startingSerialNo),
      endingSerialNo: Number(v.endingSerialNo),
      runningSerialNo: v.runningSerialNo ? Number(v.runningSerialNo) : null,
      instrumentLeaves: v.instrumentLeaves ? Number(v.instrumentLeaves) : null,
      activeStatus: v.activeStatus ?? 'ACTVE',
      username: this.userName,
      location: 'BILZ'
    };
  }
}