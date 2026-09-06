import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { AccountingCalendarService } from 'src/app/shared/services/master/accountingcalendar.service';
import { FinancialYearDto, AccountingPeriodDto, AccountingPeriodCreateModel } from 'src/app/shared/models/accountingcalendar.models';
import { finalize } from 'rxjs/operators';
import { forkJoin } from 'rxjs';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { ChangeDetectorRef } from '@angular/core';

@Component({
    selector: 'app-accountingcalendar',
    templateUrl: './accountingcalendar.component.html'
})
export class AccountingCalendarComponent implements OnInit {
    userName: string = '';
    isLoading = false;
    selectedTab = 'nav-FYAprMar';
    fyAM: FinancialYearDto[] = [];
    fyJD: FinancialYearDto[] = [];
    months: AccountingPeriodDto[] = [];
    editingSequence: Record<string, boolean> = {};

    formAM!: FormGroup;
    formJD!: FormGroup;
    formMonth!: FormGroup;

    monthsList = [
        { value: '01', label: 'JANUARY' }, { value: '02', label: 'FEBRUARY' },
        { value: '03', label: 'MARCH' }, { value: '04', label: 'APRIL' },
        { value: '05', label: 'MAY' }, { value: '06', label: 'JUNE' },
        { value: '07', label: 'JULY' }, { value: '08', label: 'AUGUST' },
        { value: '09', label: 'SEPTEMBER' }, { value: '10', label: 'OCTOBER' },
        { value: '11', label: 'NOVEMBER' }, { value: '12', label: 'DECEMBER' }
    ];

    constructor(
        private fb: FormBuilder,
        private svc: AccountingCalendarService,
        private alertService: AlertService,
        private cd: ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        window.scrollTo(0, 0);
        const userName = localStorage.getItem('userName');
        if (userName) this.userName = userName;
        this.buildForms();
        this.loadAllFinancialYears();
    }

    buildForms(): void {
        this.formAM = this.fb.group(
            {
                financialYear: [null, [Validators.required, Validators.pattern(/^\d{4}$/)]],
                fromDate: [null, Validators.required],
                toDate: [null, Validators.required]
            },
            { validators: this.dateRangeValidator('fromDate', 'toDate') }
        );

        this.formJD = this.fb.group(
            {
                financialYear: [null, [Validators.required, Validators.pattern(/^\d{4}$/)]],
                fromDate: [null, Validators.required],
                toDate: [null, Validators.required]
            },
            { validators: this.dateRangeValidator('fromDate', 'toDate') }
        );

        this.formMonth = this.fb.group(
            {
                selectedFinancialYear: [null, Validators.required],
                selectedMonth: ['00', [Validators.required, this.monthSelectedValidator]],
                fromDate: [null, Validators.required],
                toDate: [null, Validators.required]
            },
            { validators: this.dateRangeValidator('fromDate', 'toDate') }
        );
    }

    private monthSelectedValidator(control: AbstractControl) {
        const val = control.value;
        if (!val || val === '00') {
            return { monthNotSelected: true };
        }
        return null;
    }

    private dateRangeValidator(fromKey: string, toKey: string) {
        return (group: AbstractControl) => {
            const from = group.get(fromKey)?.value;
            const to = group.get(toKey)?.value;
            if (from && to && new Date(to) < new Date(from)) {
                return { dateRangeInvalid: true };
            }
            return null;
        };
    }

    isInvalid(form: FormGroup, controlName: string): boolean {
        const c = form.get(controlName);
        return !!c && c.invalid && (c.touched || c.dirty);
    }

    hasError(form: FormGroup, controlName: string, errorKey: string): boolean {
        const c = form.get(controlName);
        return !!c && c.hasError(errorKey) && (c.touched || c.dirty);
    }

    formHasDateRangeError(form: FormGroup): boolean {
        return (
            form.hasError('dateRangeInvalid') &&
            !!(form.get('fromDate')?.touched || form.get('toDate')?.touched)
        );
    }

    private resetForm(form: FormGroup, defaultValues: any = {}): void {
        form.reset(defaultValues);
        form.markAsPristine();
        form.markAsUntouched();
    }

    setActiveTab(tabId: string): void {
        this.selectedTab = tabId;
        this.resetForm(this.formAM);
        this.resetForm(this.formJD);
        if (tabId === 'nav-FYMonths') {
            const latestFY = this.fyJD?.length ? Math.max(...this.fyJD.map(x => Number(x.financialYear))).toString() : null;
            this.resetForm(this.formMonth, { selectedFinancialYear: latestFY, selectedMonth: '00' });
            if (latestFY) {
                this.loadMonths(latestFY);
            }
        } else {
            this.resetForm(this.formMonth, { selectedMonth: '00' });
        }
    }

    loadAllFinancialYears(): void {
        this.isLoading = true;
        forkJoin({ fyJDResp: this.svc.getFinancialYears(), fyAMResp: this.svc.getFinancialYears2() })
            .pipe(finalize(() => (this.isLoading = false)))
            .subscribe({
                next: ({ fyAMResp, fyJDResp }: any) => {

                    if (fyAMResp?.success === false) {
                        this.fyAM = [];
                        this.alertService.info(fyAMResp?.message || 'No Financial Years found.');
                    } else {
                        this.fyAM = Array.isArray(fyAMResp?.data) ? fyAMResp.data : [];
                    }

                    if (fyJDResp?.success === false) {
                        this.fyJD = [];
                        this.alertService.info(fyJDResp?.message || 'No Financial Years found.');
                    } else {
                        this.fyJD = Array.isArray(fyJDResp?.data) ? fyJDResp.data : [];
                    }

                    if (this.fyJD?.length) {
                        const latestFY = Math.max(...this.fyJD.map(x => Number(x.financialYear))).toString();
                        this.cd.detectChanges();
                        this.formMonth.patchValue({ selectedFinancialYear: latestFY });
                        this.loadMonths(latestFY);
                    }
                },
                error: (err) => this.alertService.error(err)
            });
    }

    onSaveAM(): void {
        this.formAM.markAllAsTouched();
        if (this.formAM.invalid) {
            if (this.formAM.hasError('dateRangeInvalid')) {
                this.alertService.warning('To Date must be greater than or equal to From Date.');
            }
            return;
        }

        const v = this.formAM.value;
        const year = parseInt(v.financialYear, 10);
        const nextYearShort = (year + 1).toString().slice(-2);
        const formattedFY = `${year}-${nextYearShort}`;
        const payload = {
            financialYear: year.toString(),
            fromDate: v.fromDate as string,
            toDate: v.toDate as string,
            description: 'Financial Year-' + formattedFY,
            accPeriod: this.toAccPeriodFromIso(v.fromDate),
            location: 'BILZ',
            username: this.userName
        };

        this.isLoading = true;
        this.svc.createFinancialYear2(payload)
            .pipe(finalize(() => (this.isLoading = false)))
            .subscribe({
                next: (resp: any) => {
                    if (resp?.success === false) {
                        this.alertService.warning(resp?.message || 'Failed to save.');
                        return;
                    }
                    this.alertService.success(resp?.message || 'Successfully saved');
                    this.clearAM();
                    this.loadAllFinancialYears();
                },
                error: () => this.alertService.error('Failed to save Financial Year.')
            });
    }

    clearAM(): void {
        this.formAM.reset();
        this.formAM.markAsPristine();
        this.formAM.markAsUntouched();
    }

    onSaveJD(): void {
        this.formJD.markAllAsTouched();
        if (this.formJD.invalid) {
            if (this.formJD.hasError('dateRangeInvalid')) {
                this.alertService.warning('To Date must be greater than or equal to From Date.');
            }
            return;
        }

        const v = this.formJD.value;
        const year = parseInt(v.financialYear, 10);
        const payload = {
            financialYear: year.toString(),
            fromDate: v.fromDate as string,
            toDate: v.toDate as string,
            description: 'Financial Year - ' + year.toString(),
            accPeriod: this.toAccPeriodFromIso(v.fromDate),
            location: 'BILZ',
            username: this.userName
        };

        this.isLoading = true;
        this.svc.createFinancialYear(payload)
            .pipe(finalize(() => (this.isLoading = false)))
            .subscribe({
                next: (resp: any) => {
                    if (resp?.success === false) {
                        this.alertService.warning(resp?.message || 'Failed to save.');
                        return;
                    }
                    this.alertService.success(resp?.message || 'Successfully saved');
                    this.clearJD();
                    this.loadAllFinancialYears();
                },
                error: () => this.alertService.error('Failed to save Financial Year.')
            })
    }

    clearJD(): void {
        this.formJD.reset();
        this.formJD.markAsPristine();
        this.formJD.markAsUntouched();
    }

    onMonthYearChange(): void {
        const fy = this.formMonth.get('selectedFinancialYear')?.value as string | null;
        this.formMonth.patchValue({ selectedMonth: '00', fromDate: null, toDate: null }, { emitEvent: false });
        ['selectedMonth', 'fromDate', 'toDate'].forEach(ctrl => {
            this.formMonth.get(ctrl)?.markAsPristine();
            this.formMonth.get(ctrl)?.markAsUntouched();
        });

        if (fy) this.loadMonths(fy);
    }

    loadMonths(financialYear: string): void {
        if (!financialYear) { this.months = []; return; }

        this.isLoading = true;
        this.svc.getPeriodsByYear(financialYear)
            .pipe(finalize(() => (this.isLoading = false)))
            .subscribe({
                next: (resp: any) => {
                    if (resp?.success === false) {
                        this.months = [];
                        this.alertService.info(resp?.message || 'No accounting periods found.');
                        return;
                    }

                    const list = Array.isArray(resp?.data) ? resp.data : [];
                    this.months = list;
                },
                error: () => this.alertService.error('Failed to load accounting periods.')
            });
    }

    onMonthSelect(monthValue: string): void {
        this.formMonth.get('selectedMonth')?.setValue(monthValue);
        if (!monthValue || monthValue === '00') {
            this.formMonth.patchValue({ fromDate: null, toDate: null }, { emitEvent: false });
            return;
        }

        const fy = this.formMonth.get('selectedFinancialYear')?.value as string | null;
        const year = parseInt(fy ?? '0', 10);
        const month = parseInt(monthValue, 10);

        if (year && month) {
            const start = new Date(Date.UTC(year, month - 1, 1));
            const end = new Date(Date.UTC(year, month, 0));
            this.formMonth.patchValue(
                { fromDate: this.toIsoDate(start), toDate: this.toIsoDate(end) },
                { emitEvent: false }
            );
        }
    }

    onSaveMonth(): void {
        this.formMonth.markAllAsTouched();

        if (this.formMonth.invalid) {
            if (this.formMonth.hasError('dateRangeInvalid')) {
                this.alertService.warning('To Date must be greater than or equal to From Date.');
            }
            return;
        }

        const v = this.formMonth.value as {
            selectedFinancialYear: string;
            selectedMonth: string;
            fromDate: string;
            toDate: string;
        };

        const sequenceNum = `${v.selectedFinancialYear}${v.selectedMonth.padStart(2, '0')}`;
        const monthLabel = this.monthsList.find(m => m.value === v.selectedMonth)?.label ?? '';
        const desc = monthLabel.substring(0, 3) + ' - ' + v.selectedFinancialYear;

        const payload: AccountingPeriodCreateModel = {
            financialYear: v.selectedFinancialYear,
            accPeriod: desc,
            accmonth: monthLabel.substring(0, 3),
            periodfrom: v.fromDate,
            periodto: v.toDate,
            sequence: sequenceNum,
            accyear: v.selectedFinancialYear
        };

        this.isLoading = true;
        this.svc.saveOrUpdatePeriod(payload)
            .pipe(finalize(() => (this.isLoading = false)))
            .subscribe({
                next: (resp: any) => {
                    if (!resp?.success) {
                        this.alertService.warning(resp?.message || 'Failed to save.');
                        return;
                    }

                    this.alertService.success(resp?.message || 'Saved successfully');
                    this.clearMonthFields();
                    this.loadMonths(v.selectedFinancialYear);
                },
                error: () => this.alertService.error('Failed to save accounting period.')
            });
    }

    clearMonthFields(): void {
        const latestFY = this.fyJD?.length ? Math.max(...this.fyJD.map(x => Number(x.financialYear))).toString() : null;
        ['selectedFinancialYear', 'selectedMonth', 'fromDate', 'toDate']
            .forEach(ctrl => {
                this.formMonth.get(ctrl)?.markAsPristine();
                this.formMonth.get(ctrl)?.markAsUntouched();
            });

        if (latestFY) {
            this.formMonth.get('selectedFinancialYear')?.setValue(latestFY);
            this.loadMonths(latestFY);
        }
    }

    private toIsoDate(d: Date): string {
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(d.getUTCDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    private toAccPeriodFromIso(iso: string): string {
        const dt = new Date(iso);
        return dt.toLocaleString('en-US', { month: 'short' }).toUpperCase() + ' - ' + dt.getFullYear();
    }
}