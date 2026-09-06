import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin, Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { CommonService } from 'src/app/shared/services/voucher/common.service';
import { normalizeResponse } from 'src/app/shared/utils/normalize-response.service';
import { ApiResponse } from 'src/app/shared/models/api-response.model';
import { FinancialYearsWithPeriodsModel, BillPendingDetailsModel, BanksAndAccountsModel, BankAccountModel, PaymentPendingDetailsModel, BillPaymentAdjustmentRequest, PaymentAdjustmentDto } from 'src/app/shared/models/common.models';

@Component({
  selector: 'app-debitadjustment',
  templateUrl: './debitadjustment.component.html',
  styleUrls: ['./debitadjustment.component.css']
})
export class DebitAdjustmentComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  form!: FormGroup;
  years: FinancialYearsWithPeriodsModel[] = [];
  months: any[] = [];

  banks: BanksAndAccountsModel[] = [];
  bankAccounts: BankAccountModel[] = [];
  billList: BillPendingDetailsModel[] = [];
  paymentList: PaymentPendingDetailsModel[] = [];

  userName = '';
  isLoading = false;

  showUnadjustedPayments = false;
  selectedBillVoucherNo: string | null | undefined = null;
  selectedBillOnholdNo: string | null | undefined = null;
  selectedBillBalance = 0;
  billSequenceNo = 0;

  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  bankLabel = (b: BanksAndAccountsModel | null): string => b ? `${b.bankCode} → ${b.bankName || 'Unknown'}` : 'Unknown';
  accountLabel = (a: BankAccountModel | null): string => a ? `${a.accountCode} → ${a.accountName || 'Unknown'}` : 'Unknown';

  simpleCodeName(a: any): string { return a ? `${a.code} → ${a.name || 'Unknown'}` : 'Unknown'; }
  simpleName(x: any): string { return x?.name || 'Unknown'; }

  constructor(
    private fb: FormBuilder,
    private commonService: CommonService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    window.scrollTo(0, 0);
    this.userName = localStorage.getItem('userName') || '';

    this.buildForm();
    this.loadDropdownData();

    this.header.get('bank')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.onBankChange());
    this.header.get('bankAccount')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(v => v && this.onBankAccountChange());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  sortBillTable(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.billList.sort((a: any, b: any) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return this.sortDirection === 'asc' ? -1 : 1;
      if (bVal == null) return this.sortDirection === 'asc' ? 1 : -1;

      if (!isNaN(aVal) && !isNaN(bVal)) { return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal; }

      if (Date.parse(aVal) && Date.parse(bVal)) {
        return this.sortDirection === 'asc' ? new Date(aVal).getTime() - new Date(bVal).getTime() : new Date(bVal).getTime() - new Date(aVal).getTime();
      }

      const aStr = aVal.toString().toLowerCase();
      const bStr = bVal.toString().toLowerCase();

      if (aStr < bStr) return this.sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  sortPaymentTable(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.paymentList.sort((a: any, b: any) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return this.sortDirection === 'asc' ? -1 : 1;
      if (bVal == null) return this.sortDirection === 'asc' ? 1 : -1;

      if (!isNaN(aVal) && !isNaN(bVal)) { return this.sortDirection === 'asc' ? aVal - bVal : bVal - aVal; }

      if (Date.parse(aVal) && Date.parse(bVal)) {
        return this.sortDirection === 'asc' ? new Date(aVal).getTime() - new Date(bVal).getTime() : new Date(bVal).getTime() - new Date(aVal).getTime();
      }

      const aStr = aVal.toString().toLowerCase();
      const bStr = bVal.toString().toLowerCase();

      if (aStr < bStr) return this.sortDirection === 'asc' ? -1 : 1;
      if (aStr > bStr) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  buildForm(): void {
    this.form = this.fb.group({
      header: this.fb.group({
        year: [{ value: null, disabled: true }, Validators.required],
        month: [{ value: null, disabled: true }, Validators.required],
        bank: [null, Validators.required],
        bankAccount: [null, Validators.required]
      })
    });
  }

  get header(): FormGroup { return this.form.get('header') as FormGroup; }
  get isSubAccountSelected(): boolean { return !!this.header.get('bankAccount')?.value; }

  loadDropdownData(): void {
    this.isLoading = true;
    forkJoin({
      years: normalizeResponse<any[]>(this.commonService.getYearList(), 'Financial Year list'),
      banks: normalizeResponse<any[]>(this.commonService.getAllDebitAccountsVouchers(this.userName, 'SALV'), 'Group Account')
    })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: res => {
          this.years = res.years?.data || [];
          this.banks = res.banks?.data || [];

          if (this.years.length) {
            this.header.get('year')?.setValue(this.years[0].financialyear);
            this.onYearChange();
          }
        },
        error: () => this.alertService.error('Failed to load dropdown data')
      });
  }

  onYearChange(): void {
    const fy = this.years.find(y => y.financialyear === this.header.get('year')?.value);
    this.months = fy?.periods || [];

    if (!this.months.length) return;

    const currentMonth = new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const matched = this.months.find(m => m.accmonth?.slice(0, 3).toUpperCase() === currentMonth);
    this.header.get('month')?.setValue(matched?.accperiod || this.months[0].accperiod);
    this.resetAllLists();
  }

  onMonthChange(): void {
    this.resetAllLists();
  }

  onBankChange(): void {
    const bankCode = this.header.get('bank')?.value;
    const bank = this.banks.find(b => b.bankCode === bankCode);

    this.bankAccounts = bank?.bankAccounts || [];

    const bankAccountCtrl = this.header.get('bankAccount');
    bankAccountCtrl?.reset(null, { emitEvent: false });
    bankAccountCtrl?.setValidators(Validators.required);
    bankAccountCtrl?.updateValueAndValidity({ emitEvent: false });

    this.resetAllLists();
  }

  onBankAccountChange(): void {
    this.resetAllLists();
    this.loadOutstandingBills();
  }

  loadOutstandingBills(): void {
    if (this.header.invalid || !this.isSubAccountSelected) return;

    const accountCode = this.header.get('bank')?.value;
    const subAccountCode = this.header.get('bankAccount')?.value;
    this.isLoading = true;
    normalizeResponse<{ billDetails: BillPendingDetailsModel[]; paymentDetails: PaymentPendingDetailsModel[]; }>(this.commonService.getBillAndPaymentDetails(accountCode, subAccountCode), 'Outstanding Bills')
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (res: ApiResponse<any>) => {
          this.billList = res.data?.billDetails ?? [];

          this.paymentList = (res.data?.paymentDetails ?? []).map((p: any) => ({
            ...p,
            acceptedAmount: null,
            originalBalanceAmount: Number(p.balanceAmount || 0),
            originalAmountAdjusted: Number(p.amountAdjusted || 0)
          }));
        },
        error: () => {
          this.billList = [];
          this.paymentList = [];
          this.alertService.error('Failed to load outstanding bills');
        }
      });
  }

  onVoucherRowClick(item: BillPendingDetailsModel): void {
    this.selectedBillVoucherNo = item.voucherNo;
    this.selectedBillOnholdNo = item.ctrlOnHoldNo;
    this.selectedBillBalance = Number(item.balanceAmount || 0);
    this.billSequenceNo = Number(item.ctrlSequenceNo || 0);
    this.showUnadjustedPayments = true;
    this.paymentList.forEach(p => (p.acceptedAmount = null));
  }

  private getTotalAccepted(excludeItem?: any): number {
    return this.paymentList.filter(p => p !== excludeItem).reduce((sum, p) => sum + Number(p.acceptedAmount || 0), 0);
  }

  onPaymentInputChange(e: Event, item: any): void {
    const value = (e.target as HTMLInputElement).value;
    const accepted = value ? Number(value.replace(/,/g, '')) : 0;
    item.acceptedAmount = accepted > 0 ? accepted : null;
    item.amountAdjusted = item.originalAmountAdjusted + (item.acceptedAmount || 0);
    item.balanceAmount = item.originalBalanceAmount - (item.acceptedAmount || 0);
  }

  onPaymentAcceptedBlur(item: any): void {
    let accepted = Number(item.acceptedAmount || 0);

    const paymentBalance = item.originalBalanceAmount;
    const alreadyAccepted = this.getTotalAccepted(item);
    const remainingBillBalance = Math.max(this.selectedBillBalance - alreadyAccepted, 0);
    const maxAllowed = Math.min(paymentBalance, remainingBillBalance);
    accepted = Math.min(Math.max(accepted, 0), maxAllowed);
    item.acceptedAmount = accepted || null;
    item.amountAdjusted = item.originalAmountAdjusted + (item.acceptedAmount || 0);
    item.balanceAmount = item.originalBalanceAmount - (item.acceptedAmount || 0);
  }

  get remainingBillBalance(): number {
    const totalAccepted = this.getTotalAccepted();
    return Math.max(this.selectedBillBalance - totalAccepted, 0);
  }

  private resetAllLists(): void {
    this.billList = [];
    this.paymentList = [];
    this.showUnadjustedPayments = false;
    this.selectedBillVoucherNo = null;
    this.selectedBillOnholdNo = null;
  }

  onSaveAdjustment(): void {
    const adjustedPayments: PaymentAdjustmentDto[] = this.paymentList
      .filter(p => Number(p.acceptedAmount) > 0)
      .map(p => ({
        voucherNo: String(p.voucherNo),
        onHoldNo: String(p.ctrlOnHoldNo),
        sequenceNo: Number(p.ctrlSequenceNo),
        amountAdjusted: (p.originalAmountAdjusted ?? 0) + (p.acceptedAmount ?? 0),
        balanceAmount: (p.originalBalanceAmount ?? 0) - (p.acceptedAmount ?? 0)
      }));

    if (!adjustedPayments.length) {
      this.alertService.warning('Please adjust at least one payment');
      return;
    }

    const billAmount = Number(this.billList[0]?.billAmount ?? 0);

    const payload: BillPaymentAdjustmentRequest = {
      bill: {
        voucherNo: String(this.selectedBillVoucherNo),
        onHoldNo: String(this.selectedBillOnholdNo),
        sequenceNo: Number(this.billSequenceNo),
        balanceAmount: this.remainingBillBalance,
        amountAdjusted: billAmount - this.remainingBillBalance
      },
      payments: adjustedPayments
    };

    this.isLoading = true;
    this.commonService.saveBillAndPaymentAdjustment(payload)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          this.alertService.success('Adjustment saved successfully');
          this.loadOutstandingBills();
          this.showUnadjustedPayments = false;
        },
        error: () => this.alertService.error('Failed to save adjustment')
      });
  }
}
