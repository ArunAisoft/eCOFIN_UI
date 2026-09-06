import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { finalize, takeUntil, switchMap, tap, distinctUntilChanged } from 'rxjs/operators';
import { formatDate } from '@angular/common';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { TdsreportService } from 'src/app/shared/services/reports/tdsreport.service';
import { TrialBalanceService } from 'src/app/shared/services/voucher/trailbalance.service';
import {
  VoucherEntryRow,
  CostProductEntryRow
} from 'src/app/shared/models/trialbalances.models';

declare const jspdf: any;
declare const XLSX: any;

@Component({
  selector: 'app-tdsreport',
  templateUrl: './tdsreport.component.html',
  styleUrls: ['./tdsreport.component.css']
})
export class TdsreportComponent implements OnInit, OnDestroy {

  isLoading = false;
  userName = '';
  today = '';

  filterForm!: FormGroup;
  tdsAccounts: any[] = [];
  reportRows: any[] = [];

  showVoucherPopup = false;
  voucherEntries: VoucherEntryRow[] = [];
  voucherPopupTitle = '';
  voucherPopupDateRaw = '';
  voucherTotalDebit = 0;
  voucherTotalCredit = 0;
  voucherNarration = '';

  showCostProductPopup = false;
  costProductEntries: CostProductEntryRow[] = [];
  costProductGrouped: {
    accountCode: string;
    description: string;
    items: CostProductEntryRow[];
    total: number;
  }[] = [];

  showBillsAdjustedPopup = false;
  billsAdjustedRows: any[] = [];
  billsAdjustedLoading = false;

  private readonly voucherEntriesTrigger$ = new Subject<{ voucherNumber: string; voucherDate: string }>();
  private readonly costProductTrigger$ = new Subject<{ voucherNumber: string }>();
  private readonly destroy$ = new Subject<void>();

  private readonly G1 = [78, 170, 57];
  private readonly WHT = [255, 255, 255];
  private readonly MID = [237, 246, 235];

  constructor(
    private fb: FormBuilder,
    private svc: TdsreportService,
    private trialBalanceSvc: TrialBalanceService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.today = new Date().toISOString().split('T')[0];
    this.buildFilterForm();
    this.setupVoucherStreams();
    this.loadTdsAccounts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  accDisplay = (acc: any) => `${acc.accountCode} — ${acc.description}`;

  buildFilterForm(): void {
    this.filterForm = this.fb.group(
      {
        accountCode: [[], (c: any) => Array.isArray(c.value) && c.value.length > 0 ? null : { required: true }],
        fromDate: [null, Validators.required],
        toDate: [null, Validators.required]
      },
      { validators: this.dateRangeValidator }
    );
  }

  onAccountChange(selected: string[]): void {
    // optional: react to selection changes if needed
    // e.g. reset report when account changes
    if (this.reportRows.length) {
      this.reportRows = [];
    }
  }

  dateRangeValidator(form: FormGroup) {
    const from = form.get('fromDate')?.value;
    const to = form.get('toDate')?.value;
    if (from && to) {
      if (new Date(from) > new Date(to)) {
        form.get('toDate')?.setErrors({ dateInvalid: true });
      } else {
        const errors = form.get('toDate')?.errors;
        if (errors) {
          delete errors['dateInvalid'];
          form.get('toDate')?.setErrors(Object.keys(errors).length ? errors : null);
        }
      }
    }
    return null;
  }

  isInvalid(ctrl: string): boolean {
    const c = this.filterForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.filterForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  loadTdsAccounts(): void {
    this.isLoading = true;
    this.svc.getTdsAccounts()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.tdsAccounts = Array.isArray(resp?.data) ? resp.data : [];
        },
        error: () => this.alertService.error('Failed to load TDS accounts.')
      });
  }

  onRetrieve(): void {
    this.filterForm.markAllAsTouched();
    if (this.filterForm.invalid) return;
    const v = this.filterForm.value;
    const accountCodes: string[] = Array.isArray(v.accountCode) ? v.accountCode : [];  // ← add this line
    this.isLoading = true;
    this.reportRows = [];
    this.svc.getTdsReport({ accountCode: accountCodes.join(','), fromDate: v.fromDate, toDate: v.toDate })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.info(resp?.message || 'No records found.');
            return;
          }
          this.reportRows = Array.isArray(resp?.data) ? resp.data : [];
          this.cdr.detectChanges();
        },
        error: () => this.alertService.error('Failed to retrieve TDS report.')
      });
  }

  onClose(): void {
    this.reportRows = [];
    this.filterForm.reset({
      accountCode: [],      // ← must be [] not null, or multi-select breaks
      fromDate: null,
      toDate: null
    });
    this.filterForm.markAsPristine();
    this.filterForm.markAsUntouched();
  }

  get debitTotal(): number {
    return this.reportRows
      .filter(r => r.dbCrFlag === 'D')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  }

  get creditTotal(): number {
    return this.reportRows
      .filter(r => r.dbCrFlag === 'C')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  }

  openVoucherPopup(vchrNumber: string, vchrDateRaw: string): void {
    if (!vchrNumber) return;
    const dateObj = new Date(vchrDateRaw);
    const dateIso = formatDate(dateObj, 'yyyy-MM-dd', 'en-US');
    this.showVoucherPopup = false;
    this.voucherEntries = [];
    this.cdr.detectChanges();
    this.voucherPopupTitle = vchrNumber;
    this.voucherPopupDateRaw = formatDate(dateObj, 'dd-MM-yyyy', 'en-US');
    this.showVoucherPopup = true;
    this.voucherTotalDebit = 0;
    this.voucherTotalCredit = 0;
    this.voucherNarration = '';
    this.voucherEntriesTrigger$.next({ voucherNumber: vchrNumber, voucherDate: dateIso });
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
    this.trialBalanceSvc.getBillsPaymentsAdjusted(this.voucherPopupTitle)
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

  trackByVoucherEntry = (i: number, row: VoucherEntryRow) => row.ctrlSequenceNo ?? i;
  trackByBillsAdjusted = (i: number, row: any) => row.voucherNumber ?? i;

  private fmt(n: number): string {
    return n === 0
      ? ''
      : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  downloadPdf(): void {
    if (!this.reportRows.length) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const v = this.filterForm.value;
    const period = `${v.fromDate} to ${v.toDate}`;
    const fname = `TDSReport_${v.fromDate}_${v.toDate}.pdf`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('TDS REPORT', pageW / 2, 13, { align: 'center' });
    doc.setFontSize(10);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 136, 96);
    doc.text(`Period: ${period}    |    Printed on: ${today}`, pageW / 2, 24, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const body: any[] = this.reportRows.map(r => [
      r.tdsAccount ?? '',
      r.vchrNumber ?? '',
      r.vchrDate ?? '',
      `${r.subAccountCode ?? ''} - ${r.subAccountCodeDesc ?? ''}`,
      r.dbCrFlag ?? '',
      this.fmt(Number(r.tdsDedAmount) || 0),
      this.fmt(Number(r.tdsAmount) || 0),
      this.fmt(Number(r.billAmount) || 0),
      r.tdsCode ?? '',
      this.fmt(Number(r.amount) || 0),
      r.tdsDescription ?? ''
    ]);

    const grandTotal = this.debitTotal + this.creditTotal;
    body.push(['', '', '', '', '', '', '', '', 'Grand Total', this.fmt(grandTotal), '']);

    (doc as any).autoTable({
      startY: 28,
      margin: { left: 10, right: 10, top: 10, bottom: 10 },
      tableWidth: 277,
      head: [['TDS Account', 'Vchr Number', 'Vchr Date',
        'Sub Account Code & Description', 'Db\\Cr',
        'TDS Ded Amt', 'TDS Amt', 'Bill Amt',
        'TDS Code', 'Amount', 'TDS Description']],
      body,
      theme: 'grid',
      styles: {
        fontSize: 7,
        cellPadding: { top: 1, bottom: 1, left: 2, right: 2 },
        overflow: 'linebreak',
        textColor: [30, 30, 30],
        lineColor: [221, 221, 221],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: this.G1,
        textColor: this.WHT,
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 22 },
        2: { cellWidth: 18 },
        3: { cellWidth: 55 },
        4: { cellWidth: 12 },
        5: { cellWidth: 22, halign: 'right' as const },
        6: { cellWidth: 20, halign: 'right' as const },
        7: { cellWidth: 20, halign: 'right' as const },
        8: { cellWidth: 18 },
        9: { cellWidth: 22, halign: 'right' as const },
        10: { cellWidth: 46 }
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        const isLast = data.row.index === body.length - 1;
        if (isLast) {
          data.cell.styles.fillColor = this.G1;
          data.cell.styles.textColor = this.WHT;
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 8 || data.column.index === 9)
            data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 136, 96);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageW - 15,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'right' }
        );
        doc.setTextColor(0, 0, 0);
      }
    });

    doc.save(fname);
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

    body.push([
      'Voucher Totals', '',
      this.fmt(this.voucherTotalDebit),
      this.fmt(this.voucherTotalCredit)
    ]);

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
      headStyles: {
        fillColor: this.G1,
        textColor: this.WHT,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30, halign: 'right' as const },
        3: { cellWidth: 30, halign: 'right' as const }
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        const isLast = data.row.index === body.length - 1;
        if (isLast) {
          data.cell.styles.fillColor = this.G1;
          data.cell.styles.textColor = this.WHT;
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index >= 1) data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 136, 96);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageW - 15,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'right' }
        );
        doc.setTextColor(0, 0, 0);
      }
    });

    if (this.voucherNarration) {
      const y = (doc as any).lastAutoTable.finalY + 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(45, 106, 45);
      doc.text('Narration: ', 10, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
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

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Bills/Payments Adjusted — ${this.voucherPopupTitle}`, pageW / 2, 13, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 136, 96);
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

    const grandTotal = this.billsAdjustedRows
      .reduce((s, r) => s + (Number(r.billAdjustedAmount) || 0), 0);
    body.push(['', '', '', '', '', 'Grand Total', this.fmt(grandTotal)]);

    (doc as any).autoTable({
      startY: 23,
      margin: { left: 10, right: 10, top: 10, bottom: 10 },
      head: [['Voucher Number', 'Voucher Date', 'Reference Number',
        'Reference Date', 'Bill Number', 'Bill Date', 'Bill Adjusted Amount']],
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
      headStyles: {
        fillColor: this.G1,
        textColor: this.WHT,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 28 },
        2: { cellWidth: 38 },
        3: { cellWidth: 28 },
        4: { cellWidth: 35 },
        5: { cellWidth: 28 },
        6: { cellWidth: 35, halign: 'right' as const }
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        const isLast = data.row.index === body.length - 1;
        if (isLast) {
          data.cell.styles.fillColor = this.G1;
          data.cell.styles.textColor = this.WHT;
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index >= 5) data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 136, 96);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageW - 15,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'right' }
        );
        doc.setTextColor(0, 0, 0);
      }
    });

    doc.save(`BillsAdjusted_${this.voucherPopupTitle}.pdf`);
  }

  downloadCostProductPdf(): void {
    if (!this.costProductEntries.length) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Cost / Product Entries', pageW / 2, 13, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 136, 96);
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
        body.push([
          `${item.costCentreCode}    ${item.costCentreDescription}`,
          this.fmt(item.voucherAmount || 0)
        ]);
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
      headStyles: {
        fillColor: this.G1,
        textColor: this.WHT,
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: { 0: { cellWidth: 130 }, 1: { cellWidth: 50, halign: 'right' as const } },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        const meta = rowMeta[data.row.index];
        if (meta === 'acctotal') {
          data.cell.styles.fillColor = this.MID;
          data.cell.styles.fontStyle = 'bold';
          if (data.column.index === 0) data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 136, 96);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageW - 15,
          doc.internal.pageSize.getHeight() - 5,
          { align: 'right' }
        );
        doc.setTextColor(0, 0, 0);
      }
    });

    doc.save(`CostProduct_${this.voucherPopupTitle}.pdf`);
  }

  private applyExcelStyles(
    ws: any,
    aoaRows: any[][],
    rowTypes: string[],
    numCols: number[],
    totalCols: number
  ): void {
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

        if (isNum && val !== null && val !== '' && !isNaN(Number(val))) {
          ws[addr].t = 'n';
          ws[addr].v = Number(val);
        }

        switch (type) {
          case 'title':
            ws[addr].s = {
              font: { bold: true, sz: 13 },
              alignment: { horizontal: 'center', vertical: 'center' }
            };
            break;

          case 'header':
            ws[addr].s = {
              font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: G1hex } },
              alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
              border: BDR
            };
            break;

          case 'data':
            ws[addr].s = isNum
              ? { font: { sz: 9 }, alignment: { horizontal: 'right' }, numFmt: NUM, border: BDR }
              : { font: { sz: 9 }, border: BDR };
            break;

          case 'vtotal':
            ws[addr].s = isNum
              ? {
                font: { bold: true, sz: 9 },
                fill: { fgColor: { rgb: MIDhex } },
                alignment: { horizontal: 'right' },
                numFmt: NUM,
                border: BDR
              }
              : {
                font: { bold: true, sz: 9 },
                fill: { fgColor: { rgb: MIDhex } },
                border: BDR
              };
            break;

          case 'gtotal':
            ws[addr].s = isNum
              ? {
                font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: G1hex } },
                alignment: { horizontal: 'right' },
                numFmt: NUM,
                border: BDR
              }
              : {
                font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: G1hex } },
                border: BDR
              };
            break;
        }
      }
    });
  }


  downloadExcel(): void {
    if (!this.reportRows.length) return;

    const v = this.filterForm.value;
    const wb = XLSX.utils.book_new();
    const aoaRows: any[][] = [];
    const rowTypes: string[] = [];

    aoaRows.push(['OTTO BILZ (INDIA) PVT. LTD.', ...Array(11).fill('')]);
    rowTypes.push('title');

    aoaRows.push([`TDS REPORT — ${v.fromDate} TO ${v.toDate}`, ...Array(11).fill('')]);
    rowTypes.push('title');

    aoaRows.push(Array(12).fill(''));
    rowTypes.push('blank');

    aoaRows.push(['TDS Account', 'Vchr Number', 'Vchr Date', 'Sub Account Code', 'Sub Account Description', 'Db\\Cr Flag', 'TDS Ded Amount', 'TDS Amount', 'Bill Amount', 'TDS Code', 'Amount', 'TDS Description']);
    rowTypes.push('header');

    for (const r of this.reportRows) {
      aoaRows.push([
        r.tdsAccount ?? '',
        r.vchrNumber ?? '',
        r.vchrDate ?? '',
        r.subAccountCode ?? '',
        r.subAccountCodeDesc ?? '',
        r.dbCrFlag ?? '',
        Number(r.tdsDedAmount) || null,
        Number(r.tdsAmount) || null,
        Number(r.billAmount) || null,
        r.tdsCode ?? '',
        Number(r.amount) || null,
        r.tdsDescription ?? ''
      ]);
      rowTypes.push('data');
    }

    aoaRows.push([
      ...Array(10).fill(''),
      this.debitTotal + this.creditTotal,
      'Grand Total'
    ]);
    rowTypes.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);
    ws['!cols'] = [
      { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 28 },
      { wch: 10 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 12 },
      { wch: 14 }, { wch: 28 }
    ];
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }
    ];

    this.applyExcelStyles(ws, aoaRows, rowTypes, [6, 7, 8, 10], 12);
    XLSX.utils.book_append_sheet(wb, ws, 'TDS Report');
    XLSX.writeFile(wb, `TDSReport_${v.fromDate}_${v.toDate}.xlsx`);
  }

  downloadVoucherExcel(): void {
    if (!this.voucherEntries.length) return;

    const wb = XLSX.utils.book_new();
    const aoaRows: any[][] = [];
    const rowTypes: string[] = [];

    aoaRows.push([
      `Voucher Details — ${this.voucherPopupTitle} dated ${this.voucherPopupDateRaw}`,
      '', '', ''
    ]);
    rowTypes.push('title');

    aoaRows.push(Array(4).fill(''));
    rowTypes.push('blank');

    aoaRows.push(['Account Description / Line Particulars', 'Inst. No / Date', 'Debit', 'Credit']);
    rowTypes.push('header');

    for (const e of this.voucherEntries) {
      aoaRows.push([
        [
          e.accountCode, e.description, e.lineDetails,
          e.subAccountCode ? `${e.subAccountCode} : ${e.subCodeDescription}` : ''
        ].filter(Boolean).join(' | '),
        [
          e.instrumentNo ?? '',
          e.instrumentDate ? new Date(e.instrumentDate).toLocaleDateString('en-GB') : ''
        ].filter(Boolean).join(' / '),
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

    const grandTotal = this.billsAdjustedRows
      .reduce((s, r) => s + (Number(r.billAdjustedAmount) || 0), 0);
    aoaRows.push(['', '', '', '', '', 'Grand Total', grandTotal]);
    rowTypes.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);
    ws['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 20 },
      { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 22 }
    ];
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
        aoaRows.push([
          grp.accountCode,
          grp.description,
          item.costCentreCode || '',
          item.costCentreDescription || '',
          item.voucherAmount || null
        ]);
        rowTypes.push('data');
      }

      aoaRows.push(['', '', '', 'Account Total', grp.total]);
      rowTypes.push('vtotal');
    }

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);
    ws['!cols'] = [
      { wch: 16 }, { wch: 30 }, { wch: 18 }, { wch: 30 }, { wch: 16 }
    ];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

    this.applyExcelStyles(ws, aoaRows, rowTypes, [4], 5);
    XLSX.utils.book_append_sheet(wb, ws, 'Cost Product');
    XLSX.writeFile(wb, `CostProduct_${this.voucherPopupTitle}.xlsx`);
  }

  private setupVoucherStreams(): void {
    this.voucherEntriesTrigger$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((prev, curr) =>
        prev.voucherNumber === curr.voucherNumber &&
        prev.voucherDate === curr.voucherDate
      ),
      tap(() => (this.isLoading = true)),
      switchMap(({ voucherNumber, voucherDate }) =>
        this.trialBalanceSvc.getVoucherEntries(voucherNumber, voucherDate).pipe(
          finalize(() => (this.isLoading = false))
        )
      )
    ).subscribe({
      next: (res) => {
        this.voucherEntries = Array.isArray(res.data) ? res.data as VoucherEntryRow[] : [];
        this.voucherTotalDebit = this.sumField(this.voucherEntries, 'debit');
        this.voucherTotalCredit = this.sumField(this.voucherEntries, 'credit');
        const ne = this.voucherEntries.find(e => !!e.voucherNarration);
        this.voucherNarration = ne?.voucherNarration || '';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.handleError(err);
        this.showVoucherPopup = false;
      }
    });

    this.costProductTrigger$.pipe(
      takeUntil(this.destroy$),
      tap(() => (this.isLoading = true)),
      switchMap(({ voucherNumber }) =>
        this.trialBalanceSvc.getCostProductEntries(voucherNumber).pipe(
          finalize(() => (this.isLoading = false))
        )
      )
    ).subscribe({
      next: (res) => {
        this.costProductEntries = Array.isArray(res.data) ? res.data as CostProductEntryRow[] : [];
        this.costProductGrouped = this.groupCostProductEntries(this.costProductEntries);
        this.showCostProductPopup = true;
        this.cdr.markForCheck();
      },
      error: (err) => this.handleError(err)
    });
  }

  private sumField(rows: any[], field: string): number {
    return rows.reduce((s, r) => s + (r[field] || 0), 0);
  }

  private groupCostProductEntries(entries: CostProductEntryRow[]) {
    const map = new Map<string, {
      accountCode: string;
      description: string;
      items: CostProductEntryRow[];
      total: number;
    }>();

    for (const e of entries) {
      const key = e.accountCode || '';
      if (!map.has(key)) {
        map.set(key, { accountCode: key, description: e.description || '', items: [], total: 0 });
      }
      const g = map.get(key)!;
      g.items.push(e);
      g.total += e.voucherAmount || 0;
    }
    return Array.from(map.values());
  }

  private handleError(err: any): void {
    console.error(err);
    this.alertService.error(err?.message || 'An error occurred.');
    this.isLoading = false;
    this.cdr.markForCheck();
  }
}