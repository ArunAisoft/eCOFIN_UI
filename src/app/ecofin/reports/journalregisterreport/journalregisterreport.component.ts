import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { JournalReportService } from 'src/app/shared/services/reports/journalregisterreport.service';
import { CommonService } from 'src/app/shared/services/voucher/common.service';
import { FinancialYearsWithPeriodsModel } from 'src/app/shared/models/common.models';

declare const jspdf: any;
declare const XLSX: any;

export interface JournalVoucherGroup {
  voucherDate: string;
  voucherNumber: string;
  onHoldNo: string;
  narration: string;
  rows: any[];
  debitTotal: number;
  creditTotal: number;
}

@Component({
  selector: 'app-journalregisterreport',
  templateUrl: './journalregisterreport.component.html',
  styleUrls: ['./journalregisterreport.component.css']
})
export class JournalregisterreportComponent implements OnInit {

  isLoading = false;
  filterForm!: FormGroup;
  voucherGroups: JournalVoucherGroup[] = [];
  accPeriodLabel = '';

  years: FinancialYearsWithPeriodsModel[] = [];
  months: any[] = [];

  private readonly G1 = [78, 170, 57];
  private readonly WHT = [255, 255, 255];
  private readonly MID = [237, 246, 235];

  constructor(
    private fb: FormBuilder,
    private svc: JournalReportService,
    private commonService: CommonService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      year: [null, Validators.required],
      month: [null, Validators.required]
    });
    this.loadFinancialYears();
  }

  loadFinancialYears(): void {
    this.isLoading = true;
    this.commonService.getYearList()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.years = Array.isArray(resp?.data) ? resp.data : [];
          if (this.years.length > 0) {
            this.filterForm.get('year')?.setValue(this.years[0].financialyear);
            this.onYearChange();
          }
          this.cdr.detectChanges();
        },
        error: () => this.alertService.error('Failed to load financial years.')
      });
  }

  onYearChange(): void {
    const selectedYear = this.filterForm.get('year')?.value;
    const fy = this.years.find(y => y.financialyear === selectedYear);
    this.months = fy?.periods || [];
    this.filterForm.get('month')?.setValue(null);
    this.voucherGroups = [];
    this.accPeriodLabel = '';
  }

  onMonthChange(): void {
    this.voucherGroups = [];
    this.accPeriodLabel = '';
  }

  isInvalid(ctrl: string): boolean {
    const c = this.filterForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.filterForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  onRetrieve(): void {
    this.filterForm.markAllAsTouched();
    if (this.filterForm.invalid) return;

    this.accPeriodLabel = this.filterForm.get('month')?.value ?? '';
    this.isLoading = true;
    this.voucherGroups = [];

    this.svc.getJournalReport({ accPeriod: this.accPeriodLabel })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.info(resp?.message || 'No records found.');
            return;
          }
          this.voucherGroups = this.groupByVoucher(Array.isArray(resp?.data) ? resp.data : []);
          this.cdr.detectChanges();
        },
        error: () => this.alertService.error('Failed to retrieve Journal report.')
      });
  }

  onClose(): void {
    this.voucherGroups = [];
    this.accPeriodLabel = '';
    this.months = [];
    this.filterForm.reset();
    this.filterForm.markAsPristine();
    this.filterForm.markAsUntouched();
  }

  private groupByVoucher(rows: any[]): JournalVoucherGroup[] {
    const map = new Map<string, JournalVoucherGroup>();
    for (const r of rows) {
      const key = r.voucherNumber ?? '';
      if (!map.has(key)) {
        map.set(key, {
          voucherDate: r.voucherDate ?? '',
          voucherNumber: r.voucherNumber ?? '',
          onHoldNo: r.onHoldNo ?? '',
          narration: r.narration ?? '',
          rows: [],
          debitTotal: 0,
          creditTotal: 0
        });
      }
      const g = map.get(key)!;
      g.rows.push(r);
      if ((r.dbCrFlag ?? '').toUpperCase() === 'D') g.debitTotal += Number(r.amount) || 0;
      else g.creditTotal += Number(r.amount) || 0;
    }
    return Array.from(map.values());
  }

  get grandDebitTotal(): number { return this.voucherGroups.reduce((s, g) => s + g.debitTotal, 0); }
  get grandCreditTotal(): number { return this.voucherGroups.reduce((s, g) => s + g.creditTotal, 0); }

  trackByVoucherGroup = (_: number, g: JournalVoucherGroup) => g.voucherNumber;
  trackByRow = (i: number, r: any) => (r.accountCode ?? '') + i;

  private fmt(n: number): string {
    return n === 0
      ? ''
      : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  downloadPdf(): void {
    if (!this.voucherGroups.length) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const fname = `JournalRegister_${this.accPeriodLabel}.pdf`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `JOURNAL REGISTER FOR THE MONTH OF ${this.accPeriodLabel.toUpperCase()}`,
      pageW / 2, 13, { align: 'center' }
    );
    doc.setFontSize(10);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 136, 96);
    doc.text(`Printed on: ${today}`, pageW / 2, 24, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    type RowType = 'data' | 'vtotal' | 'gtotal';
    const body: any[] = [];
    const rowMeta: { type: RowType }[] = [];

    for (const grp of this.voucherGroups) {
      grp.rows.forEach((r, i) => {
        const isD = (r.dbCrFlag ?? '').toUpperCase() === 'D';
        const amt = Number(r.amount) || 0;
        const descLines = [r.description, r.particulars, r.subCodeDescription].filter(Boolean).join('\n');

        body.push([
          i === 0 ? grp.voucherDate : '',
          i === 0 ? grp.voucherNumber : '',
          i === 0 ? grp.onHoldNo : '',
          r.accountCode ?? '',
          r.subCode ?? '',
          descLines,
          [r.referenceNumber, r.referenceDate].filter(Boolean).join('\n'),
          isD ? this.fmt(amt) : '',
          !isD ? this.fmt(amt) : '',
          i === 0 ? grp.narration : ''
        ]);
        rowMeta.push({ type: 'data' });
      });

      body.push([
        '', '', '', '', '', '',
        'Vchr Total',
        this.fmt(grp.debitTotal),
        this.fmt(grp.creditTotal),
        ''
      ]);
      rowMeta.push({ type: 'vtotal' });
    }

    body.push([
      '', '', '', '', '', '',
      'Grand Total',
      this.fmt(this.grandDebitTotal),
      this.fmt(this.grandCreditTotal),
      ''
    ]);
    rowMeta.push({ type: 'gtotal' });
    (doc as any).autoTable({
      startY: 28,
      margin: { left: 10, right: 10, top: 10, bottom: 10 },
      tableWidth: 277,
      head: [[
        'Voucher Date', 'Voucher No', 'Onhold No',
        'A/C Code', 'Sub Code',
        'Description / Line Details',
        'Ref.No / Date', 'Debit', 'Credit', 'Narration'
      ]],
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
        0: { cellWidth: 18 },
        1: { cellWidth: 24 },
        2: { cellWidth: 22 },
        3: { cellWidth: 14 },
        4: { cellWidth: 14 },
        5: { cellWidth: 52 },
        6: { cellWidth: 20 },
        7: { cellWidth: 26, halign: 'right' as const },
        8: { cellWidth: 26, halign: 'right' as const },
        9: { cellWidth: 61 }
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        const meta = rowMeta[data.row.index];
        if (!meta) return;
        const col = data.column.index;

        switch (meta.type) {
          case 'data':
            data.cell.styles.fillColor = this.WHT;
            break;

          case 'vtotal':
            data.cell.styles.fillColor = this.MID;
            data.cell.styles.fontStyle = 'bold';
            if (col === 6) { data.cell.styles.halign = 'right'; data.cell.styles.textColor = [40, 40, 40]; }
            if (col === 7) { data.cell.styles.halign = 'right'; data.cell.styles.textColor = [255, 0, 38]; }
            if (col === 8) { data.cell.styles.halign = 'right'; data.cell.styles.textColor = [0, 23, 252]; }
            break;

          case 'gtotal':
            data.cell.styles.fillColor = this.G1;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = this.WHT;
            if (col === 6 || col === 7 || col === 8) data.cell.styles.halign = 'right';
            break;
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

  downloadExcel(): void {
    if (!this.voucherGroups.length) return;

    const wb = XLSX.utils.book_new();
    const aoaRows: any[][] = [];
    const rowTypes: ('title' | 'blank' | 'header' | 'data' | 'vtotal' | 'gtotal')[] = [];

    aoaRows.push(['OTTO BILZ (INDIA) PVT. LTD.', ...Array(12).fill('')]);
    rowTypes.push('title');

    aoaRows.push([`JOURNAL REGISTER FOR THE MONTH OF ${this.accPeriodLabel.toUpperCase()}`, ...Array(12).fill('')]);
    rowTypes.push('title');

    aoaRows.push(Array(13).fill(''));
    rowTypes.push('blank');

    aoaRows.push(['Voucher Date', 'Voucher No', 'Onhold No', 'A/C Code', 'Sub Code', 'Description', 'Particulars', 'Sub Code Description', 'Ref.No', 'Ref.Date', 'Debit (Rs.)', 'Credit (Rs.)', 'Narration']);
    rowTypes.push('header');

    for (const grp of this.voucherGroups) {
      grp.rows.forEach((r, i) => {
        const isD = (r.dbCrFlag ?? '').toUpperCase() === 'D';
        const amt = Number(r.amount) || 0;
        aoaRows.push([
          i === 0 ? grp.voucherDate : '',
          i === 0 ? grp.voucherNumber : '',
          i === 0 ? grp.onHoldNo : '',
          r.accountCode ?? '',
          r.subCode ?? '',
          r.description ?? '',
          r.particulars ?? '',
          r.subCodeDescription ?? '',
          r.referenceNumber ?? '',
          r.referenceDate ?? '',
          isD ? amt : null,
          !isD ? amt : null,
          i === 0 ? grp.narration : ''
        ]);
        rowTypes.push('data');
      });

      aoaRows.push([...Array(10).fill(''), grp.debitTotal, grp.creditTotal, 'Voucher Total']);
      rowTypes.push('vtotal');
    }

    aoaRows.push([...Array(10).fill(''), this.grandDebitTotal, this.grandCreditTotal, 'Grand Total']);
    rowTypes.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);

    ws['!cols'] = [
      { wch: 13 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 10 },
      { wch: 28 }, { wch: 28 }, { wch: 28 }, { wch: 14 }, { wch: 12 },
      { wch: 16 }, { wch: 16 }, { wch: 24 }
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 12 } }
    ];

    this.applyExcelStyles(ws, aoaRows, rowTypes, [10, 11], 13);

    XLSX.utils.book_append_sheet(wb, ws, 'Journal Register');
    XLSX.writeFile(wb, `JournalRegister_${this.accPeriodLabel}.xlsx`);
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
}