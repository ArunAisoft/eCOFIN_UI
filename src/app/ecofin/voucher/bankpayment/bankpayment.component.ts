import { Component, OnInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { finalize, forkJoin, Subscription } from 'rxjs';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { BankPaymentsService } from 'src/app/shared/services/voucher/bankpayments.service';
import { formatDate } from '@angular/common';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { normalizeResponse } from 'src/app/shared/utils/normalize-response.service';
import { CommonService } from 'src/app/shared/services/voucher/common.service';
import { BankPaymentSummaryModel, BankPaymentWithDetailsModel, BankPaymentsRequestModel } from 'src/app/shared/models/bankpayments.models';
import { FinancialYearsWithPeriodsModel, InvoiceModel, BanksAndAccountsModel, BankAccountModel, VoucherTypeModel, GroupAccountModel, GroupSubAccountModel } from 'src/app/shared/models/common.models';

declare var $: any;
declare const bootstrap: any;

@Component({
  selector: 'app-bankpayment',
  templateUrl: './bankpayment.component.html',
  styleUrls: ['./bankpayment.component.css']
})
export class BankPaymentComponent implements OnInit, OnDestroy {
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  form!: FormGroup;
  costCenterForm!: FormGroup;

  invoiceModalInstance: any = null;
  currentInvoiceTriggerIndex: number | null = null;
  modalInvoiceRows: any[] = [];
  modalAccountInfo: { accountCode?: string; subAccountCode?: string } | null = null;

  years: FinancialYearsWithPeriodsModel[] = [];
  months: any[] = [];
  banks: BanksAndAccountsModel[] = [];
  bankAccounts: BankAccountModel[] = [];
  voucherTypes: VoucherTypeModel[] = [];
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
  balance = 0;

  voucherList: BankPaymentSummaryModel[] = [];
  selectedYear: string | null = null;
  selectedVoucherNo: string | null = null;
  creditTotal = 0;
  debitTotal = 0;

  currentCostCenterTriggerIndex: number | null = null;
  costCenterModalInstance: any = null;
  rowGroupSubscriptions: Subscription[] = [];

  voucherSysCategoryItems = [{ code: 'REGUL', name: 'Regular' }];

  bankLabel = (b: BanksAndAccountsModel | null): string => b ? `${b.bankCode} → ${b.bankName || 'Unknown'}` : 'Unknown';
  accountLabel = (a: BankAccountModel | null): string => a ? `${a.accountCode} → ${a.accountName || 'Unknown'}` : 'Unknown';
  groupLabel = (g: GroupAccountModel) => g ? `${g.accountCode} → ${g.accountName || 'Unknown'}` : 'Unknown';
  ccLabel = (c: any) => c ? `${c.code} → ${c.name || 'Unknown'}` : 'Unknown';

  simpleCodeName(a: any): string { return a ? `${a.code} → ${a.name || 'Unknown'}` : 'Unknown'; }
  simpleName(x: any): string { return x ? x.name || 'Unknown' : 'Unknown'; }

  @ViewChild('costCenterModal', { static: false }) costCenterModal?: ElementRef<HTMLDivElement>;
  @ViewChild('invoiceModal', { static: false }) invoiceModal?: ElementRef<HTMLDivElement>;

  constructor(private fb: FormBuilder, private commonService: CommonService, private dataService: BankPaymentsService, private alertService: AlertService) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    const userName = localStorage.getItem('userName');
    if (userName) this.userName = userName;
    this.buildForm();
    this.buildCostCenterForm();
    this.loadDropdownData();
    this.bankBlock.get('bank')?.valueChanges.subscribe(() => { this.onBankChange(); });
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
        bank: [null, Validators.required],
        bankAccount: [{ value: null }, Validators.required]
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
      dc: [data?.dc ?? 'D', Validators.required],
      group: [data?.group ?? null, Validators.required],
      account: [data?.account ?? null],
      amount: [data?.amount ?? null, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]],
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
  get costCenterRows(): FormArray { if (!this.costCenterForm) this.buildCostCenterForm(); return (this.costCenterForm.get('rows') as FormArray); }

  getCtrl(i: number, name: string): AbstractControl | null { return (this.lines.at(i) as FormGroup).get(name) ?? null; }
  touchedOrDirty(i: number, name: string) { const c = this.getCtrl(i, name); return !!(c && (c.touched || c.dirty)); }
  lineControl(i: number, name: string): FormControl { return this.lines.at(i).get(name) as FormControl; }
  costCenterCtrl(i: number, name: string): AbstractControl | null { const arr = this.costCenterRows; return arr && arr.at(i) ? arr.at(i).get(name) : null; }
  costCenterInvalid(i: number, name: string): boolean { const c = this.costCenterCtrl(i, name); return !!c && c.invalid && (c.touched || c.dirty); }

  loadDropdownData(): void {
    this.isLoading = true;

    const years$ = normalizeResponse<any[]>(this.commonService.getYearList(), 'Financial Year list');
    const banks$ = normalizeResponse<any[]>(this.commonService.getAllBanksWithAccountsVouchersBalances(this.userName, 'BNKP'), 'Bank list');

    forkJoin({ years: years$, banks: banks$ })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: ({ years, banks }: { years: ApiResponse<any[] | null>; banks: ApiResponse<any[] | null> }) => {
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

          const bankArr = (banks.data ?? []) as any[];
          this.banks = bankArr.filter(b => Array.isArray(b.bankAccounts) && b.bankAccounts.length > 0) as BanksAndAccountsModel[];
          if (!this.banks.length) {
            this.alertService.showCommonError(banks.status, banks.message, 'Bank list');
          }

          const currentBank = this.bankBlock.get('bank')?.value;
          const bankObj = this.banks.find((b: BanksAndAccountsModel) => b.bankCode === currentBank) || null;
          this.bankAccounts = bankObj?.bankAccounts || [];
          this.bankBlock.get('bankAccount')?.setValue(null, { emitEvent: false });
        },
        error: () => {
          this.alertService.error('Something went wrong while loading dropdown data.');
          this.banks = [];
          this.bankAccounts = [];
        },
      });
  }

  onYearChange(): void {
    const fy = this.years.find((y: FinancialYearsWithPeriodsModel) => y.financialyear === this.header.get('year')?.value);
    this.months = fy?.periods || [];
    this.header.get('month')?.setValue(null);
    this.resetAllVoucherFields();
  }

  onMonthChange(): void {
    const hadVoucherList = this.voucherList.length > 0;
    if (this.onHoldNo || this.voucherNo) {
      this.resetAllVoucherFields();
    }
    this.voucherList = [];
    // const newVoucherDate = this.getVoucherDateFromPeriod();
    // this.voucherBlock.get('voucherDate')?.setValue(newVoucherDate);
    if (hadVoucherList) {
      this.onView();
    }
  }

  private getVoucherDateFromPeriod(): string {
    const selectedMonth = this.header.get('month')?.value;
    if (!selectedMonth) { return formatDate(new Date(), 'yyyy-MM-dd', 'en'); }
    const selectedPeriod = this.months.find((p: any) => p.accperiod === selectedMonth);
    const periodFrom = selectedPeriod?.periodfrom;
    if (periodFrom) { return formatDate(periodFrom, 'yyyy-MM-dd', 'en'); }
    return formatDate(new Date(), 'yyyy-MM-dd', 'en');
  }

  onBankChange(): void {
    const bankCode = this.bankBlock.get('bank')?.value;
    const bank = this.banks.find((b: BanksAndAccountsModel) => b.bankCode === bankCode) || null;
    this.bankAccounts = Array.isArray(bank?.bankAccounts) ? bank!.bankAccounts : [];
    const bankAccountCtrl = this.bankBlock.get('bankAccount');
    bankAccountCtrl?.setValue(null, { emitEvent: false });

    this.resetVoucherBlock();
    this.resetLinesBlock();
    this.accountsCache.clear();

    if (this.bankAccounts.length === 1) {
      const single = this.bankAccounts[0];
      bankAccountCtrl?.setValue(single.accountCode, { emitEvent: true });
      this.onBankAccountChange();
    }
  }

  onBankAccountChange(): void {
    const bankAccountCode = this.bankBlock.get('bank')?.value ? (this.bankBlock.get('bankAccount')?.value as string | null) : null;
    const selected = this.bankAccounts?.find((b: BankAccountModel) => b.accountCode === bankAccountCode) ?? null;
    this.balance = selected?.balance ?? 0;
    this.voucherTypes = Array.isArray(selected?.voucherTypes) ? selected!.voucherTypes : [];

    const voucherTypeCtrl = this.voucherBlock.get('voucherType');
    voucherTypeCtrl?.setValue(null, { emitEvent: false });
    voucherTypeCtrl?.markAsPristine();
    voucherTypeCtrl?.markAsUntouched();

    this.groups = [];
    this.accounts = [];
    this.accountsCache.clear();
    this.resetLinesBlock();

    if (this.voucherTypes.length === 1) {
      const vt = this.voucherTypes[0].voucherType;
      voucherTypeCtrl?.setValue(vt, { emitEvent: true });
      this.onVoucherTypeChange();
    }
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
      this.costCenterForm.setControl(
        'rows',
        this.fb.array([
          this.fb.group({
            costCenter: [null, Validators.required],
            amount: [null, [Validators.required, Validators.pattern(/^\d+(\.\d{1,2})?$/), Validators.min(0.01)]],
            groupAccount: [groupCode]
          })
        ])
      );
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
    if (ke && typeof ke.preventDefault === 'function') { ke.preventDefault(); }
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
    const relevantKeys = ['group', 'account', 'amount', 'receiptDate', 'receiptNo', 'particulars'];
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

    const defaults = {
      dc: 'D',
      group: null,
      account: null,
      amount: null,
      receiptDate: null,
      receiptNo: null,
      particulars: null
    };

    fg.reset(defaults, { emitEvent: true });
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
    this.balance = 0;
    this.creditTotal = 0;
    this.debitTotal = 0;
  }

  resetBankBlock(): void {
    this.bankBlock.reset({ bank: null, bankAccount: null }, { emitEvent: false });
    this.bankAccounts = [];
    this.voucherTypes = [];
    this.accountsCache.clear();
    if (this.voucherBlock) {
      this.voucherBlock.get('voucherType')?.setValue(null);
      this.voucherBlock.get('voucherType')?.markAsPristine();
    }
  }

  resetVoucherBlock(): void {
    this.voucherTypes = [];
    this.groups = [];
    this.accounts = [];
    this.accountsCache.clear();
    //const newVoucherDate = this.getVoucherDateFromPeriod();
    this.voucherBlock.reset({
      voucherType: null,
      voucherSysCategory: 'REGUL',
      //voucherDate: formatDate(newVoucherDate, 'yyyy-MM-dd', 'en'),
      narration: null
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
    let credit = 0, debit = 0;
    this.lines.controls.forEach(l => {
      const dcRaw = l.get('dc')?.value;
      const dc = (dcRaw ?? '').toString().trim().toUpperCase();
      const amt = Number.parseFloat(l.get('amount')?.value as any) || 0;
      if (dc === 'C') credit += amt;
      else if (dc === 'D') debit += amt;
    });
    this.creditTotal = credit;
    this.debitTotal = debit;
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

  removeCostCenterRow(i: number): void { if (this.costCenterRows.length > 1) { this.costCenterRows.removeAt(i); } }

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
    if (row && row.valid && i === this.costCenterRows.length - 1) { this.addEmptyCostCenterRowAfter(i); }
  }

  ensureCostCenterModal(): void {
    if (!this.costCenterModalInstance) {
      const el = this.costCenterModal?.nativeElement;
      if (!el) return;
      this.costCenterModalInstance = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
    }
  }

  showCostCenterModal(): void { this.ensureCostCenterModal(); this.costCenterModalInstance?.show(); }
  hideCostCenterModal(): void { if (this.costCenterModalInstance) { this.costCenterModalInstance.hide(); } }

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
      this.showhideInvoiceModal(false);
    }
    this.showCostCenterModal();
  }

  cancelCostCenterModal(): void {
    this.hideCostCenterModal();
    if (!this.isOnHoldNoGenerated && this.currentCostCenterTriggerIndex != null && this.lines.at(this.currentCostCenterTriggerIndex)) {
      const fg = this.lines.at(this.currentCostCenterTriggerIndex) as FormGroup;
      fg.reset({
        dc: fg.get('dc')?.value ?? 'D',
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
    if (this.header.invalid) { this.header.markAllAsTouched(); return; }
    const raw = this.header.get('month')?.value ?? '';
    const accPeriod = (raw + '').trim();
    this.isLoading = true;
    this.resetAllVoucherFields();
    normalizeResponse<any[]>(this.dataService.getAllBankPayments(accPeriod), 'Bank Payments')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: ApiResponse<any[] | null>) => {
          if (res.status === 200) {
            const list = (res.data ?? []) as BankPaymentSummaryModel[];
            if (!list.length) { this.voucherList = []; this.alertService.info('No Payments found for the selected Financial Year & Month.'); return; }
            this.voucherList = list;
            return;
          }
          this.voucherList = [];
          this.alertService.showCommonError(res.status, res.message, 'Bank Payments');
        },
        error: (err: any) => {
          this.voucherList = [];
          this.alertService.showCommonError(err?.status || 0, err?.error?.message || err?.message, 'Bank Payments');
        }
      });
  }

  onVoucherRowClick(item: BankPaymentSummaryModel): void {
    this.selectedVoucherNo = (item as any)?.ctrlOnHoldNo || null;
    if (!this.selectedVoucherNo) return;
    this.loadVoucherDetails(this.selectedVoucherNo);
  }

  loadVoucherDetails(onHoldNo: string): void {
    if (!onHoldNo) return;
    this.isLoading = true;
    this.dataService.getBankPaymentWithDetails(onHoldNo)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: any) => {
          const payload: BankPaymentWithDetailsModel = (res?.status && res?.data) ? res.data : { header: {}, details: [] };
          const header = payload.header || {};
          const details = Array.isArray(payload.details) ? payload.details : [];

          const dto: any = {
            bankBlock: { bank: (header as any)?.bankCode ?? null, account: (header as any)?.bankAccount ?? null },
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
            updatedDate: (header as any)?.updatedOn ?? null,
          };

          if (Array.isArray(details) && details.length) {
            dto.lines = details.map((d: any) => {
              let instrDate = d?.instrumentdate ?? null;
              if (typeof instrDate === 'string' && /\d{2}\/\d{2}\/\d{4}/.test(instrDate)) {
                const parts = instrDate.split('/');
                instrDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              }
              return {
                dc: d?.dbCrFlag ?? 'D',
                group: d?.accountCode ?? null,
                account: d?.subAccountCode ?? null,
                amount: d?.drCrAmount ?? null,
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
            if (ctrl.get('automated')?.value === 'Y') { ctrl.disable({ emitEvent: false }); }
          });
        },
        error: () => { this.alertService.error('Failed to load Voucher details. Please try again.'); }
      });
  }

  applyBankAccountFromPatch(bankAccountCode: string | null): void {
    const selectedBank = this.bankAccounts?.find((b: BankAccountModel) => b.accountCode === bankAccountCode) || null;
    this.balance = selectedBank?.balance ?? 0;
    this.voucherTypes = selectedBank?.voucherTypes ?? [];
  }

  patchVoucher(dto: any): void {
    this.bankBlock.patchValue({ bank: dto?.bankBlock?.bank ?? null }, { emitEvent: false });
    const bank = this.banks.find((b: BanksAndAccountsModel) => b.bankCode === dto?.bankBlock?.bank);
    this.bankAccounts = bank?.bankAccounts || [];

    const bankAccountVal = dto?.bankBlock?.account ?? null;
    this.bankBlock.get('bankAccount')?.setValue(bankAccountVal ?? null, { emitEvent: false });
    this.applyBankAccountFromPatch(bankAccountVal);

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
        dc: [line.dc ?? 'D'],
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
      if (line.automated === 'Y') { fg.disable({ emitEvent: false }); }
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
          if (!groupCode) {
            linesArr.at(idx)?.get('account')?.setValue(null, { emitEvent: false });
            return;
          }
          const selectedGroup = this.groups.find(g => g.accountCode === groupCode);
          const accountType = (selectedGroup?.accountType ?? '').toUpperCase();
          const isCostCenter = (selectedGroup?.costAppl ?? 'N').toUpperCase() === 'Y';
          const requireAccount = !isCostCenter && !!accountType;
          this.setAccountRequiredForRow(idx, requireAccount);
          this.loadSubAccountsForRow(idx, groupCode, isCostCenter, accountType, l?.account ?? null);
        });

        setTimeout(() => {
          this.voucherBlock.get('voucherType')?.setValue(vt, { emitEvent: false });
        });
      });
    }
  }

  toDateInputValue(v: any): string | null {
    if (v === null || v === undefined) return null;
    if (v === '' || v === 'null' || v === 'undefined') return null;
    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}T/.test(v)) { return v.substring(0, 10); }
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { return v; }
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) { const [dd, mm, yyyy] = v.split('/'); return `${yyyy}-${mm}-${dd}`; }
      if (/^\d{2}-\d{2}-\d{4}$/.test(v)) { const [dd, mm, yyyy] = v.split('-'); return `${yyyy}-${mm}-${dd}`; }
    }
    const d = v instanceof Date ? v : new Date(v);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  formatToDDMMYYYY(dateValue: any): string | null {
    if (!dateValue) return null;
    const dt = typeof dateValue === 'string' || dateValue instanceof String
      ? new Date(dateValue as string)
      : dateValue instanceof Date ? dateValue : new Date(dateValue);
    if (isNaN(dt.getTime())) return null;
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  }

  attachRowGroupSubscriber(index: number) {
    const row = this.lines.at(index) as FormGroup | null;
    if (!row) return;
    const groupCtrl = row.get('group');
    if (!groupCtrl) return;
    if (this.rowGroupSubscriptions[index]) { this.rowGroupSubscriptions[index].unsubscribe(); }
    const sub = groupCtrl.valueChanges.subscribe(() => { this.onGroupChange(index); });
    this.rowGroupSubscriptions[index] = sub;
  }

  attachAllRowGroupSubscribers() {
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
    const accountCode = group?.accountCode ?? group?.code ?? group ?? '';
    const subAccountCode = sub?.code ?? sub ?? '';
    return { accountCode, subAccountCode };
  }

  private isVoucherDateInPeriod(): boolean {
    const voucherDate = this.form.get('voucherBlock.voucherDate')?.value;
    const accPeriod = this.form.get('header.month')?.value;
    if (!voucherDate || !accPeriod) return true;
    const period = this.months.find(p => p.accperiod === accPeriod);
    if (!period) return true;
    const vd = new Date(voucherDate);
    const from = new Date(period.periodfrom);
    const to = new Date(period.periodto);
    return vd >= from && vd <= to;
  }

  private buildDetails(v: any): any[] | null {
    let seq = 1;
    const baseLines = (v?.lines ?? []).filter((l: any) => l != null).map((l: any) => {
      const { accountCode, subAccountCode } = this.deriveAccountCodes(l);
      const ctrlSequenceNo = typeof l?.ctrlSequenceNo === 'number' && l.ctrlSequenceNo > 0 ? l.ctrlSequenceNo : seq++;
      return {
        ctrlOnHoldNo: this.onHoldNo ?? '',
        ctrlSequenceNo,
        dbCrFlag: l?.dc ?? 'D',
        accountCode,
        subAccountCode: subAccountCode || null,
        drCrAmount: l?.amount != null ? Number(l.amount) : 0,
        instrument: null,
        instrumentNo: l?.receiptNo || null,
        instrumentDate: this.toIsoDate(l?.receiptDate),
        lineParticulars: l?.particulars || null,
        automated: l?.automated ?? 'N',
        invoiceDetails: (l?.invoiceDetails ?? [])
          .filter((i: any) => Number(i.acceptedAmount) > 0)
          .map((i: any) => ({
            billNo: i.billNo,
            billDate: this.toIsoDate(i.billDate),
            acceptedAmount: Number(i.acceptedAmount),
            billBalance: Number(i.orginalBillBalance) || 0,
            groupAccount: i.groupAccount,
            subAccount: i.subAccount,
            onHoldNo: i.ctrlOnHoldNo,
            sequenceNo: i.ctrlSequenceNo,
          })),
        costCenterDetails: (l?.costCenterDetails ?? []).map((c: any) => ({
          costCenter: c.costCenter,
          amount: Number(c.amount) || 0,
          groupAccount: c.groupAccount,
          subAccount: c.subAccount
        }))
      };
    });

    const creditTotal = parseFloat(baseLines.filter((x: any) => x.dbCrFlag === 'C').reduce((sum: number, x: any) => sum + Number(x.drCrAmount || 0), 0).toFixed(2));
    const debitTotal = parseFloat(baseLines.filter((x: any) => x.dbCrFlag === 'D').reduce((sum: number, x: any) => sum + Number(x.drCrAmount || 0), 0).toFixed(2));

    if (debitTotal < creditTotal) { return null; }

    if (baseLines.length > 0) {
      const first = baseLines[0];
      baseLines.push({
        ctrlOnHoldNo: this.onHoldNo ?? '',
        ctrlSequenceNo: seq++,
        dbCrFlag: 'C',
        accountCode: v?.bankBlock?.bankAccount ?? '',
        subAccountCode: null,
        drCrAmount: parseFloat((debitTotal - creditTotal).toFixed(2)),
        instrument: first.instrument ?? null,
        instrumentNo: first.instrumentNo ?? null,
        instrumentDate: first.instrumentDate ?? null,
        lineParticulars: first.lineParticulars ?? null,
        automated: 'Y',
        invoiceDetails: [],
        costCenterDetails: []
      });
    }
    return baseLines;
  }

  buildPayload(): any | null {
    const v = this.form.value;
    const fy = v?.header?.year ?? '';
    const ap = v?.header?.month ?? '';
    const loc = (v?.header?.locationCode ?? 'BILZ').trim();
    const username = this.userName;
    const bankCode = v?.bankBlock?.bank ?? '';
    const bankAccount = v?.bankBlock?.bankAccount ?? '';
    const voucherType = v?.voucherBlock?.voucherType ?? '';
    const voucherSysCategory = v?.voucherBlock?.voucherSysCategory ?? 'REGUL';
    const voucherDateIso = this.toIsoDate(v?.voucherBlock?.voucherDate);
    const narration = v?.voucherBlock?.narration ?? '';
    const details = this.buildDetails(v);
    if (!details) { this.alertService.warning('Total Debit must be greater than or equal to Total Credit to proceed!'); return null; }
    return {
      voucherData: {
        ctrlOnHoldNo: this.onHoldNo ?? '',
        voucherNumber: this.voucherNo ?? '',
        voucherDate: voucherDateIso,
        bankCode, bankAccount, voucherType, voucherSysCategory,
        voucherNarration: narration,
        createdOn: null, updatedOn: null, balance: null
      },
      details,
      financialYear: fy,
      accountingPeriod: ap,
      locationCode: loc || '',
      username
    };
  }

  onHold(): void {
    if (this.isLoading) return;
    if (!this.isVoucherDateInPeriod()) { this.alertService.error('Voucher Date must be within the selected Financial Year & Month.'); return; }
    if (!this.validateForOnHold()) return;
    const fy = this.years.find((y: FinancialYearsWithPeriodsModel) => y.financialyear === this.header.get('year')?.value);
    this.months = fy?.periods || [];
    const payload: BankPaymentsRequestModel | null = this.buildPayload();
    if (!payload) return;
    this.isLoading = true;
    this.dataService.saveBankPaymentOnHold(payload).pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: ApiResponse<any>) => {
          if (res?.status === 200 || res?.status === 201) {
            this.onHoldNo = res.data as any;
            this.voucherNo = null;
            this.loadVoucherDetails(this.onHoldNo ?? '');
            if (this.voucherList.length > 0) { this.onView(); }
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
    const payload: BankPaymentsRequestModel | null = this.buildPayload();
    if (!payload) return;
    if (this.onHoldNo && !payload.voucherData.ctrlOnHoldNo) { payload.voucherData.ctrlOnHoldNo = this.onHoldNo; }
    this.isLoading = true;
    this.dataService.saveBankPaymentOnPost(payload).pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: ApiResponse<any>) => {
          if (res?.status === 200 || res?.status === 201) {
            this.voucherNo = res.data as string;
            this.loadVoucherDetails(this.onHoldNo ?? '');
            if (this.voucherList.length > 0) { this.onView(); }
            this.alertService.success(res.message || 'Voucher Posted successfully.');
          } else {
            this.alertService.error(res?.message || 'Failed to Post voucher.');
          }
        },
        error: () => { this.alertService.error('Something went wrong while creating Post data.'); }
      });
  }

  sortTable(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.voucherList.sort((a: any, b: any) => {
      const aVal = a[column];
      const bVal = b[column];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return this.sortDirection === 'asc' ? -1 : 1;
      if (bVal == null) return this.sortDirection === 'asc' ? 1 : -1;
      if (!isNaN(aVal) && !isNaN(bVal)) { return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal; }
      if (Date.parse(aVal) && Date.parse(bVal)) {
        return this.sortDirection === 'asc'
          ? new Date(aVal).getTime() - new Date(bVal).getTime()
          : new Date(bVal).getTime() - new Date(aVal).getTime();
      }
      const aStr = aVal.toString().toLowerCase();
      const bStr = bVal.toString().toLowerCase();
      if (aStr < bStr) return this.sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  get modalTotalAccepted(): number {
    return (this.modalInvoiceRows ?? []).reduce((s, r) => s + Number(r?.acceptedAmount || 0), 0);
  }

  ensureInvoiceModal(): void {
    if (!this.invoiceModalInstance) {
      const el = this.invoiceModal?.nativeElement;
      if (!el) return;
      this.invoiceModalInstance = new bootstrap.Modal(el, { backdrop: 'static', keyboard: false });
    }
  }

  showhideInvoiceModal(show: boolean): void {
    this.ensureInvoiceModal();
    show ? this.invoiceModalInstance?.show() : this.invoiceModalInstance?.hide();
  }

  openInvoicesModal(rowIndex: number): void {
    this.currentInvoiceTriggerIndex = rowIndex;
    const fg = this.lines.at(rowIndex) as FormGroup;
    const group = fg.get('group')?.value;
    const account = fg.get('account')?.value;
    this.modalAccountInfo = { accountCode: group, subAccountCode: account };
    const savedInvoices = fg.get('invoiceDetails')?.value;

    if (Array.isArray(savedInvoices) && savedInvoices.length) {
      this.modalInvoiceRows = savedInvoices.map((i: any) => ({
        ...i,
        acceptedAmount: i.acceptedAmount ?? null,
        billBalance: i.billBalance ?? i.orginalBillBalance ?? 0,
        groupAccount: i.groupAccount ?? group,
        subAccount: i.subAccount ?? account
      }));
      this.showhideInvoiceModal(true);
      return;
    }

    this.isLoading = true;
    this.commonService.getVendorInvoices(group, account)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.modalInvoiceRows = [];
            this.alertService.info(resp?.message || 'No Invoices found.');
            this.showhideInvoiceModal(false);
            return;
          }
          const list = Array.isArray(resp?.data) ? resp.data : [];
          this.modalInvoiceRows = list.map((r: any) => ({
            ...r,
            groupAccount: group,
            subAccount: account,
            acceptedAmount: null,
            orginalBillBalance: r.orginalBillBalance ?? r.billBalance ?? 0,
            orginalAmountAdjusted: r.orginalAmountAdjusted ?? r.amountAdjusted ?? 0
          }));
          this.showhideInvoiceModal(true);
        },
        error: () => this.alertService.error('Failed to load Invoices.')
      });
  }

  onInvoiceInputChange(e: Event, inv: any) {
    const v = (e.target as HTMLInputElement).value;
    inv.acceptedAmount = v ? Number(v.replace(/,/g, '')) || null : null;
  }

  onInvoiceAcceptedBlur(inv: any) {
    const orig = Number(inv.orginalBillBalance ?? 0);
    const val = Math.min(Math.max(Number(inv.acceptedAmount || 0), 0), orig);
    inv.acceptedAmount = val || null;
    inv.billBalance = +(orig - val).toFixed(2);
    inv.amountAdjusted = +((inv.orginalAmountAdjusted ?? inv.amountAdjusted ?? 0) + val).toFixed(2);
  }

  saveInvoicesFromModal() {
    this.onInvoicesSaved((this.modalInvoiceRows ?? []).map(r => ({ ...r, acceptedAmount: Number(r.acceptedAmount || 0) })));
  }

  onInvoicesSaved(rows: any[]) {
    if (this.currentInvoiceTriggerIndex == null) return;
    const fg = this.lines.at(this.currentInvoiceTriggerIndex) as FormGroup;
    const total = rows.reduce((s, r) => s + Number(r.acceptedAmount || 0), 0);
    fg.patchValue({ amount: total || null, invoiceDetails: rows });
    fg.markAsDirty();
    fg.markAsTouched();
    this.recalculateTotals();
    this.showhideInvoiceModal(false);
    this.currentInvoiceTriggerIndex = null;
  }

  copyBillBalanceToAccepted(inv: any): void {
    inv.acceptedAmount = inv.billBalance;
    this.onInvoiceAcceptedBlur(inv);
  }
}