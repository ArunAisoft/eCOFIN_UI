import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { TrialBalanceService } from 'src/app/shared/services/voucher/trailbalance.service';
import { CommonService } from 'src/app/shared/services/voucher/common.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, forkJoin } from 'rxjs';
import { finalize, takeUntil, switchMap, tap, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import { FinancialYearsWithPeriodsModel } from 'src/app/shared/models/common.models';
import {
  TrialBalanceRow, GLDetailRow, SubledgerScheduleRow,
  SubledgerAccountRow, BillPaymentRow, VoucherEntryRow, CostProductEntryRow
} from 'src/app/shared/models/trialbalances.models';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { normalizeResponse } from 'src/app/shared/utils/normalize-response.service';

declare const jspdf: any;
declare const XLSX: any;

@Component({
  selector: 'app-trialbalance',
  templateUrl: './trialbalance.component.html',
  styleUrls: ['./trialbalance.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrialBalanceComponent implements OnInit, OnDestroy {

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  form!: FormGroup;

  years: FinancialYearsWithPeriodsModel[] = [];
  months: any[] = [];

  trialBalanceRows: TrialBalanceRow[] = [];
  glDetails: GLDetailRow[] = [];
  subledgerScheduleRows: SubledgerScheduleRow[] = [];
  subledgerAccountRows: SubledgerAccountRow[] = [];
  billsPaymentsRows: BillPaymentRow[] = [];

  selectedAccountCode: string | null = null;
  selectedSubAccountCode: string | null = null;

  breadcrumbs: { label: string; tab: string; accountCode?: string; subAccountCode?: string }[] = [];
  activeTab = 'trialBalance';
  isLoading = false;
  error: any;

  searchText = '';
  debouncedSearch = '';
  private searchSubject = new Subject<string>();

  showVoucherPopup = false;
  voucherEntries: VoucherEntryRow[] = [];
  voucherPopupTitle = '';
  voucherPopupDateRaw = '';
  voucherTotalDebit = 0;
  voucherTotalCredit = 0;
  voucherNarration = '';

  showCostProductPopup = false;
  costProductEntries: CostProductEntryRow[] = [];
  costProductGrouped: { accountCode: string; description: string; items: CostProductEntryRow[]; total: number }[] = [];

  showBillsAdjustedPopup = false;
  billsAdjustedRows: any[] = [];
  billsAdjustedLoading = false;

  totaltbDebit = 0; totaltbCredit = 0;
  totalglDebit = 0; totalglCredit = 0;
  totalslDebit = 0; totalslCredit = 0;
  totalslaDebit = 0; totalslaCredit = 0;
  subledgerOpeningBalance = 0; // signed: +ve = debit opening, -ve = credit opening
  glOpeningBalance = 0;        // signed: +ve = debit opening, -ve = credit opening

  filteredTrialBalance: TrialBalanceRow[] = [];
  filteredGlDetails: GLDetailRow[] = [];
  filteredSubledgerSchedule: SubledgerScheduleRow[] = [];
  filteredSubledgerAccount: SubledgerAccountRow[] = [];
  filteredBillsPayments: BillPaymentRow[] = [];

  // Subledger Account Details — closing balance = opening + debits - credits.
  // Positive closing => debit side, negative => credit side.
  get subledgerClosingDebit(): number {
    const net = this.subledgerOpeningBalance + this.totalslaDebit - this.totalslaCredit;
    return net > 0 ? net : 0;
  }
  get subledgerClosingCredit(): number {
    const net = this.subledgerOpeningBalance + this.totalslaDebit - this.totalslaCredit;
    return net < 0 ? -net : 0;
  }
  // Opening balance split for display (same sign convention).
  get subledgerOpeningDebit(): number {
    return this.subledgerOpeningBalance > 0 ? this.subledgerOpeningBalance : 0;
  }
  get subledgerOpeningCredit(): number {
    return this.subledgerOpeningBalance < 0 ? -this.subledgerOpeningBalance : 0;
  }

  // GL Account Details — same pattern as Subledger: closing = opening + debits - credits.
  get glClosingDebit(): number {
    const net = this.glOpeningBalance + this.totalglDebit - this.totalglCredit;
    return net > 0 ? net : 0;
  }
  get glClosingCredit(): number {
    const net = this.glOpeningBalance + this.totalglDebit - this.totalglCredit;
    return net < 0 ? -net : 0;
  }
  get glOpeningDebit(): number {
    return this.glOpeningBalance > 0 ? this.glOpeningBalance : 0;
  }
  get glOpeningCredit(): number {
    return this.glOpeningBalance < 0 ? -this.glOpeningBalance : 0;
  }

  // Bills & Payments footer totals — derived from filtered rows so they reflect
  // any active search filter. Payment rows carry billBalance as a negative value
  // (SQL emits -PAYMENTAMOUNTBALANCE), so summing them directly gives the net
  // "Total for Party" — matches the legacy app's subtotal layout.
  get totalBills(): number {
    return this.filteredBillsPayments
      .filter(r => r.nature === 'Bills')
      .reduce((s, r) => s + (r.billBalance || 0), 0);
  }
  get totalPayments(): number {
    // Sum is naturally negative (payments stored as negative); negate for display.
    return -this.filteredBillsPayments
      .filter(r => r.nature === 'Payments')
      .reduce((s, r) => s + (r.billBalance || 0), 0);
  }
  get totalForParty(): number {
    return this.filteredBillsPayments.reduce((s, r) => s + (r.billBalance || 0), 0);
  }

  private readonly G1 = [78, 170, 57];
  private readonly WHT = [255, 255, 255];
  private readonly MID = [237, 246, 235];

  private highlightRegex: RegExp | null = null;
  private readonly destroy$ = new Subject<void>();

  private readonly trialBalanceTrigger$ = new Subject<string>();
  private readonly glDetailsTrigger$ = new Subject<{ accPeriod: string;accCode: string; from: string; to: string }>();
  private readonly subledgerScheduleTrigger$ = new Subject<{ accPeriod: string; accountCode: string }>();
  private readonly subledgerAccountTrigger$ = new Subject<{ accPeriod: string; accountCode: string; subAccountCode: string; from: string; to: string }>();
  private readonly billsPaymentsTrigger$ = new Subject<{ accountCode: string; subAccountCode: string }>();
  private readonly voucherEntriesTrigger$ = new Subject<{ voucherNumber: string; voucherDate: string }>();
  private readonly costProductTrigger$ = new Subject<{ voucherNumber: string }>();

  constructor(
    private fb: FormBuilder,
    private dataService: TrialBalanceService,
    private commonService: CommonService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.buildForm();
    this.setupStreams();
    this.loadFinancialYears();
    this.searchSubject
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe(val => {
        this.debouncedSearch = val;
        this.highlightRegex = val ? new RegExp(`(${this.escapeRegex(val)})`, 'gi') : null;
        this.rebuildFilteredLists();
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  trackByAccountCode = (_: number, row: TrialBalanceRow) => row.accountCode;
  trackByGLRow = (i: number, row: GLDetailRow) => row.voucherNumber ?? i;
  trackBySubSchedule = (_: number, row: SubledgerScheduleRow) => row.subAccountCode;
  trackBySubAccount = (i: number, row: SubledgerAccountRow) => row.voucherNumber ?? i;
  trackByBill = (i: number, row: BillPaymentRow) => row.billNo ?? i;
  trackByVoucherEntry = (i: number, row: VoucherEntryRow) => row.ctrlSequenceNo ?? i;
  trackByBillsAdjusted = (i: number, row: any) => row.voucherNumber ?? i;

  buildForm(): void {
    this.form = this.fb.group({
      header: this.fb.group({
        year: [null, Validators.required],
        month: [null, Validators.required],
        fyType: ['JAN_DEC', Validators.required]
      })
    });
  }

  get header(): FormGroup { return this.form.get('header') as FormGroup; }

  onSearchChange(value: string): void { this.searchSubject.next(value); }

  clearSearch(): void {
    this.searchText = '';
    this.debouncedSearch = '';
    this.highlightRegex = null;
    this.rebuildFilteredLists();
    this.cdr.markForCheck();
  }

  highlightText(value: any): string {
    if (!value || !this.highlightRegex) return value;
    return value.toString().replace(this.highlightRegex, '<mark>$1</mark>');
  }

  private rebuildFilteredLists(): void {
    switch (this.activeTab) {
      case 'trialBalance': this.filteredTrialBalance = this.applyFilter(this.trialBalanceRows); break;
      case 'glDetails': this.filteredGlDetails = this.applyFilter(this.glDetails); break;
      case 'subledgerSchedule': this.filteredSubledgerSchedule = this.applyFilter(this.subledgerScheduleRows); break;
      case 'subledgerAccount': this.filteredSubledgerAccount = this.applyFilter(this.subledgerAccountRows); break;
      case 'billsPayments': this.filteredBillsPayments = this.applyFilter(this.billsPaymentsRows); break;
    }
  }

  private applyFilter<T>(list: T[]): T[] {
    if (!this.debouncedSearch) return list;
    const search = this.debouncedSearch.toLowerCase();
    const scored: { item: T; score: number }[] = [];
    for (const item of list) {
      let score = 0;
      for (const val of Object.values(item as any)) {
        if (!val) continue;
        const str = val.toString().toLowerCase();
        if (str === search) score += 3;
        else if (str.startsWith(search)) score += 2;
        else if (str.includes(search)) score += 1;
      }
      scored.push({ item, score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map(s => s.item);
  }

  private escapeRegex(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  onTrialBalanceAccountClick(row: TrialBalanceRow): void {
    this.selectedAccountCode = row.accountCode;
    // Clear any stale drill-down state from a previous account so lazy-load
    // guards in setActiveTab work correctly for this new account.
    this.selectedSubAccountCode = null;
    this.subledgerAccountRows = [];
    this.filteredSubledgerAccount = [];
    this.billsPaymentsRows = [];
    this.filteredBillsPayments = [];
    this.subledgerOpeningBalance = 0;
    this.totalslaDebit = 0;
    this.totalslaCredit = 0;

    const accountType = (row.accountType || '').toUpperCase();
    const accPeriod: string | null = this.header.get('month')?.value ?? null;
    const { fromDateIso, toDateIso } = this.getFromToIso(accPeriod);
    const nextTab = (accountType === 'DEBT' || accountType === 'CRDT' || accountType === 'STADV')
      ? 'subledgerSchedule' : 'glDetails';
    this.setActiveTab(nextTab);
    this.breadcrumbs = [
      { label: 'Trial Balance', tab: 'trialBalance' },
      { label: `${row.accountCode} - ${row.description}`, tab: nextTab, accountCode: row.accountCode }
    ];

    // Eagerly fire BOTH downstream queries so switching tabs is instant — matches
    // the legacy app's behavior where all tabs are pre-populated on account click.
    if (accPeriod) {
      this.subledgerScheduleTrigger$.next({ accPeriod, accountCode: this.selectedAccountCode! });
    }
    if (accPeriod && fromDateIso && toDateIso) {
      this.glDetailsTrigger$.next({ accPeriod, accCode: this.selectedAccountCode!, from: fromDateIso, to: toDateIso });
    }
  }

  onSubledgerScheduleClick(row: SubledgerScheduleRow): void {
    this.selectedSubAccountCode = row.subAccountCode;
    this.selectedAccountCode = row.accountCode;
    // Clear any stale drill-down data from a previous subcode so fresh data loads.
    this.billsPaymentsRows = [];
    this.filteredBillsPayments = [];

    const accPeriod: string | null = this.header.get('month')?.value ?? null;
    const { fromDateIso, toDateIso } = this.getFromToIso(accPeriod);
    this.breadcrumbs = [
      { label: 'Trial Balance', tab: 'trialBalance' },
      { label: `${row.accountCode} - ${row.description}`, tab: 'subledgerSchedule', accountCode: row.accountCode },
      { label: `${row.subAccountCode} - ${row.subCodeDescription}`, tab: 'subledgerAccount', accountCode: row.accountCode, subAccountCode: row.subAccountCode }
    ];
    this.setActiveTab('subledgerAccount');

    // Fire BOTH subledger-account-details and bills/payments in parallel so both
    // tabs are ready when the user clicks through — matches legacy app behavior.
    if (accPeriod && fromDateIso && toDateIso) {
      this.subledgerAccountTrigger$.next({
        accPeriod,
        accountCode: this.selectedAccountCode!,
        subAccountCode: this.selectedSubAccountCode!,
        from: fromDateIso,
        to: toDateIso
      });
    }
    this.billsPaymentsTrigger$.next({
      accountCode: this.selectedAccountCode!,
      subAccountCode: this.selectedSubAccountCode!
    });
  }

  breadcrumbClick(bc: any): void {
    this.setActiveTab(bc.tab);
    const accPeriod: string | null = this.header.get('month')?.value ?? null;
    if (bc.tab === 'trialBalance') {
      if (accPeriod) this.trialBalanceTrigger$.next(accPeriod);
    } else if (bc.tab === 'subledgerSchedule') {
      if (accPeriod && bc.accountCode) this.subledgerScheduleTrigger$.next({ accPeriod, accountCode: bc.accountCode });
    } else if (bc.tab === 'glDetails') {
      const { fromDateIso, toDateIso } = this.getFromToIso(accPeriod);
      if (accPeriod && fromDateIso && toDateIso && bc.accountCode) this.glDetailsTrigger$.next({ accPeriod, accCode: bc.accountCode, from: fromDateIso, to: toDateIso });
    } else if (bc.tab === 'subledgerAccount') {
      const { fromDateIso, toDateIso } = this.getFromToIso(accPeriod);
      if (accPeriod && fromDateIso && toDateIso && bc.accountCode && bc.subAccountCode)
        this.subledgerAccountTrigger$.next({ accPeriod, accountCode: bc.accountCode, subAccountCode: bc.subAccountCode, from: fromDateIso, to: toDateIso });
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    this.clearSearch();
    this.rebuildFilteredLists();
    // Lazy-load Bills & Payments only when the user actually opens that tab,
    // and only if we have the required context and haven't already loaded.
    if (tab === 'billsPayments'
        && this.selectedAccountCode
        && this.selectedSubAccountCode
        && this.billsPaymentsRows.length === 0) {
      this.billsPaymentsTrigger$.next({
        accountCode: this.selectedAccountCode,
        subAccountCode: this.selectedSubAccountCode
      });
    }
  }

  sortTable(column: string): void {
    if (this.sortColumn === column) this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    else { this.sortColumn = column; this.sortDirection = 'asc'; }
    const dir = this.sortDirection === 'asc' ? 1 : -1;
    const cmp = (a: any, b: any): number => {
      const aVal = a[column], bVal = b[column];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return -dir; if (bVal == null) return dir;
      if (typeof aVal === 'number' && typeof bVal === 'number') return (aVal - bVal) * dir;
      const aS = String(aVal).toLowerCase(), bS = String(bVal).toLowerCase();
      return aS < bS ? -dir : aS > bS ? dir : 0;
    };
    switch (this.activeTab) {
      case 'trialBalance': this.trialBalanceRows = [...this.trialBalanceRows].sort(cmp); this.filteredTrialBalance = this.applyFilter(this.trialBalanceRows); break;
      case 'glDetails': this.glDetails = [...this.glDetails].sort(cmp); this.filteredGlDetails = this.applyFilter(this.glDetails); break;
      case 'subledgerSchedule': this.subledgerScheduleRows = [...this.subledgerScheduleRows].sort(cmp); this.filteredSubledgerSchedule = this.applyFilter(this.subledgerScheduleRows); break;
      case 'subledgerAccount': this.subledgerAccountRows = [...this.subledgerAccountRows].sort(cmp); this.filteredSubledgerAccount = this.applyFilter(this.subledgerAccountRows); break;
      case 'billsPayments': this.billsPaymentsRows = [...this.billsPaymentsRows].sort(cmp); this.filteredBillsPayments = this.applyFilter(this.billsPaymentsRows); break;
    }
    this.cdr.markForCheck();
  }

  loadFinancialYears(): void {
    this.setLoading(true);
    normalizeResponse<any[]>(this.commonService.getYearList(), 'Financial Year list')
      .pipe(finalize(() => this.setLoading(false)), takeUntil(this.destroy$))
      .subscribe({
        next: (res: ApiResponse<any[] | null>) => {
          this.years = (res.data ?? []) as FinancialYearsWithPeriodsModel[];
          if (res.status === 200 && this.years.length) {
            this.header.get('year')?.setValue(this.years[0].financialyear, { emitEvent: false });
            this.onYearChange();
          } else { this.months = []; this.trialBalanceRows = []; }
          this.cdr.markForCheck();
        },
        error: err => this.handleError(err)
      });
  }

  onYearChange(): void {
    const fy = this.years.find(y => y.financialyear === this.header.get('year')?.value);
    this.months = fy?.periods || [];
    if (this.months.length > 0) {
      this.header.get('month')?.setValue(this.months[0].accperiod, { emitEvent: false });
      this.trialBalanceTrigger$.next(this.months[0].accperiod);
    } else {
      this.header.get('month')?.setValue(null);
      this.trialBalanceRows = [];
      this.cdr.markForCheck();
    }
  }

  onMonthChange(): void {
    const month = this.header.get('month')?.value;
    if (month) this.trialBalanceTrigger$.next(month);
  }

  onVoucherNumberClick(row: SubledgerAccountRow): void {
    if (!row.voucherNumber || !row.voucherDate) return;
    this.openVoucherPopupInternal(row.voucherNumber + '', new Date(row.voucherDate));
  }

  onGLVoucherClick(row: GLDetailRow): void {
    if (!row.voucherNumber || !row.voucherDate) return;
    this.openVoucherPopupInternal(row.voucherNumber + '', new Date(row.voucherDate));
  }

  private openVoucherPopupInternal(voucherNumber: string, dateObj: Date): void {
    const dateIso = formatDate(dateObj, 'yyyy-MM-dd', 'en-US');
    this.showVoucherPopup = false;
    this.voucherEntries = [];
    this.cdr.detectChanges();
    this.voucherPopupTitle = voucherNumber;
    this.voucherPopupDateRaw = formatDate(dateObj, 'dd-MM-yyyy', 'en-US');
    this.showVoucherPopup = true;
    this.voucherTotalDebit = 0;
    this.voucherTotalCredit = 0;
    this.voucherNarration = '';
    this.voucherEntriesTrigger$.next({ voucherNumber, voucherDate: dateIso });
  }

  closeVoucherPopup(): void {
    this.showVoucherPopup = false;
    this.voucherEntries = [];
    this.cdr.markForCheck();
  }

  onViewCostProduct(): void {
    if (!this.voucherPopupTitle) return;
    this.costProductTrigger$.next({ voucherNumber: this.voucherPopupTitle });
  }

  closeCostProductPopup(): void {
    this.showCostProductPopup = false;
    this.costProductEntries = [];
    this.costProductGrouped = [];
    this.cdr.markForCheck();
  }

  onBillsPaymentsAdjusted(): void {
    if (!this.voucherPopupTitle) return;
    this.billsAdjustedRows = [];
    this.billsAdjustedLoading = true;
    this.showBillsAdjustedPopup = true;
    this.cdr.markForCheck();
    this.dataService.getBillsPaymentsAdjusted(this.voucherPopupTitle)
      .pipe(finalize(() => { this.billsAdjustedLoading = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) return;
          this.billsAdjustedRows = Array.isArray(resp?.data) ? resp.data : [];
          this.cdr.markForCheck();
        },
        error: () => this.alertService.error('Failed to load bills/payments adjusted details.')
      });
  }

  closeBillsAdjustedPopup(): void {
    this.showBillsAdjustedPopup = false;
    this.billsAdjustedRows = [];
    this.cdr.markForCheck();
  }

  get billsTotal(): number {
    return this.filteredBillsPayments
      .filter(r => r.nature === 'Bills')
      .reduce((s, r) => s + (Number(r.billBalance) || 0), 0);
  }

  get paymentsTotal(): number {
    return this.filteredBillsPayments
      .filter(r => r.nature === 'Payments')
      .reduce((s, r) => s + (Number(r.billBalance) || 0), 0);
  }

  private fmt(n: any): string {
    const num = Number(n);
    if (!num || isNaN(num)) return '';
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  downloadVoucherPdf(): void {
    if (!this.voucherEntries.length) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Voucher Details — ${this.voucherPopupTitle}`, pageW / 2, 13, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 136, 96);
    doc.text(`Date: ${this.voucherPopupDateRaw}    |    Printed on: ${today}`, pageW / 2, 19, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const body: any[] = this.voucherEntries.map(e => [
      [e.accountCode, e.description].filter(Boolean).join(' ')
      + (e.lineDetails ? `\n${e.lineDetails}` : '')
      + (e.subAccountCode ? `\n${e.subAccountCode} : ${e.subCodeDescription}` : ''),
      [
        e.instrumentNo ?? '',
        e.instrumentDate ? new Date(e.instrumentDate).toLocaleDateString('en-GB') : ''
      ].filter(Boolean).join('\n'),
      e.debit ? this.fmt(e.debit) : '',
      e.credit ? this.fmt(e.credit) : ''
    ]);

    body.push(['Voucher Totals', '', this.fmt(this.voucherTotalDebit), this.fmt(this.voucherTotalCredit)]);

    (doc as any).autoTable({
      startY: 23,
      margin: { left: 10, right: 10, top: 10, bottom: 10 },
      head: [['Account Description / Line Particulars', 'Inst.no/Date', 'Debit', 'Credit']],
      body,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
        overflow: 'linebreak',
        textColor: [30, 30, 30],
        lineColor: [221, 221, 221],
        lineWidth: 0.2
      },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold', halign: 'left' },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30, halign: 'right' as const },
        3: { cellWidth: 30, halign: 'right' as const }
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        if (data.row.index === body.length - 1) {
          data.cell.styles.fillColor = this.G1;
          data.cell.styles.textColor = this.WHT;
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index >= 1) data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (data: any) => this.addPageNumber(doc, data, pageW)
    });

    if (this.voucherNarration) {
      const y = (doc as any).lastAutoTable.finalY + 5;
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(45, 106, 45);
      doc.text('Narration: ', 10, y);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
      doc.text(this.voucherNarration, 32, y);
    }

    doc.save(`VoucherDetails_${this.voucherPopupTitle}.pdf`);
  }

  downloadBillsAdjustedPdf(): void {
    if (!this.billsAdjustedRows.length) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    doc.text(`Bills/Payments Adjusted — ${this.voucherPopupTitle}`, pageW / 2, 13, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 136, 96);
    doc.text(`Printed on: ${today}`, pageW / 2, 19, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const body: any[] = this.billsAdjustedRows.map(r => [
      r.voucherNumber ?? '',
      r.voucherDate ? new Date(r.voucherDate).toLocaleDateString('en-GB') : '',
      r.referenceNumber ?? '',
      r.referenceDate ? new Date(r.referenceDate).toLocaleDateString('en-GB') : '',
      r.billNumber ?? '',
      r.billDate ? new Date(r.billDate).toLocaleDateString('en-GB') : '',
      this.fmt(Number(r.billAdjustedAmount) || 0)
    ]);

    const grandTotal = this.billsAdjustedRows.reduce((s, r) => s + (Number(r.billAdjustedAmount) || 0), 0);
    body.push(['', '', '', '', '', 'Grand Total', this.fmt(grandTotal)]);

    (doc as any).autoTable({
      startY: 23,
      margin: { left: 10, right: 10, top: 10, bottom: 10 },
      head: [['Voucher Number', 'Voucher Date', 'Reference Number', 'Reference Date', 'Bill Number', 'Bill Date', 'Bill Adjusted Amount']],
      body,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 },
        overflow: 'linebreak',
        textColor: [30, 30, 30],
        lineColor: [221, 221, 221],
        lineWidth: 0.2
      },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold', halign: 'left' },
      columnStyles: {
        0: { cellWidth: 35 }, 1: { cellWidth: 28 }, 2: { cellWidth: 38 },
        3: { cellWidth: 28 }, 4: { cellWidth: 35 }, 5: { cellWidth: 28 },
        6: { cellWidth: 35, halign: 'right' as const }
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        if (data.row.index === body.length - 1) {
          data.cell.styles.fillColor = this.G1;
          data.cell.styles.textColor = this.WHT;
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index >= 5) data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (data: any) => this.addPageNumber(doc, data, pageW)
    });

    doc.save(`BillsAdjusted_${this.voucherPopupTitle}.pdf`);
  }

  downloadCostProductPdf(): void {
    if (!this.costProductEntries.length) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(0, 0, 0);
    doc.text('Cost / Product Entries', pageW / 2, 13, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 136, 96);
    doc.text(`Voucher: ${this.voucherPopupTitle}    |    Printed on: ${today}`, pageW / 2, 19, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    type RowMeta = 'group' | 'item' | 'acctotal';
    const body: any[] = [];
    const rowMeta: RowMeta[] = [];

    for (const grp of this.costProductGrouped) {
      body.push([{
        content: `${grp.accountCode} : ${grp.description}`,
        colSpan: 2,
        styles: { fontStyle: 'bold' as const, textColor: [45, 106, 45] }
      }]);
      rowMeta.push('group');

      for (const item of grp.items) {
        body.push([`${item.costCentreCode}    ${item.costCentreDescription}`, this.fmt(item.voucherAmount || 0)]);
        rowMeta.push('item');
      }

      body.push(['Account Total', this.fmt(grp.total)]);
      rowMeta.push('acctotal');
    }

    (doc as any).autoTable({
      startY: 23,
      margin: { left: 10, right: 10, top: 10, bottom: 10 },
      head: [['Dept. Code Description', 'Amount']],
      body,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: { top: 2, bottom: 2, left: 3, right: 3 },
        overflow: 'linebreak',
        textColor: [30, 30, 30],
        lineColor: [221, 221, 221],
        lineWidth: 0.2
      },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold', halign: 'left' },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 50, halign: 'right' as const }
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        if (rowMeta[data.row.index] === 'acctotal') {
          data.cell.styles.fillColor = this.MID;
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 0) data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (data: any) => this.addPageNumber(doc, data, pageW)
    });

    doc.save(`CostProduct_${this.voucherPopupTitle}.pdf`);
  }

  private addPageNumber(doc: any, data: any, pageW: number): void {
    const pageCount = doc.internal.getNumberOfPages();
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 136, 96);
    doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageW - 15, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  private applyExcelStyles(ws: any, aoaRows: any[][], rowTypes: string[], numCols: number[], totalCols: number): void {
    const BDR = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } }
    };
    const NUM = '#,##0.00';
    const G1hex = '4EAA39';
    const MIDhex = 'EDF6EB';
    const CL = (c: number) => String.fromCharCode(65 + c);

    aoaRows.forEach((row, ri) => {
      const type = rowTypes[ri];
      const xlR = ri + 1;
      for (let c = 0; c < totalCols; c++) {
        const addr = `${CL(c)}${xlR}`;
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };
        const isNum = numCols.includes(c);
        const val = row[c];
        if (isNum && val !== null && val !== '' && !isNaN(Number(val))) { ws[addr].t = 'n'; ws[addr].v = Number(val); }

        switch (type) {
          case 'title':
            ws[addr].s = { font: { bold: true, sz: 13 }, alignment: { horizontal: 'center', vertical: 'center' } };
            break;
          case 'header':
            ws[addr].s = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: G1hex } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BDR };
            break;
          case 'data':
            ws[addr].s = isNum
              ? { font: { sz: 9 }, alignment: { horizontal: 'right' }, numFmt: NUM, border: BDR }
              : { font: { sz: 9 }, border: BDR };
            break;
          case 'vtotal':
            ws[addr].s = isNum
              ? { font: { bold: true, sz: 9 }, fill: { fgColor: { rgb: MIDhex } }, alignment: { horizontal: 'right' }, numFmt: NUM, border: BDR }
              : { font: { bold: true, sz: 9 }, fill: { fgColor: { rgb: MIDhex } }, border: BDR };
            break;
          case 'gtotal':
            ws[addr].s = isNum
              ? { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: G1hex } }, alignment: { horizontal: 'right' }, numFmt: NUM, border: BDR }
              : { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: G1hex } }, border: BDR };
            break;
        }
      }
    });
  }

  downloadVoucherExcel(): void {
    if (!this.voucherEntries.length) return;

    const wb = XLSX.utils.book_new();
    const aoaRows: any[][] = [];
    const rowTypes: string[] = [];

    aoaRows.push([`Voucher Details — ${this.voucherPopupTitle} dated ${this.voucherPopupDateRaw}`, '', '', '']);
    rowTypes.push('title');
    aoaRows.push(Array(4).fill(''));
    rowTypes.push('blank');
    aoaRows.push(['Account Description / Line Particulars', 'Inst. No / Date', 'Debit', 'Credit']);
    rowTypes.push('header');

    for (const e of this.voucherEntries) {
      aoaRows.push([
        [e.accountCode, e.description, e.lineDetails,
        e.subAccountCode ? `${e.subAccountCode} : ${e.subCodeDescription}` : ''].filter(Boolean).join(' | '),
        [e.instrumentNo ?? '', e.instrumentDate ? new Date(e.instrumentDate).toLocaleDateString('en-GB') : ''].filter(Boolean).join(' / '),
        e.debit || null,
        e.credit || null
      ]);
      rowTypes.push('data');
    }

    aoaRows.push(['Voucher Totals', '', this.voucherTotalDebit, this.voucherTotalCredit]);
    rowTypes.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);
    ws['!cols'] = [{ wch: 60 }, { wch: 22 }, { wch: 16 }, { wch: 16 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    this.applyExcelStyles(ws, aoaRows, rowTypes, [2, 3], 4);
    XLSX.utils.book_append_sheet(wb, ws, 'Voucher Details');
    XLSX.writeFile(wb, `VoucherDetails_${this.voucherPopupTitle}.xlsx`);
  }

  exportBillsAdjustedToExcel(): void {
    if (!this.billsAdjustedRows.length) return;

    const wb = XLSX.utils.book_new();
    const aoaRows: any[][] = [];
    const rowTypes: string[] = [];

    aoaRows.push([`Bills/Payments Adjusted — ${this.voucherPopupTitle}`, '', '', '', '', '', '']);
    rowTypes.push('title');
    aoaRows.push(Array(7).fill(''));
    rowTypes.push('blank');
    aoaRows.push(['Voucher Number', 'Voucher Date', 'Reference Number', 'Reference Date', 'Bill Number', 'Bill Date', 'Bill Adjusted Amount']);
    rowTypes.push('header');

    for (const r of this.billsAdjustedRows) {
      aoaRows.push([
        r.voucherNumber ?? '',
        r.voucherDate ? new Date(r.voucherDate).toLocaleDateString('en-GB') : '',
        r.referenceNumber ?? '',
        r.referenceDate ? new Date(r.referenceDate).toLocaleDateString('en-GB') : '',
        r.billNumber ?? '',
        r.billDate ? new Date(r.billDate).toLocaleDateString('en-GB') : '',
        Number(r.billAdjustedAmount) || null
      ]);
      rowTypes.push('data');
    }

    const grandTotal = this.billsAdjustedRows.reduce((s, r) => s + (Number(r.billAdjustedAmount) || 0), 0);
    aoaRows.push(['', '', '', '', '', 'Grand Total', grandTotal]);
    rowTypes.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 22 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    this.applyExcelStyles(ws, aoaRows, rowTypes, [6], 7);
    XLSX.utils.book_append_sheet(wb, ws, 'Bills Adjusted');
    XLSX.writeFile(wb, `BillsAdjusted_${this.voucherPopupTitle}.xlsx`);
  }

  exportCostProductToExcel(): void {
    if (!this.costProductEntries.length) return;

    const wb = XLSX.utils.book_new();
    const aoaRows: any[][] = [];
    const rowTypes: string[] = [];

    aoaRows.push([`Cost / Product Entries — ${this.voucherPopupTitle}`, '', '', '', '']);
    rowTypes.push('title');
    aoaRows.push(Array(5).fill(''));
    rowTypes.push('blank');
    aoaRows.push(['Account Code', 'Account Description', 'Cost Centre Code', 'Cost Centre Description', 'Amount']);
    rowTypes.push('header');

    for (const grp of this.costProductGrouped) {
      for (const item of grp.items) {
        aoaRows.push([grp.accountCode, grp.description, item.costCentreCode || '', item.costCentreDescription || '', item.voucherAmount || null]);
        rowTypes.push('data');
      }
      aoaRows.push(['', '', '', 'Account Total', grp.total]);
      rowTypes.push('vtotal');
    }

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);
    ws['!cols'] = [{ wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 16 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];
    this.applyExcelStyles(ws, aoaRows, rowTypes, [4], 5);
    XLSX.utils.book_append_sheet(wb, ws, 'Cost Product');
    XLSX.writeFile(wb, `CostProduct_${this.voucherPopupTitle}.xlsx`);
  }

  private sumField(rows: any[], field: string): number { return rows.reduce((s, r) => s + (r[field] || 0), 0); }

  // Pull the opening-balance row (SequenceNo='2') out of the subledger payload.
  // The SQL emits it in a separate OpeningBalance column (signed: +ve debit, -ve credit).
  private extractOpeningBalance(rows: any[]): number {
    const openingRow = rows.find(r => r.sequenceNo === '2');
    return openingRow ? Number(openingRow.openingBalance || 0) : 0;
  }

  // GL Details opening-balance row is SequenceNo='1' with Debit/Credit populated from
  // CFN_GENERALLEDGER (the SQL puts POSTEDOPENINGBALANCE into Debit or Credit based on
  // POSTEDOBDBCR). Returns signed: +ve debit, -ve credit.
  private extractGlOpeningBalance(rows: any[]): number {
    const openingRow = rows.find(r => r.sequenceNo === '1');
    if (!openingRow) return 0;
    const dr = Number(openingRow.debit || 0);
    const cr = Number(openingRow.credit || 0);
    return dr - cr;
  }

  private getFromToIso(accPeriod: string | null): { fromDateIso: string | null; toDateIso: string | null } {
    if (!accPeriod) return { fromDateIso: null, toDateIso: null };
    const period = this.months.find(p => p.accperiod === accPeriod);
    if (!period) return { fromDateIso: null, toDateIso: null };
    const fyType = this.header.get('fyType')?.value;
    const year = this.header.get('year')?.value;
    const startMonth = fyType === 'JAN_DEC' ? 0 : 3;
    return {
      fromDateIso: formatDate(new Date(year, startMonth, 1), 'yyyy-MM-dd', 'en-US'),
      toDateIso: formatDate(period.periodto, 'yyyy-MM-dd', 'en-US')
    };
  }

  private setLoading(val: boolean): void { this.isLoading = val; this.cdr.markForCheck(); }

  private groupCostProductEntries(entries: CostProductEntryRow[]) {
    const map = new Map<string, { accountCode: string; description: string; items: CostProductEntryRow[]; total: number }>();
    for (const e of entries) {
      const key = e.accountCode || '';
      if (!map.has(key)) map.set(key, { accountCode: key, description: e.description || '', items: [], total: 0 });
      const g = map.get(key)!; g.items.push(e); g.total += e.voucherAmount || 0;
    }
    return Array.from(map.values());
  }

  private handleError(err: any): void {
    console.error(err);
    this.error = err?.message || 'An error occurred';
    this.alertService.error(this.error);
    this.isLoading = false;
    this.cdr.markForCheck();
  }

  private setupStreams(): void {

    this.trialBalanceTrigger$.pipe(
      takeUntil(this.destroy$), tap(() => this.setLoading(true)),
      switchMap(accPeriod => this.dataService.getTrialBalance(accPeriod).pipe(finalize(() => this.setLoading(false))))
    ).subscribe({
      next: res => {
        this.trialBalanceRows = Array.isArray(res.data) ? res.data as TrialBalanceRow[] : [];
        this.totaltbDebit = this.sumField(this.trialBalanceRows, 'debit');
        this.totaltbCredit = this.sumField(this.trialBalanceRows, 'credit');
        this.breadcrumbs = [{ label: 'Trial Balance', tab: 'trialBalance' }];
        this.setActiveTab('trialBalance');
        this.cdr.markForCheck();
      },
      error: err => this.handleError(err)
    });

    this.glDetailsTrigger$.pipe(
      takeUntil(this.destroy$), tap(() => this.setLoading(true)),
      switchMap(({ accPeriod, accCode, from, to }) => this.dataService.getGLDetails(accPeriod, accCode, from, to).pipe(finalize(() => this.setLoading(false))))
    ).subscribe({
      next: res => {
        const allRows = Array.isArray(res.data) ? res.data as GLDetailRow[] : [];
        // Extract opening balance (SequenceNo='1') as a signed value: +ve debit, -ve credit.
        this.glOpeningBalance = this.extractGlOpeningBalance(allRows);
        // Grid shows only actual transactions (SequenceNo='6').
        // SequenceNo='1' (opening) is rendered separately via the opening-balance row.
        // SequenceNo='7' (per-voucher-type summary) is excluded — it double-counts seq 6.
        this.glDetails = allRows.filter(r => r.sequenceNo === '6');
        this.totalglDebit = this.sumField(this.glDetails, 'debit');
        this.totalglCredit = this.sumField(this.glDetails, 'credit');
        this.filteredGlDetails = this.applyFilter(this.glDetails);
        this.cdr.markForCheck();
      },
      error: err => this.handleError(err)
    });

    this.subledgerScheduleTrigger$.pipe(
      takeUntil(this.destroy$), tap(() => this.setLoading(true)),
      switchMap(({ accPeriod, accountCode }) => this.dataService.getSubledgerSchedule(accPeriod, accountCode).pipe(finalize(() => this.setLoading(false))))
    ).subscribe({
      next: res => {
        this.subledgerScheduleRows = Array.isArray(res.data) ? res.data as SubledgerScheduleRow[] : [];
        this.totalslDebit = this.sumField(this.subledgerScheduleRows, 'debit');
        this.totalslCredit = this.sumField(this.subledgerScheduleRows, 'credit');
        this.filteredSubledgerSchedule = this.applyFilter(this.subledgerScheduleRows);
        this.cdr.markForCheck();
      },
      error: err => this.handleError(err)
    });

    this.subledgerAccountTrigger$.pipe(
      takeUntil(this.destroy$), tap(() => this.setLoading(true)),
      switchMap(({ accPeriod, accountCode, subAccountCode, from, to }) =>
        this.dataService.getSubledgerAccountDetails(accPeriod, accountCode, subAccountCode, from, to).pipe(finalize(() => this.setLoading(false))))
    ).subscribe({
      next: res => {
        const allRows = Array.isArray(res.data) ? res.data as SubledgerAccountRow[] : [];
        this.subledgerOpeningBalance = this.extractOpeningBalance(allRows);
        this.subledgerAccountRows = allRows.filter(r => r.sequenceNo !== '2');
        this.totalslaDebit = this.sumField(this.subledgerAccountRows, 'debit');
        this.totalslaCredit = this.sumField(this.subledgerAccountRows, 'credit');
        this.filteredSubledgerAccount = this.applyFilter(this.subledgerAccountRows);
        this.cdr.markForCheck();
      },
      error: err => this.handleError(err)
    });

    this.billsPaymentsTrigger$.pipe(
      takeUntil(this.destroy$), tap(() => this.setLoading(true)),
      switchMap(({ accountCode, subAccountCode }) => this.dataService.getBillsAndPayments(accountCode, subAccountCode).pipe(finalize(() => this.setLoading(false))))
    ).subscribe({
      next: res => {
        this.billsPaymentsRows = Array.isArray(res.data) ? res.data as BillPaymentRow[] : [];
        this.filteredBillsPayments = this.applyFilter(this.billsPaymentsRows);
        this.cdr.markForCheck();
      },
      error: err => this.handleError(err)
    });

    this.voucherEntriesTrigger$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) => prev.voucherNumber === curr.voucherNumber && prev.voucherDate === curr.voucherDate),
      tap(() => this.setLoading(true)),
      switchMap(({ voucherNumber, voucherDate }) =>
        this.dataService.getVoucherEntries(voucherNumber, voucherDate).pipe(finalize(() => this.setLoading(false))))
    ).subscribe({
      next: res => {
        this.voucherEntries = Array.isArray(res.data) ? res.data as VoucherEntryRow[] : [];
        this.voucherTotalDebit = this.sumField(this.voucherEntries, 'debit');
        this.voucherTotalCredit = this.sumField(this.voucherEntries, 'credit');
        const ne = this.voucherEntries.find(e => !!e.voucherNarration);
        this.voucherNarration = ne?.voucherNarration || '';
        this.cdr.markForCheck();
      },
      error: err => { this.handleError(err); this.showVoucherPopup = false; }
    });

    this.costProductTrigger$.pipe(
      takeUntil(this.destroy$), tap(() => this.setLoading(true)),
      switchMap(({ voucherNumber }) =>
        this.dataService.getCostProductEntries(voucherNumber).pipe(finalize(() => this.setLoading(false))))
    ).subscribe({
      next: res => {
        this.costProductEntries = Array.isArray(res.data) ? res.data as CostProductEntryRow[] : [];
        this.costProductGrouped = this.groupCostProductEntries(this.costProductEntries);
        this.showCostProductPopup = true;
        this.cdr.markForCheck();
      },
      error: err => this.handleError(err)
    });
  }

  hasActiveTabData(): boolean {
    switch (this.activeTab) {
      case 'trialBalance': return this.filteredTrialBalance.length > 0;
      case 'glDetails': return this.filteredGlDetails.length > 0;
      case 'subledgerSchedule': return this.filteredSubledgerSchedule.length > 0;
      case 'subledgerAccount': return this.filteredSubledgerAccount.length > 0;
      case 'billsPayments': return this.filteredBillsPayments.length > 0;
      default: return false;
    }
  }

  downloadActivePdf(): void {
    switch (this.activeTab) {
      case 'trialBalance': this.downloadTrialBalancePdf(); break;
      case 'glDetails': this.downloadGlDetailsPdf(); break;
      case 'subledgerSchedule': this.downloadSubledgerSchedulePdf(); break;
      case 'subledgerAccount': this.downloadSubledgerAccountPdf(); break;
      case 'billsPayments': this.downloadBillsPaymentsPdf(); break;
    }
  }

  downloadActiveExcel(): void {
    switch (this.activeTab) {
      case 'trialBalance': this.downloadTrialBalanceExcel(); break;
      case 'glDetails': this.downloadGlDetailsExcel(); break;
      case 'subledgerSchedule': this.downloadSubledgerScheduleExcel(); break;
      case 'subledgerAccount': this.downloadSubledgerAccountExcel(); break;
      case 'billsPayments': this.downloadBillsPaymentsExcel(); break;
    }
  }

  // ── Trial Balance PDF ─────────────────────────────────────────────────────
  downloadTrialBalancePdf(): void {
    if (!this.filteredTrialBalance.length) return;
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const period = this.header.get('month')?.value || '';

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...this.G1);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 10, { align: 'center' });
    doc.setFontSize(11); doc.setTextColor(0, 0, 0);
    doc.text('Trial Balance', pageW / 2, 16, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 136, 96);
    doc.text(`Period: ${period}    |    Printed on: ${today}`, pageW / 2, 21, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const body: any[] = this.filteredTrialBalance.map(r => [
      r.accountCode, r.description,
      this.fmt(r.debit || 0), this.fmt(r.credit || 0)
    ]);
    body.push(['', 'Total', this.fmt(this.totaltbDebit), this.fmt(this.totaltbCredit)]);

    (doc as any).autoTable({
      startY: 25, margin: { left: 10, right: 10 },
      head: [['Account Code', 'Description', 'Debit', 'Credit']],
      body, theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, overflow: 'linebreak', lineColor: [221, 221, 221], lineWidth: 0.2 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 45 }, 1: { cellWidth: 165 },
        2: { cellWidth: 35, halign: 'right' as const },
        3: { cellWidth: 35, halign: 'right' as const }
      },
      didParseCell: (d: any) => {
        if (d.section === 'body' && d.row.index === body.length - 1) {
          d.cell.styles.fillColor = this.G1; d.cell.styles.textColor = this.WHT; d.cell.styles.fontStyle = 'bold';
          if (d.column.index >= 2) d.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (d: any) => this.addPageNumber(doc, d, pageW)
    });
    doc.save(`TrialBalance_${period}.pdf`);
  }

  // ── Trial Balance Excel ───────────────────────────────────────────────────
  downloadTrialBalanceExcel(): void {
    if (!this.filteredTrialBalance.length) return;
    const period = this.header.get('month')?.value || '';
    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];
    const types: string[] = [];

    aoa.push(['OTTO BILZ (INDIA) PVT. LTD.', '', '', '']); types.push('company');
    aoa.push([`Trial Balance — Period: ${period}`, '', '', '']); types.push('title');
    aoa.push(Array(4).fill('')); types.push('blank');
    aoa.push(['Account Code', 'Description', 'Debit', 'Credit']); types.push('header');
    for (const r of this.filteredTrialBalance) {
      aoa.push([r.accountCode, r.description, r.debit || null, r.credit || null]);
      types.push('data');
    }
    aoa.push(['', 'Total', this.totaltbDebit, this.totaltbCredit]); types.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 18 }, { wch: 50 }, { wch: 18 }, { wch: 18 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
    ];
    this.applyExcelStyles(ws, aoa, types, [2, 3], 4);
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance');
    XLSX.writeFile(wb, `TrialBalance_${period}.xlsx`);
  }

  // ── GL Account Details PDF ────────────────────────────────────────────────
  downloadGlDetailsPdf(): void {
    if (!this.filteredGlDetails.length) return;
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const accCode = this.selectedAccountCode || '';
    const period = this.header.get('month')?.value || '';

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...this.G1);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 10, { align: 'center' });
    doc.setFontSize(11); doc.setTextColor(0, 0, 0);
    doc.text('GL Account Details', pageW / 2, 16, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 136, 96);
    doc.text(`Account: ${accCode}    |    Period: ${period}    |    Printed on: ${today}`, pageW / 2, 21, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const body: any[] = [];
    if (this.glOpeningBalance !== 0) {
      body.push(['', '', 'Opening Balance',
        this.fmt(this.glOpeningDebit),
        this.fmt(this.glOpeningCredit),
        '']);
    }
    this.filteredGlDetails.forEach(r => body.push([
      r.voucherNumber,
      r.voucherDate ? new Date(r.voucherDate).toLocaleDateString('en-GB') : '',
      r.voucherType,
      this.fmt(r.debit || 0),
      this.fmt(r.credit || 0),
      r.lineDetails || ''
    ]));
    body.push(['', '', 'Total', this.fmt(this.totalglDebit), this.fmt(this.totalglCredit), '']);
    body.push(['', '', 'Closing Balance',
      this.fmt(this.glClosingDebit),
      this.fmt(this.glClosingCredit),
      '']);

    (doc as any).autoTable({
      startY: 25, margin: { left: 10, right: 10 },
      head: [['Voucher No', 'Date', 'Type', 'Debit', 'Credit', 'Details']],
      body, theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, overflow: 'linebreak', lineColor: [221, 221, 221], lineWidth: 0.2 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 35 }, 1: { cellWidth: 25 }, 2: { cellWidth: 25 },
        3: { cellWidth: 35, halign: 'right' as const },
        4: { cellWidth: 35, halign: 'right' as const },
        5: { cellWidth: 120 }
      },
      didParseCell: (d: any) => {
        if (d.section === 'body' && (d.row.index === body.length - 1 || d.row.index === body.length - 2)) {
          d.cell.styles.fillColor = this.G1; d.cell.styles.textColor = this.WHT; d.cell.styles.fontStyle = 'bold';
          if (d.column.index >= 2) d.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (d: any) => this.addPageNumber(doc, d, pageW)
    });
    doc.save(`GLDetails_${accCode}.pdf`);
  }

  // ── GL Account Details Excel ──────────────────────────────────────────────
  downloadGlDetailsExcel(): void {
    if (!this.filteredGlDetails.length) return;
    const accCode = this.selectedAccountCode || '';
    const period = this.header.get('month')?.value || '';
    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];
    const types: string[] = [];

    aoa.push(['OTTO BILZ (INDIA) PVT. LTD.', '', '', '', '', '']); types.push('company');
    aoa.push([`GL Account Details — ${accCode}    |    Period: ${period}`, '', '', '', '', '']); types.push('title');
    aoa.push(Array(6).fill('')); types.push('blank');
    aoa.push(['Voucher No', 'Date', 'Type', 'Debit', 'Credit', 'Details']); types.push('header');
    if (this.glOpeningBalance !== 0) {
      aoa.push(['', '', 'Opening Balance',
        this.glOpeningDebit || null,
        this.glOpeningCredit || null,
        '']);
      types.push('gtotal');
    }
    for (const r of this.filteredGlDetails) {
      aoa.push([
        r.voucherNumber,
        r.voucherDate ? new Date(r.voucherDate).toLocaleDateString('en-GB') : '',
        r.voucherType,
        r.debit || null,
        r.credit || null,
        r.lineDetails || ''
      ]);
      types.push('data');
    }
    aoa.push(['', '', 'Total', this.totalglDebit, this.totalglCredit, '']); types.push('gtotal');
    aoa.push(['', '', 'Closing Balance',
      this.glClosingDebit || null,
      this.glClosingCredit || null,
      '']); types.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 40 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
    ];
    this.applyExcelStyles(ws, aoa, types, [3, 4], 6);
    XLSX.utils.book_append_sheet(wb, ws, 'GL Details');
    XLSX.writeFile(wb, `GLDetails_${accCode}.xlsx`);
  }

  // ── Subledger Schedule PDF ────────────────────────────────────────────────
  downloadSubledgerSchedulePdf(): void {
    if (!this.filteredSubledgerSchedule.length) return;
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const accCode = this.selectedAccountCode || '';
    const period = this.header.get('month')?.value || '';

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...this.G1);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 10, { align: 'center' });
    doc.setFontSize(11); doc.setTextColor(0, 0, 0);
    doc.text('Sub Ledger Schedule', pageW / 2, 16, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 136, 96);
    doc.text(`Account: ${accCode}    |    Period: ${period}    |    Printed on: ${today}`, pageW / 2, 21, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const body: any[] = this.filteredSubledgerSchedule.map(r => [
      r.accountCode, r.description, r.subAccountCode, r.subCodeDescription,
      this.fmt(Number(r.debit) || 0),
      this.fmt(Number(r.credit) || 0)
    ]);
    body.push(['', '', '', 'Total', this.fmt(this.totalslDebit), this.fmt(this.totalslCredit)]);

    (doc as any).autoTable({
      startY: 25, margin: { left: 10, right: 10 },
      head: [['Account Code', 'Description', 'SubAccount Code', 'SubAccount Description', 'Debit', 'Credit']],
      body, theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, overflow: 'linebreak', lineColor: [221, 221, 221], lineWidth: 0.2 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 30 }, 1: { cellWidth: 65 },
        2: { cellWidth: 30 }, 3: { cellWidth: 85 },
        4: { cellWidth: 40, halign: 'right' as const },
        5: { cellWidth: 40, halign: 'right' as const }
      },
      didParseCell: (d: any) => {
        if (d.section === 'body' && d.row.index === body.length - 1) {
          d.cell.styles.fillColor = this.G1; d.cell.styles.textColor = this.WHT; d.cell.styles.fontStyle = 'bold';
          if (d.column.index >= 3) d.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (d: any) => this.addPageNumber(doc, d, pageW)
    });
    doc.save(`SubledgerSchedule_${accCode}.pdf`);
  }

  // ── Subledger Schedule Excel ──────────────────────────────────────────────
  downloadSubledgerScheduleExcel(): void {
    if (!this.filteredSubledgerSchedule.length) return;
    const accCode = this.selectedAccountCode || '';
    const period = this.header.get('month')?.value || '';
    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];
    const types: string[] = [];

    aoa.push(['OTTO BILZ (INDIA) PVT. LTD.', '', '', '', '', '']); types.push('company');
    aoa.push([`Sub Ledger Schedule — ${accCode}    |    Period: ${period}`, '', '', '', '', '']); types.push('title');
    aoa.push(Array(6).fill('')); types.push('blank');
    aoa.push(['Account Code', 'Description', 'SubAccount Code', 'SubAccount Description', 'Debit', 'Credit']); types.push('header');
    for (const r of this.filteredSubledgerSchedule) {
      aoa.push([r.accountCode, r.description, r.subAccountCode, r.subCodeDescription, r.debit || null, r.credit || null]);
      types.push('data');
    }
    aoa.push(['', '', '', 'Total', this.totalslDebit, this.totalslCredit]); types.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 35 }, { wch: 16 }, { wch: 16 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
    ];
    this.applyExcelStyles(ws, aoa, types, [4, 5], 6);
    XLSX.utils.book_append_sheet(wb, ws, 'Subledger Schedule');
    XLSX.writeFile(wb, `SubledgerSchedule_${accCode}.xlsx`);
  }

  // ── Subledger Account Details PDF ─────────────────────────────────────────
  downloadSubledgerAccountPdf(): void {
    if (!this.filteredSubledgerAccount.length) return;
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const accCode = this.selectedAccountCode || '';
    const subCode = this.selectedSubAccountCode || '';
    const period = this.header.get('month')?.value || '';

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...this.G1);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 10, { align: 'center' });
    doc.setFontSize(11); doc.setTextColor(0, 0, 0);
    doc.text('Subledger Account Details', pageW / 2, 16, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 136, 96);
    doc.text(`Account: ${accCode}    |    Sub Account: ${subCode}    |    Period: ${period}    |    Printed on: ${today}`, pageW / 2, 21, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const body: any[] = [];
    // Opening Balance header row (mirrors the legacy PDF layout)
    if (this.subledgerOpeningBalance !== 0) {
      body.push(['', '', '', 'Opening Balance',
        this.fmt(this.subledgerOpeningDebit),
        this.fmt(this.subledgerOpeningCredit)]);
    }
    this.filteredSubledgerAccount.forEach(r => body.push([
      r.voucherNumber,
      r.voucherDate ? new Date(r.voucherDate).toLocaleDateString('en-GB') : '',
      r.subAccountCode,
      r.subCodeDescription,
      this.fmt(r.debit || 0),
      this.fmt(r.credit || 0)
    ]));
    body.push(['', '', '', 'Total', this.fmt(this.totalslaDebit), this.fmt(this.totalslaCredit)]);
    body.push(['', '', '', 'Closing Balance',
      this.fmt(this.subledgerClosingDebit),
      this.fmt(this.subledgerClosingCredit)]);

    (doc as any).autoTable({
      startY: 25, margin: { left: 10, right: 10 },
      head: [['Voucher No', 'Date', 'SubAccount', 'Description', 'Debit', 'Credit']],
      body, theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, overflow: 'linebreak', lineColor: [221, 221, 221], lineWidth: 0.2 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 35 }, 1: { cellWidth: 25 },
        2: { cellWidth: 30 }, 3: { cellWidth: 105 },
        4: { cellWidth: 35, halign: 'right' as const },
        5: { cellWidth: 35, halign: 'right' as const }
      },
      didParseCell: (d: any) => {
        if (d.section === 'body' && (d.row.index === body.length - 1 || d.row.index === body.length - 2)) {
          d.cell.styles.fillColor = this.G1; d.cell.styles.textColor = this.WHT; d.cell.styles.fontStyle = 'bold';
          if (d.column.index >= 3) d.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (d: any) => this.addPageNumber(doc, d, pageW)
    });
    doc.save(`SubledgerAccount_${subCode}.pdf`);
  }

  // ── Subledger Account Details Excel ──────────────────────────────────────
  downloadSubledgerAccountExcel(): void {
    if (!this.filteredSubledgerAccount.length) return;
    const accCode = this.selectedAccountCode || '';
    const subCode = this.selectedSubAccountCode || '';
    const period = this.header.get('month')?.value || '';
    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];
    const types: string[] = [];

    aoa.push(['OTTO BILZ (INDIA) PVT. LTD.', '', '', '', '', '']); types.push('company');
    aoa.push([`Subledger Account Details — ${accCode} / ${subCode}    |    Period: ${period}`, '', '', '', '', '']); types.push('title');
    aoa.push(Array(6).fill('')); types.push('blank');
    aoa.push(['Voucher No', 'Date', 'SubAccount', 'Description', 'Debit', 'Credit']); types.push('header');
    if (this.subledgerOpeningBalance !== 0) {
      aoa.push(['', '', '', 'Opening Balance',
        this.subledgerOpeningDebit || null,
        this.subledgerOpeningCredit || null]);
      types.push('gtotal');
    }
    for (const r of this.filteredSubledgerAccount) {
      aoa.push([
        r.voucherNumber,
        r.voucherDate ? new Date(r.voucherDate).toLocaleDateString('en-GB') : '',
        r.subAccountCode, r.subCodeDescription,
        r.debit || null,
        r.credit || null
      ]);
      types.push('data');
    }
    aoa.push(['', '', '', 'Total', this.totalslaDebit, this.totalslaCredit]); types.push('gtotal');
    aoa.push(['', '', '', 'Closing Balance',
      this.subledgerClosingDebit || null,
      this.subledgerClosingCredit || null]); types.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 35 }, { wch: 16 }, { wch: 16 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }
    ];
    this.applyExcelStyles(ws, aoa, types, [4, 5], 6);
    XLSX.utils.book_append_sheet(wb, ws, 'Subledger Account');
    XLSX.writeFile(wb, `SubledgerAccount_${subCode}.xlsx`);
  }

  // ── Bills & Payments PDF ──────────────────────────────────────────────────
  downloadBillsPaymentsPdf(): void {
    if (!this.filteredBillsPayments.length) return;
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const accCode = this.selectedAccountCode || '';
    const subCode = this.selectedSubAccountCode || '';
    const period = this.header.get('month')?.value || '';

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...this.G1);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 10, { align: 'center' });
    doc.setFontSize(11); doc.setTextColor(0, 0, 0);
    doc.text('Open Bills and Payments', pageW / 2, 16, { align: 'center' });
    doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 136, 96);
    doc.text(`Account: ${accCode}    |    Sub Account: ${subCode}    |    Period: ${period}    |    Printed on: ${today}`, pageW / 2, 21, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const body: any[] = this.filteredBillsPayments.map(r => [
      r.nature,
      r.voucherNumber,
      r.voucherDate ? new Date(r.voucherDate).toLocaleDateString('en-GB') : '',
      r.billNo || '',
      r.billNo || '',
      r.billDate ? new Date(r.billDate).toLocaleDateString('en-GB') : '',
      this.fmt(r.billBalance || 0),
      r.voucherNarration || ''
    ]);

    const billsTotal = this.filteredBillsPayments.filter(r => r.nature === 'Bills').reduce((s, r) => s + (Number(r.billBalance) || 0), 0);
    const paymentsTotal = this.filteredBillsPayments.filter(r => r.nature === 'Payments').reduce((s, r) => s + (Number(r.billBalance) || 0), 0);
    body.push(['Bills Total', '', '', '', '', '', this.fmt(billsTotal), '']);
    body.push(['Payments Total', '', '', '', '', '', this.fmt(paymentsTotal), '']);

    (doc as any).autoTable({
      startY: 25, margin: { left: 10, right: 10 },
      head: [['Nature', 'Voucher No', 'Date', 'Inward No', 'Bill No', 'Bill Due Date', 'Balance/Amount', 'Narration']],
      body, theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, overflow: 'linebreak', lineColor: [221, 221, 221], lineWidth: 0.2 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 20 }, 1: { cellWidth: 30 }, 2: { cellWidth: 22 },
        3: { cellWidth: 25 }, 4: { cellWidth: 25 }, 5: { cellWidth: 25 },
        6: { cellWidth: 30, halign: 'right' as const },
        7: { cellWidth: 95 }
      },
      didParseCell: (d: any) => {
        if (d.section === 'body' && (d.row.index === body.length - 1 || d.row.index === body.length - 2)) {
          d.cell.styles.fillColor = this.G1; d.cell.styles.textColor = this.WHT; d.cell.styles.fontStyle = 'bold';
          if (d.column.index === 6) d.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (d: any) => this.addPageNumber(doc, d, pageW)
    });
    doc.save(`BillsPayments_${subCode || accCode}.pdf`);
  }

  // ── Bills & Payments Excel ────────────────────────────────────────────────
  downloadBillsPaymentsExcel(): void {
    if (!this.filteredBillsPayments.length) return;
    const accCode = this.selectedAccountCode || '';
    const subCode = this.selectedSubAccountCode || '';
    const period = this.header.get('month')?.value || '';
    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];
    const types: string[] = [];

    aoa.push(['OTTO BILZ (INDIA) PVT. LTD.', '', '', '', '', '', '', '']); types.push('company');
    aoa.push([`Open Bills and Payments — ${accCode} / ${subCode}    |    Period: ${period}`, '', '', '', '', '', '', '']); types.push('title');
    aoa.push(Array(8).fill('')); types.push('blank');
    aoa.push(['Nature', 'Voucher No', 'Date', 'Inward No', 'Bill No', 'Bill Due Date', 'Balance/Amount', 'Narration']); types.push('header');

    for (const r of this.filteredBillsPayments) {
      aoa.push([
        r.nature,
        r.voucherNumber,
        r.voucherDate ? new Date(r.voucherDate).toLocaleDateString('en-GB') : '',
        r.billNo || '',
        r.billNo || '',
        r.billDate ? new Date(r.billDate).toLocaleDateString('en-GB') : '',
        Number(r.billBalance) || null,
        r.voucherNarration || ''
      ]);
      types.push('data');
    }

    const billsTotal = this.filteredBillsPayments.filter(r => r.nature === 'Bills').reduce((s, r) => s + (Number(r.billBalance) || 0), 0);
    const paymentsTotal = this.filteredBillsPayments.filter(r => r.nature === 'Payments').reduce((s, r) => s + (Number(r.billBalance) || 0), 0);
    aoa.push(['Bills Total', '', '', '', '', '', billsTotal, '']); types.push('gtotal');
    aoa.push(['Payments Total', '', '', '', '', '', paymentsTotal, '']); types.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 40 }];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }
    ];
    this.applyExcelStyles(ws, aoa, types, [6], 8);
    XLSX.utils.book_append_sheet(wb, ws, 'Bills Payments');
    XLSX.writeFile(wb, `BillsPayments_${subCode || accCode}.xlsx`);
  }
}