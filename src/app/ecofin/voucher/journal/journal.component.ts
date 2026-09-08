import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { JournalsService } from 'src/app/shared/services/voucher/journals.service';
import * as XLSX from 'xlsx';
import { formatDate } from '@angular/common';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { normalizeResponse } from 'src/app/shared/utils/normalize-response.service';
import { CommonService } from 'src/app/shared/services/voucher/common.service';
import { JournalSummaryModel, JournalWithDetailsModel, JournalsRequestModel } from 'src/app/shared/models/journals.models';
import { FinancialYearsWithPeriodsModel, CurrencyModel, BankAccountModel, GroupAccountModel, GroupSubAccountModel } from 'src/app/shared/models/common.models';

declare var $: any;
declare const bootstrap: any;

@Component({
  selector: 'app-journal',
  templateUrl: './journal.component.html',
  styleUrls: ['./journal.component.css']
})
export class JournalComponent implements OnInit, OnDestroy {
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  form!: FormGroup;
  costCenterForm!: FormGroup;

  modalAccountInfo: { accountCode?: string; subAccountCode?: string } | null = null;

  years: FinancialYearsWithPeriodsModel[] = [];
  months: any[] = [];
  currency: CurrencyModel[] = [];
  groups: GroupAccountModel[] = [];

  accounts: GroupSubAccountModel[] = [];
  accountsCache = new Map<string, GroupSubAccountModel[]>();

  userName: string = '';
  isLoading = false;

  rowsLoading = new Set<number>();

  voucherNo: string | null = null;
  onHoldNo: string | null = null;
  createdDate: string | null = null;
  updatedDate: string | null = null;

  voucherList: JournalSummaryModel[] = [];
  selectedYear: string | null = null;
  selectedVoucherNo: string | null = null;
  creditTotal = 0;
  debitTotal = 0;

  currentCostCenterTriggerIndex: number | null = null;
  costCenterModalInstance: any = null;
  rowGroupSubscriptions: Subscription[] = [];

  voucherTypes = [
    { voucherType: 'OTH', voucherDescription: 'Others' },
    { voucherType: 'REG', voucherDescription: 'Regular' }
  ];

  @ViewChild('excelFileInput') excelFileInput!: ElementRef<HTMLInputElement>;
  voucherSysCategoryItems = [{ code: 'REGUL', name: 'Regular' }];

  groupLabel = (g: GroupAccountModel) => g ? `${g.accountCode} → ${g.accountName || 'Unknown'}` : 'Unknown';
  ccLabel = (c: any) => c ? `${c.code} → ${c.name || 'Unknown'}` : 'Unknown';
  simpleCodeName(a: any): string { return a ? `${a.code} → ${a.name || 'Unknown'}` : 'Unknown'; }
  simpleName(x: any): string { return x ? x.name || 'Unknown' : 'Unknown'; }

  @ViewChild('costCenterModal', { static: false }) costCenterModal?: ElementRef<HTMLDivElement>;

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private dataService: JournalsService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    const userName = localStorage.getItem('userName');
    if (userName) this.userName = userName;
    this.buildForm();
    this.buildCostCenterForm();
    this.loadDropdownData();
    this.attachAllRowGroupSubscribers();
  }

  ngOnDestroy(): void {
    this.rowGroupSubscriptions.forEach(s => s.unsubscribe());
    this.rowGroupSubscriptions = [];
  }

  getTextClass(value: string | null | undefined): string { return value ? 'text-success' : 'text-danger'; }

  get isOnHoldNoGenerated(): boolean { return !!this.onHoldNo; }
  get isVoucherNoGenertaed(): boolean { return !!this.voucherNo; }

  isRowLoading(i: number): boolean { return this.rowsLoading.has(i); }

  hasCostCenterRows(i: number): boolean {
    const rows = this.getCtrl(i, 'costCenterDetails')?.value;
    return Array.isArray(rows) && rows.length > 0;
  }

  getCostCenterRowCount(i: number): number {
    const rows = this.getCtrl(i, 'costCenterDetails')?.value;
    return Array.isArray(rows) ? rows.length : 0;
  }

  hasInvoiceAmount(i: number): boolean {
    const rows = this.getCtrl(i, 'invoiceDetails')?.value;
    if (!Array.isArray(rows) || !rows.length) { return false; }
    const total = rows.reduce((sum: number, r: any) => sum + (Number(r.acceptedAmount) || 0), 0);
    return total > 0;
  }

  buildForm(): void {
    this.form = this.fb.group({
      header: this.fb.group({
        year: [null, Validators.required],
        month: [null, Validators.required]
      }),
      bankBlock: this.fb.group({
        currency: [null]
      }),
      voucherBlock: this.fb.group({
        voucherType: [null, Validators.required],
        voucherSysCategory: ['REGUL', Validators.required],
        voucherDate: [null, Validators.required],
        narration: [null, [Validators.maxLength(250)]]
      }),
      lines: this.fb.array([this.createLineGroup()])
    });
  }

  buildCostCenterForm(): void {
    this.costCenterForm = this.fb.group({
      rows: this.fb.array([this.fb.group({
        costCenter: [null, Validators.required],
        amount: [null, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]]
      })])
    });
  }

  createLineGroup(data: any = null): FormGroup {
    const auto = (data?.automated ?? 'N').toString().trim().toUpperCase();
    return this.fb.group({
      dc: [data?.dc ?? 'C', Validators.required],
      group: [data?.group ?? null, Validators.required],
      account: [data?.account ?? null],
      amount: [data?.amount ?? null, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]],
      receiptCategory: [data?.receiptCategory ?? null],
      receiptDate: [data?.receiptDate ?? null],
      receiptNo: [data?.receiptNo ?? null, [Validators.maxLength(50)]],
      particulars: [data?.particulars ?? null, [Validators.maxLength(200)]],
      invoiceDetails: [[]],
      costCenterDetails: [[]],
      automated: [auto === 'Y' ? 'Y' : 'N']
    });
  }

  get header(): FormGroup { return this.form.get('header') as FormGroup; }
  get bankBlock(): FormGroup { return this.form.get('bankBlock') as FormGroup; }
  get voucherBlock(): FormGroup { return this.form.get('voucherBlock') as FormGroup; }
  get lines(): FormArray { return this.form.get('lines') as FormArray; }
  get costCenterRows(): FormArray {
    if (!this.costCenterForm) this.buildCostCenterForm();
    return this.costCenterForm.get('rows') as FormArray;
  }

  getCtrl(i: number, name: string): AbstractControl | null { return (this.lines.at(i) as FormGroup).get(name) ?? null; }
  touchedOrDirty(i: number, name: string) { const c = this.getCtrl(i, name); return !!(c && (c.touched || c.dirty)); }
  lineControl(i: number, name: string): FormControl { return this.lines.at(i).get(name) as FormControl; }
  costCenterCtrl(i: number, name: string): AbstractControl | null { const arr = this.costCenterRows; return arr && arr.at(i) ? arr.at(i).get(name) : null; }
  costCenterInvalid(i: number, name: string): boolean { const c = this.costCenterCtrl(i, name); return !!c && c.invalid && (c.touched || c.dirty); }

  loadDropdownData(): void {
    this.isLoading = true;

    const years$ = normalizeResponse<any[]>(this.commonService.getYearList(), 'Financial Year list');
    const currencies$ = normalizeResponse<any[]>(this.commonService.getAllActiveCurrencies(), 'Currency list');

    forkJoin({ years: years$, currencies: currencies$ })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ years, currencies }) => {
          this.years = (years.data ?? []) as FinancialYearsWithPeriodsModel[];
          if (years.status === 200 && this.years.length) {
            const firstYear = this.years[0].financialyear;
            this.header.get('year')?.setValue(firstYear, { emitEvent: false });
            this.onYearChange();
          } else if (!this.years.length) {
            this.alertService.info(years.message || 'No Financial Year found.');
          } else {
            this.alertService.showCommonError(years.status, years.message, 'Financial Year list');
          }

          this.currency = (currencies.data ?? []) as CurrencyModel[];
          if (!this.currency.length) {
            this.alertService.showCommonError(currencies.status, currencies.message, 'Currency list');
          }
        },
        error: () => {
          this.alertService.error('Something went wrong while loading dropdown data.');
          this.currency = [];
        }
      });
  }

  onYearChange(): void {
    const fy = this.years.find((y: FinancialYearsWithPeriodsModel) => y.financialyear === this.header.get('year')?.value);
    this.months = fy?.periods || [];
    this.header.get('month')?.setValue(null);
    this.resetAllVoucherFields();
  }

  onMonthChange(): void {
    if (this.onHoldNo || this.voucherNo) this.resetAllVoucherFields();
    if (this.header.get('month')?.value) this.onView();
  }

  private getVoucherDateFromPeriod(): string {
    const selectedMonth = this.header.get('month')?.value;
    if (!selectedMonth) return formatDate(new Date(), 'yyyy-MM-dd', 'en');
    const selectedPeriod = this.months.find((p: any) => p.accperiod === selectedMonth);
    const periodFrom = selectedPeriod?.periodfrom;
    if (periodFrom) return formatDate(periodFrom, 'yyyy-MM-dd', 'en');
    return formatDate(new Date(), 'yyyy-MM-dd', 'en');
  }

  onVoucherTypeChange(): void {
    const voucherType = this.voucherBlock.get('voucherType')?.value;
    this.resetLinesBlock();
    this.groups = [];
    this.accounts = [];
    this.accountsCache.clear();
    if (!voucherType) return;
    this.loadGroupsByVoucherType(voucherType);
  }

  loadGroupsByVoucherType(voucherType: string, onLoaded?: () => void): void {
    this.isLoading = true;
    normalizeResponse<GroupAccountModel[]>(this.commonService.getAllGroupAccountsByVoucherType(voucherType), 'Group list')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: ApiResponse<GroupAccountModel[] | null>) => {
          this.groups = res.status === 200 ? (res.data ?? []) : [];
          if (!this.groups.length) this.alertService.showCommonError(res.status, res.message, 'Group list');
          if (onLoaded) onLoaded();
        },
        error: () => {
          this.groups = [];
          this.alertService.error('Something went wrong while loading Groups.');
          if (onLoaded) onLoaded();
        }
      });
  }

  onGroupChange(rowIndex: number): void {
    const fg = this.lines.at(rowIndex) as FormGroup;
    fg.patchValue({ account: null, costCenterDetails: [], invoiceDetails: [], amount: null }, { emitEvent: false });
    this.accounts = [];
    const groupCode: string | null = fg.get('group')?.value ?? null;
    if (!groupCode) {
      this.setAccountRequiredForRow(rowIndex, false);
      this.recalculateTotals();
      return;
    }

    const selectedGroup = this.groups.find(g => g.accountCode === groupCode);
    const accountType = (selectedGroup?.accountType ?? '').toUpperCase();
    const isCostCenter = (selectedGroup?.costAppl ?? 'N').toUpperCase() === 'Y';

    if (isCostCenter) {
      this.setAccountRequiredForRow(rowIndex, false);
      this.currentCostCenterTriggerIndex = rowIndex;
      this.costCenterForm.setControl('rows', this.fb.array([
        this.fb.group({
          costCenter: [null, Validators.required],
          amount: [null, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]],
          groupAccount: [groupCode]
        })
      ]));
      this.showCostCenterModal();
    }
    this.loadSubAccountsForRow(rowIndex, groupCode, isCostCenter, accountType, null);
    this.recalculateTotals();
  }

  setAccountRequiredForRow(rowIndex: number, required: boolean): void {
    const accountCtrl = this.lines.at(rowIndex)?.get('account');
    if (!accountCtrl) return;
    accountCtrl.setValidators(required ? [Validators.required] : null);
    accountCtrl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
  }

  loadSubAccountsForRow(rowIndex: number, groupAccountCode: string, includeCostCentres: boolean, accountType: string | null, preselectAccount: string | null): void {
    if (!accountType) {
      this.accountsCache.set(groupAccountCode, []);
      this.lines.at(rowIndex)?.get('account')?.setValue(null, { emitEvent: false });
      this.setAccountRequiredForRow(rowIndex, false);
      return;
    }

    this.rowsLoading.add(rowIndex);
    normalizeResponse<any[]>(this.commonService.getAllSubAccountsByCodeAndType(groupAccountCode, accountType, includeCostCentres), 'SubAccounts')
      .pipe(finalize(() => { this.rowsLoading.delete(rowIndex); }))
      .subscribe({
        next: (res: ApiResponse<any[] | null>) => {
          const list = res.status === 200 ? (res.data ?? []) : [];
          const typed = list as GroupSubAccountModel[];
          this.accountsCache.set(groupAccountCode, typed);
          this.accounts = typed;

          const hasSubs = typed.length > 0 && !includeCostCentres;
          this.setAccountRequiredForRow(rowIndex, hasSubs);

          const ctrl = this.lines.at(rowIndex)?.get('account');
          if (preselectAccount) {
            if (typed.some(a => a.code === preselectAccount)) {
              ctrl?.setValue(preselectAccount, { emitEvent: false });
            } else {
              console.warn(`Sub-account "${preselectAccount}" not found in list for group "${groupAccountCode}"`);
              ctrl?.setValue(null, { emitEvent: false });
            }
          } else {
            ctrl?.setValue(null, { emitEvent: false });
          }
        },
        error: () => {
          this.accountsCache.set(groupAccountCode, []);
          this.lines.at(rowIndex)?.get('account')?.setValue(null, { emitEvent: false });
          this.setAccountRequiredForRow(rowIndex, false);
          this.alertService.error('Something went wrong while loading SubAccounts.');
        }
      });
  }

  accountsForRow(index: number) {
    const groupCode = this.getCtrl(index, 'group')?.value;
    if (!groupCode) return [];
    return this.accountsCache.get(groupCode) ?? [];
  }

  hasSubAccounts(index: number): boolean {
    if (this.isCostCenterRow(index)) return false;
    return (this.accountsForRow(index)?.length ?? 0) > 0;
  }

  isCostCenterRow(i: number): boolean {
    const groupCode = this.getCtrl(i, 'group')?.value;
    const g = this.groups.find(x => x.accountCode === groupCode);
    return ((g?.costAppl ?? 'N') + '').toUpperCase() === 'Y';
  }

  getGroupName(index: number): string {
    const groupCode = this.getCtrl(index, 'group')?.value;
    if (!groupCode) return 'No Group Selected';
    const group = this.groups.find(g => g.accountCode === groupCode);
    if (!group) return groupCode;
    return `${group.accountCode} → ${group.accountName}`;
  }

  addEmptyLineRowAfter(index: number, event?: Event): void {
    const ke = event as KeyboardEvent;
    if (ke && typeof ke.preventDefault === 'function') ke.preventDefault();
    if (!this.validateRowsUpTo(index)) return;
    this.addLine(index);
  }

  addLine(afterIndex?: number): void {
    const newGroup: FormGroup = this.createLineGroup();
    const insertIndex = (typeof afterIndex === 'number' && afterIndex >= 0 && afterIndex < this.lines.length) ? afterIndex + 1 : this.lines.length;
    this.lines.insert(insertIndex, newGroup);
    this.setAccountRequiredForRow(insertIndex, false);
    this.attachRowGroupSubscriber(insertIndex);
    this.recalculateTotals();
  }

  removeLine(index: number): void {
    if (this.lines.length > 1) {
      if (this.rowGroupSubscriptions[index]) {
        this.rowGroupSubscriptions[index].unsubscribe();
        this.rowGroupSubscriptions.splice(index, 1);
      }
      this.rowsLoading.delete(index);
      this.lines.removeAt(index);
      this.recalculateTotals();
    }
  }

  validateRowsUpTo(index: number): boolean {
    for (let i = 0; i <= index && i < this.lines.length; i++) {
      (this.lines.at(i) as FormGroup).markAllAsTouched();
    }
    for (let i = 0; i <= index && i < this.lines.length; i++) {
      if ((this.lines.at(i) as FormGroup).invalid) return false;
    }
    return true;
  }

  isLineHasAnyValue(index: number): boolean {
    const fg = this.lines.at(index) as FormGroup | null;
    if (!fg) return false;
    const relevantKeys = ['group', 'account', 'amount', 'receiptCategory', 'receiptDate', 'receiptNo', 'particulars'];
    for (const k of relevantKeys) {
      const ctrl = fg.get(k);
      if (ctrl && (ctrl.touched || ctrl.dirty)) return true;
    }
    for (const k of relevantKeys) {
      const ctrl = fg.get(k);
      if (!ctrl) continue;
      const val = ctrl.value;
      if (val == null) continue;
      if (typeof val === 'string' && val.trim() === '') continue;
      if (Array.isArray(val) && val.length === 0) continue;
      if (typeof val === 'object' && Object.keys(val).length === 0) continue;
      return true;
    }
    return false;
  }

  resetLine(index: number): void {
    const fg = this.lines.at(index) as FormGroup | null;
    if (!fg) return;
    fg.reset({ dc: 'C', group: null, account: null, amount: null, receiptCategory: null, receiptDate: null, receiptNo: null, particulars: null }, { emitEvent: true });
    fg.markAsPristine();
    fg.markAsUntouched();
    this.recalculateTotals();
  }

  clearAllLinesKeepOneEmpty(): void {
    this.rowGroupSubscriptions.forEach(s => s.unsubscribe());
    this.rowGroupSubscriptions = [];
    this.rowsLoading.clear();
    this.lines.clear();
    this.lines.push(this.createLineGroup());
    this.attachAllRowGroupSubscribers();
    this.recalculateTotals();
  }

  resetMainBlock(): void {
    this.voucherNo = null;
    this.onHoldNo = null;
    this.createdDate = null;
    this.updatedDate = null;
    this.creditTotal = 0;
    this.debitTotal = 0;
  }

  resetBankBlock(): void {
    this.bankBlock.reset({ currency: null }, { emitEvent: false });
    this.accountsCache.clear();
    if (this.voucherBlock) {
      this.voucherBlock.get('voucherType')?.setValue(null);
      this.voucherBlock.get('voucherType')?.markAsPristine();
    }
  }

  resetVoucherBlock(): void {
    this.groups = [];
    this.accounts = [];
    this.accountsCache.clear();
    //const newVoucherDate = this.getVoucherDateFromPeriod();
    this.voucherBlock.reset({
      voucherType: null, voucherSysCategory: 'REGUL',
      //voucherDate: formatDate(newVoucherDate, 'yyyy-MM-dd', 'en'), narration: null
    }, { emitEvent: false });
  }

  resetLinesBlock(): void {
    this.rowGroupSubscriptions.forEach(s => s.unsubscribe());
    this.rowGroupSubscriptions = [];
    this.rowsLoading.clear();
    this.lines.clear();
    this.lines.push(this.createLineGroup());
    this.attachAllRowGroupSubscribers();
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.recalculateTotals();
  }

  resetAllVoucherFields(): void {
    this.resetMainBlock();
    this.resetBankBlock();
    this.resetVoucherBlock();
    this.resetLinesBlock();
  }

  recalculateTotals(): void {
    let c = 0, d = 0;
    this.lines.controls.forEach(l => {
      const dc = (l.get('dc')?.value ?? '').toString().trim().toUpperCase();
      const amt = Number.parseFloat(l.get('amount')?.value as any) || 0;
      if (dc === 'D') d += amt;
      else if (dc === 'C') c += amt;
    });
    this.creditTotal = c;
    this.debitTotal = d;
  }

  validateAllRows(): boolean {
    this.lines.controls.forEach(g => (g as FormGroup).markAllAsTouched());
    return this.lines.valid;
  }

  addEmptyCostCenterRowAfter(index: number): void {
    const arr = this.costCenterRows;
    if (!arr) return;
    const idx = (typeof index === 'number' && index >= 0) ? index : arr.length - 1;
    const current = arr.at(idx) as FormGroup | null;
    if (!current) return;
    current.markAllAsTouched();
    if (current.invalid) return;

    const next = arr.at(idx + 1) as FormGroup | null;
    if (next) {
      const nextIsEmpty = Object.keys(next.controls).every(k => {
        const v = next.get(k)?.value;
        return v === null || v === '' || (typeof v === 'string' && v.trim() === '');
      });
      if (nextIsEmpty) return;
    }

    const fgLine = this.lines.at(this.currentCostCenterTriggerIndex!) as FormGroup;
    const newRow = this.fb.group({
      costCenter: [null, Validators.required],
      amount: [null, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]],
      groupAccount: [fgLine.get('group')?.value]
    });
    const insertIndex = (idx >= 0 && idx < arr.length) ? idx + 1 : arr.length;
    arr.insert(insertIndex, newRow);
  }

  removeCostCenterRow(i: number): void { if (this.costCenterRows.length > 1) this.costCenterRows.removeAt(i); }

  resetCostCenterRow(index: number): void {
    const fg = this.costCenterRows.at(index) as FormGroup | null;
    if (!fg) return;
    fg.reset({ costCenter: null, amount: null }, { emitEvent: true });
    fg.markAsPristine();
    fg.markAsUntouched();
  }

  isCostCenterRowHasAnyValue(index: number): boolean {
    const arr = this.costCenterRows;
    if (!arr) return false;
    const fg = arr.at(index) as FormGroup | null;
    if (!fg) return false;
    const controls = fg.controls;
    for (const k of Object.keys(controls)) {
      const ctrl = controls[k];
      if (ctrl && (ctrl.touched || ctrl.dirty)) return true;
    }
    for (const k of Object.keys(controls)) {
      const val = (controls as any)[k].value;
      if (val == null) continue;
      if (typeof val === 'string' && val.trim() === '') continue;
      if (Array.isArray(val) && val.length === 0) continue;
      if (typeof val === 'object' && Object.keys(val).length === 0) continue;
      return true;
    }
    return false;
  }

  onCostCenterRowChange(i: number): void {
    const row = this.costCenterRows.at(i);
    if (row && row.valid && i === this.costCenterRows.length - 1) this.addEmptyCostCenterRowAfter(i);
  }

  ensureCostCenterModal(): void {
    if (!this.costCenterModalInstance) {
      const el = this.costCenterModal?.nativeElement;
      if (!el) return;
      this.costCenterModalInstance = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
    }
  }

  showCostCenterModal(): void { this.ensureCostCenterModal(); this.costCenterModalInstance?.show(); }
  hideCostCenterModal(): void { if (this.costCenterModalInstance) this.costCenterModalInstance.hide(); }

  saveCostCenterDetails(): void {
    this.costCenterForm.markAllAsTouched();
    if (this.costCenterForm.invalid) { this.alertService.error('Please complete Cost Center details.'); return; }

    const rows = this.costCenterForm.value.rows || [];
    const validRows = rows
      .filter((r: any) => r && (r.costCenter || r.amount))
      .map((r: any) => ({ costCenter: r.costCenter, amount: Number(r.amount) || 0, groupAccount: r.groupAccount }));
    const total = validRows.reduce((s: number, r: any) => s + r.amount, 0);

    if (this.currentCostCenterTriggerIndex != null && this.lines.at(this.currentCostCenterTriggerIndex)) {
      const fg = this.lines.at(this.currentCostCenterTriggerIndex) as FormGroup;
      fg.get('amount')?.setValue(total ? Number(total.toFixed(2)) : null);
      fg.get('costCenterDetails')?.setValue(validRows);
      fg.markAsDirty();
      fg.markAsTouched();
    }
    this.recalculateTotals();
    this.hideCostCenterModal();
  }

  openCostCenterModal(index: number): void {
    this.currentCostCenterTriggerIndex = index;
    const fg = this.lines.at(index) as FormGroup;
    const groupAccount = fg.get('group')?.value;
    this.modalAccountInfo = { accountCode: groupAccount, subAccountCode: fg.get('account')?.value };

    if (groupAccount && this.accountsCache.has(groupAccount)) {
      this.accounts = this.accountsCache.get(groupAccount) ?? [];
    }

    const savedRows = fg.get('costCenterDetails')?.value;
    const rowsArray = this.costCenterForm.get('rows') as FormArray;
    rowsArray.clear();

    if (Array.isArray(savedRows) && savedRows.length) {
      const isSameGroup = savedRows.every((r: any) => r.groupAccount === groupAccount);
      if (isSameGroup) {
        savedRows.forEach((r: any) => {
          rowsArray.push(this.fb.group({
            costCenter: [r.costCenter, Validators.required],
            amount: [r.amount, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]],
            groupAccount: [r.groupAccount]
          }));
        });
      } else {
        fg.get('costCenterDetails')?.setValue([]);
        fg.get('amount')?.setValue(null, { emitEvent: false });
        rowsArray.push(this.fb.group({
          costCenter: [null, Validators.required],
          amount: [null, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]],
          groupAccount: [groupAccount]
        }));
      }
    } else {
      rowsArray.push(this.fb.group({
        costCenter: [null, Validators.required],
        amount: [null, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]],
        groupAccount: [groupAccount]
      }));
    }
    this.showCostCenterModal();
  }

  cancelCostCenterModal(): void {
    this.hideCostCenterModal();

    if (!this.isOnHoldNoGenerated && this.currentCostCenterTriggerIndex != null && this.lines.at(this.currentCostCenterTriggerIndex)) {
      const fg = this.lines.at(this.currentCostCenterTriggerIndex) as FormGroup;
      fg.reset({
        dc: fg.get('dc')?.value ?? 'C',
        group: null, account: null, amount: null,
        receiptCategory: null, receiptDate: null, receiptNo: null, particulars: null,
        invoiceDetails: [], costCenterDetails: [],
        automated: fg.get('automated')?.value ?? 'N'
      }, { emitEvent: false });
      this.setAccountRequiredForRow(this.currentCostCenterTriggerIndex, false);
      fg.markAsPristine();
      fg.markAsUntouched();
      this.recalculateTotals();
    }

    if (this.costCenterModalInstance) {
      try { this.costCenterModalInstance.hide(); } catch { }
      this.costCenterModalInstance = null;
    }
    this.currentCostCenterTriggerIndex = null;
  }

  okCostCenterModal(): void {
    if (this.costCenterModalInstance) {
      try { this.costCenterModalInstance.hide(); } catch { }
      this.costCenterModalInstance = null;
    }
    this.currentCostCenterTriggerIndex = null;
  }

  onView(): void {
    window.scrollTo(0, 0);
    this.voucherList = [];
    if (this.header.invalid) { this.header.markAllAsTouched(); return; }
    const accPeriod = (this.header.get('month')?.value ?? '').toString().trim();
    this.isLoading = true;
    this.resetAllVoucherFields();
    normalizeResponse<any[]>(this.dataService.getAllJournals(accPeriod), 'Contra Vouchers')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: ApiResponse<any[] | null>) => {
          if (res.status === 200) {
            const list = (res.data ?? []) as JournalSummaryModel[];
            if (!list.length) { this.voucherList = []; this.alertService.info('No Journal Vouchers found for the selected Financial Year & Month.'); return; }
            this.voucherList = list;
            this.sortTable('ctrlOnHoldNo');
            return;
          }
          this.voucherList = [];
          this.alertService.showCommonError(res.status, res.message, 'Journal Vouchers');
        },
        error: (err: any) => {
          this.voucherList = [];
          this.alertService.showCommonError(err?.status || 0, err?.error?.message || err?.message, 'Journal Vouchers');
        }
      });
  }

  onVoucherRowClick(item: JournalSummaryModel): void {
    this.selectedVoucherNo = (item as any)?.ctrlOnHoldNo || null;
    if (!this.selectedVoucherNo) return;
    this.loadVoucherDetails(this.selectedVoucherNo);
  }

  loadVoucherDetails(onHoldNo: string): void {
    if (!onHoldNo) return;
    this.isLoading = true;
    this.dataService.getJournalWithDetails(onHoldNo)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: any) => {
          const payload: JournalWithDetailsModel = (res?.status && res?.data) ? res.data : { header: {}, details: [] };
          const header = payload.header || {};
          const details = Array.isArray(payload.details) ? payload.details : [];

          const dto: any = {
            bankBlock: {
              currency: (header as any)?.currencyCode ?? null
            },
            voucherBlock: {
              voucherType: (header as any)?.voucherType ?? null,
              voucherSysCategory: 'REGUL',
              voucherDate: (header as any)?.voucherDate ?? null,
              narration: (header as any)?.voucherNarration ?? null
            },
            lines: [] as any[],
            voucherNo: (header as any)?.voucherNumber ?? null,
            onHoldNo: (header as any)?.ctrlOnHoldNo ?? null,
            createdDate: (header as any)?.createdOn ?? null,
            updatedDate: (header as any)?.updatedOn ?? null
          };

          if (Array.isArray(details) && details.length) {
            dto.lines = details.map((d: any) => {
              let instrDate = d?.instrumentdate ?? null;
              if (typeof instrDate === 'string' && /\d{2}\/\d{2}\/\d{4}/.test(instrDate)) {
                const parts = instrDate.split('/');
                instrDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
              return {
                dc: d?.dbCrFlag ?? 'C',
                group: d?.accountCode ?? null,
                account: d?.subAccountCode ?? null,
                amount: d?.drCrAmount ?? null,
                receiptCategory: d?.instrument?.trim() ? d.instrument : null,
                receiptDate: instrDate,
                receiptNo: d?.instrumentNo ?? null,
                particulars: d?.lineParticulars ?? null,
                automated: d?.automated ?? null,
                costCenterDetails: Array.isArray(d?.costCenterDetails) ? d.costCenterDetails : [],
                invoiceDetails: Array.isArray(d?.invoiceDetails) ? d.invoiceDetails : []
              };
            }).sort((a: any, b: any) => (b.automated === 'Y' ? 1 : 0) - (a.automated === 'Y' ? 1 : 0));
          }

          this.patchVoucher(dto);
          this.recalculateTotals();
          const linesArray = this.form.get('lines') as FormArray;
          linesArray.controls.forEach(ctrl => {
            if (ctrl.get('automated')?.value === 'Y') ctrl.disable({ emitEvent: false });
          });
        },
        error: () => { this.alertService.error('Failed to load Voucher details. Please try again.'); }
      });
  }

  patchVoucher(dto: any): void {
    this.bankBlock.patchValue({ currency: dto?.bankBlock?.currency ?? null }, { emitEvent: false });

    const normalizedVDate = this.toDateInputValue(dto?.voucherBlock?.voucherDate);
    this.voucherBlock.patchValue({
      voucherType: dto?.voucherBlock?.voucherType ?? null,
      voucherSysCategory: dto?.voucherBlock?.voucherSysCategory ?? 'REGUL',
      voucherDate: normalizedVDate,
      narration: dto?.voucherBlock?.narration ?? null
    }, { emitEvent: false });

    this.rowGroupSubscriptions.forEach(s => s.unsubscribe());
    this.rowGroupSubscriptions = [];
    this.rowsLoading.clear();
    this.lines.clear();
    this.accountsCache.clear();

    const linesArr = this.form.get('lines') as FormArray;
    linesArr.clear();
    dto.lines.forEach((line: any) => {
      const fg = this.fb.group({
        dc: [line.dc ?? 'C'],
        group: [line.group],
        account: [line.account],
        amount: [line.amount],
        receiptCategory: [line.receiptCategory || null],
        receiptDate: [this.toDateInputValue(line.receiptDate)],
        receiptNo: [line.receiptNo],
        particulars: [line.particulars],
        automated: [line.automated],
        costCenterDetails: [Array.isArray(line?.costCenterDetails) ? line.costCenterDetails : []],
        invoiceDetails: [Array.isArray(line?.invoiceDetails) ? line.invoiceDetails : []]
      });
      if (line.automated === 'Y') fg.disable({ emitEvent: false });
      linesArr.push(fg);
    });

    dto.lines.forEach((_: any, idx: number) => { this.attachRowGroupSubscriber(idx); });

    this.recalculateTotals();
    this.voucherNo = dto?.voucherNo ?? null;
    this.onHoldNo = dto?.onHoldNo ?? null;
    this.createdDate = this.formatToDDMMYYYY(dto?.createdDate ?? null);
    this.updatedDate = this.formatToDDMMYYYY(dto?.updatedDate ?? null);

    const vt = dto?.voucherBlock?.voucherType ?? null;
    if (vt) {
      this.loadGroupsByVoucherType(vt, () => {
        dto.lines.forEach((l: any, idx: number) => {
          const groupCode = l?.group;
          if (!groupCode) { linesArr.at(idx)?.get('account')?.setValue(null, { emitEvent: false }); return; }
          const selectedGroup = this.groups.find(g => g.accountCode === groupCode);
          const accountType = (selectedGroup?.accountType ?? '').toUpperCase();
          const isCostCenter = (selectedGroup?.costAppl ?? 'N').toUpperCase() === 'Y';
          this.setAccountRequiredForRow(idx, !isCostCenter && !!accountType);
          this.loadSubAccountsForRow(idx, groupCode, isCostCenter, accountType, l?.account ?? null);
        });
        setTimeout(() => { this.voucherBlock.get('voucherType')?.setValue(vt, { emitEvent: false }); });
      });
    }
  }

  toDateInputValue(v: any): string | null {
    if (v === null || v === undefined || v === '' || v === 'null' || v === 'undefined') return null;
    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T/.test(v)) return v.substring(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) { const [dd, mm, yyyy] = v.split('/'); return `${yyyy}-${mm}-${dd}`; }
      if (/^\d{2}-\d{2}-\d{4}$/.test(v)) { const [dd, mm, yyyy] = v.split('-'); return `${yyyy}-${mm}-${dd}`; }
    }
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatToDDMMYYYY(dateValue: any): string | null {
    if (!dateValue) return null;
    const dt = typeof dateValue === 'string' || dateValue instanceof String
      ? new Date(dateValue as string)
      : dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(dt.getTime())) return null;
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
  }

  attachRowGroupSubscriber(index: number): void {
    const row = this.lines.at(index) as FormGroup | null;
    if (!row) return;
    const groupCtrl = row.get('group');
    if (!groupCtrl) return;
    if (this.rowGroupSubscriptions[index]) this.rowGroupSubscriptions[index].unsubscribe();
    this.rowGroupSubscriptions[index] = groupCtrl.valueChanges.subscribe(() => { this.onGroupChange(index); });
  }

  attachAllRowGroupSubscribers(): void {
    this.rowGroupSubscriptions.forEach(s => s.unsubscribe());
    this.rowGroupSubscriptions = [];
    for (let i = 0; i < this.lines.length; i++) this.attachRowGroupSubscriber(i);
  }

  validateForOnHold(): boolean {
    this.form.markAllAsTouched();
    if (this.form.invalid) return false;
    if (this.lines.length === 0) return false;
    return true;
  }

  validateForPost(): boolean {
    if (!this.validateForOnHold()) return false;
    this.recalculateTotals();
    return true;
  }

  private toIsoDate(d: any): string | null {
    if (!d) return null;
    const dt = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dt as any)) return null;
    return dt.toISOString().slice(0, 10);
  }

  private deriveAccountCodes(line: any): { accountCode: string; subAccountCode: string } {
    const group = line?.group;
    const sub = line?.account;
    return {
      accountCode: group?.accountCode ?? group?.code ?? group ?? '',
      subAccountCode: sub?.code ?? sub ?? ''
    };
  }

  private isVoucherDateInPeriod(): boolean {
    const voucherDate = this.form.get('voucherBlock.voucherDate')?.value;
    const accPeriod = this.form.get('header.month')?.value;
    if (!voucherDate || !accPeriod) return true;

    const period = this.months.find(p => p.accperiod === accPeriod);
    if (!period) return true;

    const stripTime = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const vd = stripTime(new Date(voucherDate));
    const from = stripTime(new Date(period.periodfrom));
    const to = stripTime(new Date(period.periodto));
    return vd >= from && vd <= to;
  }

  private buildDetails(v: any): any[] | null {
    let seq = 1;
    const baseLines = (v?.lines ?? []).filter((l: any) => l != null).map((l: any) => {
      const { accountCode, subAccountCode } = this.deriveAccountCodes(l);
      return {
        ctrlOnHoldNo: this.onHoldNo ?? '',
        ctrlSequenceNo: typeof l?.ctrlSequenceNo === 'number' && l.ctrlSequenceNo > 0 ? l.ctrlSequenceNo : seq++,
        dbCrFlag: l?.dc ?? 'C',
        accountCode,
        subAccountCode: subAccountCode || null,
        drCrAmount: l?.amount != null ? Number(l.amount) : 0,
        instrument: l?.receiptCategory || 'NAPPL',
        instrumentNo: l?.receiptNo || null,
        instrumentDate: this.toIsoDate(l?.receiptDate),
        lineParticulars: l?.particulars || null,
        automated: l?.automated ?? 'N',
        invoiceDetails: (l?.invoiceDetails ?? []).filter((i: any) => Number(i.acceptedAmount) > 0).map((i: any) => ({
          billNo: i.billNo, billDate: this.toIsoDate(i.billDate),
          acceptedAmount: Number(i.acceptedAmount), billBalance: Number(i.orginalBillBalance) || 0,
          groupAccount: i.groupAccount, subAccount: i.subAccount,
          onHoldNo: i.ctrlOnHoldNo, sequenceNo: i.ctrlSequenceNo
        })),
        costCenterDetails: (l?.costCenterDetails ?? []).map((c: any) => ({
          costCenter: c.costCenter, amount: Number(c.amount) || 0,
          groupAccount: c.groupAccount, subAccount: c.subAccount
        }))
      };
    });

    const creditTotal = parseFloat(baseLines.filter((x: any) => x.dbCrFlag === 'C').reduce((s: number, x: any) => s + Number(x.drCrAmount || 0), 0).toFixed(2));
    const debitTotal = parseFloat(baseLines.filter((x: any) => x.dbCrFlag === 'D').reduce((s: number, x: any) => s + Number(x.drCrAmount || 0), 0).toFixed(2));

    if (creditTotal !== debitTotal) return null;

    return baseLines;
  }

  buildPayload(): any | null {
    const v = this.form.value;
    const details = this.buildDetails(v);
    if (!details) { this.alertService.warning('Total Credit must equal Total Debit to proceed!'); return null; }

    return {
      voucherData: {
        ctrlOnHoldNo: this.onHoldNo ?? '',
        voucherNumber: this.voucherNo ?? '',
        voucherDate: this.toIsoDate(v?.voucherBlock?.voucherDate),
        bankCode: '',
        bankAccount: '',
        bankRate: null,
        currencyCode: v?.bankBlock?.currency ?? null,
        voucherType: v?.voucherBlock?.voucherType ?? '',
        voucherSysCategory: v?.voucherBlock?.voucherSysCategory ?? 'REGUL',
        voucherNarration: v?.voucherBlock?.narration ?? '',
        createdOn: null, updatedOn: null
      },
      details,
      financialYear: v?.header?.year ?? '',
      accountingPeriod: v?.header?.month ?? '',
      locationCode: (v?.header?.locationCode ?? 'BILZ').trim(),
      username: this.userName
    };
  }

  onHold(): void {
    if (this.isLoading) return;
    if (!this.isVoucherDateInPeriod()) { this.alertService.error('Voucher Date must be within the selected Financial Year & Month.'); return; }
    if (!this.validateForOnHold()) return;
    const payload: JournalsRequestModel | null = this.buildPayload();
    if (!payload) return;
    this.isLoading = true;
    this.dataService.saveJournalOnHold(payload).pipe(finalize(() => (this.isLoading = false))).subscribe({
      next: (res: ApiResponse<any>) => {
        if (res?.status === 200 || res?.status === 201) {
          this.onHoldNo = res.data as any;
          this.voucherNo = null;
          this.loadVoucherDetails(this.onHoldNo ?? '');
          if (this.voucherList.length > 0) this.onView();
          this.alertService.success(res.message || 'Saved as OnHold.');
        } else {
          this.alertService.error(res?.message || 'Failed to save as OnHold.');
        }
      },
      error: () => { this.alertService.error('Something went wrong while creating Onhold data.'); }
    });
  }

  onPost(): void {
    if (this.isLoading) return;
    if (!this.isVoucherDateInPeriod()) { this.alertService.error('Voucher Date must be within the selected Financial Year & Month.'); return; }
    if (!this.validateForPost()) return;
    const payload: JournalsRequestModel | null = this.buildPayload();
    if (!payload) return;
    if (this.onHoldNo && !payload.voucherData.ctrlOnHoldNo) payload.voucherData.ctrlOnHoldNo = this.onHoldNo;
    this.isLoading = true;
    this.dataService.saveJournalOnPost(payload).pipe(finalize(() => (this.isLoading = false))).subscribe({
      next: (res: ApiResponse<any>) => {
        if (res?.status === 200 || res?.status === 201) {
          this.voucherNo = res.data as string;
          this.loadVoucherDetails(this.onHoldNo ?? '');
          if (this.voucherList.length > 0) this.onView();
          this.alertService.success(res.message || 'Voucher Posted successfully.');
        } else {
          this.alertService.error(res?.message || 'Failed to Post voucher.');
        }
      },
      error: () => { this.alertService.error('Something went wrong while creating Post data.'); }
    });
  }

  triggerImportExcel(): void {
    if (this.isOnHoldNoGenerated) {
      this.alertService.warning('Cannot import while an OnHold voucher is loaded.');
      return;
    }
    if (!this.voucherBlock.get('voucherType')?.value) {
      this.alertService.warning('Please select a Voucher Type before importing.');
      return;
    }
    this.excelFileInput?.nativeElement?.click();
  }

  onExcelFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    if (!name.endsWith('.xls') && !name.endsWith('.xlsx')) {
      this.alertService.error('Please select a valid Excel file (.xls or .xlsx).');
      input.value = '';
      return;
    }

    this.isLoading = true;
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) { this.alertService.error('Excel file has no sheets.'); this.isLoading = false; input.value = ''; return; }

        const worksheet = workbook.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });

        if (!rows || rows.length === 0) { this.alertService.error('Excel file is empty.'); this.isLoading = false; input.value = ''; return; }

        this.processExcelRows(rows, file.name);
      } catch (err) {
        console.error('Excel parse error:', err);
        this.alertService.error('Failed to parse Excel file. Please check the format.');
      } finally {
        this.isLoading = false;
        input.value = '';
      }
    };

    reader.onerror = () => { this.alertService.error('Failed to read Excel file.'); this.isLoading = false; input.value = ''; };
    reader.readAsArrayBuffer(file);
  }

  private processExcelRows(rows: any[][], fileName: string): void {
    const parsedLines: any[] = [];
    let skippedRows = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const groupCode = row[0] != null ? String(row[0]).trim() : '';
      const subAccount = row[1] != null ? String(row[1]).trim() : null;
      const refDate = row[2] ?? null;
      const refNo = row[3] != null ? String(row[3]).trim() : null;
      const dcFlag = row[4] != null ? String(row[4]).trim().toUpperCase() : '';
      const amount = row[5] != null ? Number(row[5]) : null;
      const particulars = row[6] != null ? String(row[6]).trim() : null;

      if (!groupCode || (dcFlag !== 'D' && dcFlag !== 'C') || amount == null || isNaN(amount) || amount <= 0) { skippedRows++; continue; }

      let parsedRefDate: string | null = null;
      if (refDate != null) {
        if (typeof refDate === 'number') {
          const excelDate = XLSX.SSF.parse_date_code(refDate);
          if (excelDate) parsedRefDate = `${excelDate.y}-${String(excelDate.m).padStart(2, '0')}-${String(excelDate.d).padStart(2, '0')}`;
        } else if (typeof refDate === 'string' && refDate.trim()) {
          parsedRefDate = this.toDateInputValue(refDate.trim());
        }
      }

      parsedLines.push({ dc: dcFlag, group: groupCode, account: subAccount || null, amount: Math.abs(Number(amount.toFixed(2))), receiptDate: parsedRefDate, receiptNo: refNo || null, particulars: particulars || null, automated: 'N' });
    }

    if (parsedLines.length === 0) { this.alertService.error('No valid data rows found in the Excel file.'); return; }

    this.rowGroupSubscriptions.forEach(s => s.unsubscribe());
    this.rowGroupSubscriptions = [];
    this.rowsLoading.clear();
    this.lines.clear();

    parsedLines.forEach((line, idx) => {
      const fg = this.createLineGroup(line);
      this.lines.push(fg);
      this.attachRowGroupSubscriber(idx);
      const selectedGroup = this.groups.find(g => g.accountCode === line.group);
      if (selectedGroup) {
        const accountType = (selectedGroup.accountType ?? '').toUpperCase();
        const isCostCenter = (selectedGroup.costAppl ?? 'N').toUpperCase() === 'Y';
        this.setAccountRequiredForRow(idx, !isCostCenter && !!accountType);
        if (line.group) this.loadSubAccountsForRow(idx, line.group, isCostCenter, accountType, line.account);
      }
    });

    this.recalculateTotals();
    const msg = skippedRows > 0
      ? `Imported ${parsedLines.length} rows from "${fileName}". ${skippedRows} row(s) skipped due to invalid data.`
      : `Successfully imported ${parsedLines.length} rows from "${fileName}".`;
    this.alertService.success(msg);
  }

  sortTable(column: string): void {
    if (this.sortColumn === column) { this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc'; }
    else { this.sortColumn = column; this.sortDirection = 'asc'; }
    this.voucherList.sort((a: any, b: any) => {
      const aVal = a[column], bVal = b[column];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return this.sortDirection === 'asc' ? -1 : 1;
      if (bVal == null) return this.sortDirection === 'asc' ? 1 : -1;
      if (!isNaN(aVal) && !isNaN(bVal)) return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      if (Date.parse(aVal) && Date.parse(bVal)) {
        return this.sortDirection === 'asc'
          ? new Date(aVal).getTime() - new Date(bVal).getTime()
          : new Date(bVal).getTime() - new Date(aVal).getTime();
      }
      const aStr = aVal.toString().toLowerCase(), bStr = bVal.toString().toLowerCase();
      if (aStr < bStr) return this.sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }
}