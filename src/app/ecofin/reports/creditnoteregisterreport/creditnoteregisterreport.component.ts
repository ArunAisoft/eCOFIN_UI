import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { CreditNoteReportService } from 'src/app/shared/services/reports/creditnoteregisterreport.service';
import { CommonService } from 'src/app/shared/services/voucher/common.service';
import { FinancialYearsWithPeriodsModel } from 'src/app/shared/models/common.models';

declare const jspdf: any;
declare const XLSX: any;

export interface CreditNoteVoucherGroup {
  voucherDate      : string;   // cn.VchrDate
  voucherNumber    : string;   // cn.VchrNumber
  onHoldNo         : string;   // cn.CtrlOnholdno
  narration        : string;   // cn.VchrNarration
  hdrAccountCode   : string;   // cn.Accountcode
  hdrSubAccountCode: string;   // cn.Subaccountcode
  hdrSubAccountDesc: string;   // subcodeB.Subcodedescription
  rows             : any[];
  voucherTotal     : number;   // sum of d.Dbcramount — matches PDF "Voucher Total"
}

@Component({
  selector   : 'app-creditnoteregisterreport',
  templateUrl: './creditnoteregisterreport.component.html',
  styleUrls  : ['./creditnoteregisterreport.component.css']
})
export class CreditnoteregisterreportComponent implements OnInit {

  isLoading      = false;
  filterForm!    : FormGroup;
  voucherGroups  : CreditNoteVoucherGroup[] = [];
  accPeriodLabel = '';

  years : FinancialYearsWithPeriodsModel[] = [];
  months: any[] = [];

  private readonly G1  = [78, 170, 57];
  private readonly WHT = [255, 255, 255];
  private readonly MID = [237, 246, 235];

  constructor(
    private fb           : FormBuilder,
    private svc          : CreditNoteReportService,
    private commonService: CommonService,
    private alertService : AlertService,
    private cdr          : ChangeDetectorRef
  ) { }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    this.filterForm = this.fb.group({
      year : [null, Validators.required],
      month: [null, Validators.required]
    });
    this.loadFinancialYears();
  }

  // ── Financial year helpers ────────────────────────────────────────────────

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
    this.voucherGroups  = [];
    this.accPeriodLabel = '';
  }

  onMonthChange(): void {
    this.voucherGroups  = [];
    this.accPeriodLabel = '';
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  isInvalid(ctrl: string): boolean {
    const c = this.filterForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.filterForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  // ── Data retrieval ────────────────────────────────────────────────────────

  onRetrieve(): void {
    this.filterForm.markAllAsTouched();
    if (this.filterForm.invalid) return;

    this.accPeriodLabel = this.filterForm.get('month')?.value ?? '';
    this.isLoading     = true;
    this.voucherGroups = [];

    this.svc.getCreditNoteReport({ accPeriod: this.accPeriodLabel })
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
        error: () => this.alertService.error('Failed to retrieve Credit Note report.')
      });
  }

  onClose(): void {
    this.voucherGroups  = [];
    this.accPeriodLabel = '';
    this.months         = [];
    this.filterForm.reset();
    this.filterForm.markAsPristine();
    this.filterForm.markAsUntouched();
  }

  // ── Grouping ──────────────────────────────────────────────────────────────
  // DTO fields (from CreditNoteReportService):
  //   voucherNumber      = cn.VchrNumber
  //   voucherDate        = cn.VchrDate  (formatted dd/MM/yyyy)
  //   onHoldNo           = cn.CtrlOnholdno
  //   narration          = cn.VchrNarration
  //   hdrAccountCode     = cn.Accountcode       (vendor account)
  //   hdrSubAccountCode  = cn.Subaccountcode    (vendor sub code)
  //   hdrSubAccountDesc  = subcodeB.Subcodedescription (vendor name)
  //   accountCode        = d.Accountcode        (line account)
  //   accountDescription = account.Description  (line account description)
  //   particulars        = d.Lineparticulars
  //   amount             = d.Dbcramount
  //   dbCrFlag           = d.Dbcrflag
  //   referenceNo        = d.Referencenumber
  //   referenceDate      = d.Referencedate (formatted)
  //   costCentreCode     = d.Costcentrecode
  //   costCentreDescription = costCentre.Description
  //   costTypeDesc       = costType.Parameterdescription
  //   expenseTypeDesc    = expenseType.Parameterdescription

  private groupByVoucher(rows: any[]): CreditNoteVoucherGroup[] {
    const map = new Map<string, CreditNoteVoucherGroup>();
    for (const r of rows) {
      const key = r.voucherNumber ?? '';
      if (!map.has(key)) {
        map.set(key, {
          voucherDate      : r.voucherDate       ?? '',
          voucherNumber    : r.voucherNumber      ?? '',
          onHoldNo         : r.onHoldNo           ?? '',
          narration        : r.narration          ?? '',
          hdrAccountCode   : r.hdrAccountCode     ?? '',
          hdrSubAccountCode: r.hdrSubAccountCode  ?? '',
          hdrSubAccountDesc: r.hdrSubAccountDesc  ?? '',
          rows             : [],
          voucherTotal     : 0
        });
      }
      const g = map.get(key)!;
      g.rows.push(r);
      // PDF shows single Amount column — voucherTotal = sum of all d.Dbcramount
      g.voucherTotal += Number(r.amount) || 0;
    }
    return Array.from(map.values());
  }

  // ── Grand Total ───────────────────────────────────────────────────────────

  get grandTotal(): number {
    return this.voucherGroups.reduce((s, g) => s + g.voucherTotal, 0);
  }

  trackByVoucherGroup = (_: number, g: CreditNoteVoucherGroup) => g.voucherNumber;
  trackByRow          = (i: number, r: any) => (r.accountCode ?? '') + i;

  private fmt(n: number): string {
    return n === 0
      ? ''
      : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // =========================================================================
  // PDF DOWNLOAD
  // Matches Creditnewreport.pdf layout exactly (same as Debit Note PDF):
  //   Left : Onhold No | Date | Vchr No | Vendor Code & Name | Narration
  //          A/C Code  | Account Desc. / Line Particulars / Cost Centre
  //   Right: Dr/Cr | Amount (Rs.) | Ref No / Ref Dt
  //
  //   Onhold No, Date, Vchr No, Vendor, Narration — once per group.
  //   A/C Code, Description, Dr/Cr, Amount, Ref — per row.
  //   Single Amount column (no split Debit/Credit).
  //   Voucher Total = sum of all amounts in group.
  // =========================================================================

  downloadPdf(): void {
    if (!this.voucherGroups.length) return;

    const { jsPDF } = jspdf;
    const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const fname = `CreditNoteRegister_${this.accPeriodLabel}.pdf`;

    // ── Page header ──────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(
      `CREDIT NOTE REGISTER FOR THE MONTH OF ${this.accPeriodLabel.toUpperCase()}`,
      pageW / 2, 13, { align: 'center' }
    );
    doc.setFontSize(10);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 136, 96);
    doc.text(`Printed on: ${today}`, pageW / 2, 24, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    // ── Build body ────────────────────────────────────────────────────────
    type RowType = 'data' | 'vtotal' | 'gtotal';
    const body   : any[]               = [];
    const rowMeta: { type: RowType }[] = [];

    for (const grp of this.voucherGroups) {
      grp.rows.forEach((r, i) => {
        const amt = Number(r.amount) || 0;

        // Vendor cell — shown once per group
        const vendorCell = i === 0
          ? [grp.hdrAccountCode, grp.hdrSubAccountCode, grp.hdrSubAccountDesc]
              .filter(Boolean).join(' ')
          : '';

        // Description + particulars + cost centre / expense type / cost type
        const costInfo = [
          r.costCentreCode,
          r.expenseTypeDesc,
          r.costTypeDesc
        ].filter(Boolean).join(' / ');

        const descLines = [r.accountDescription, r.particulars, costInfo]
          .filter(Boolean).join('\n');

        body.push([
          i === 0 ? grp.onHoldNo      : '',   // col 0 — Onhold No
          i === 0 ? grp.voucherDate   : '',   // col 1 — Date
          i === 0 ? grp.voucherNumber : '',   // col 2 — Vchr No
          vendorCell,                          // col 3 — Vendor Code & Name
          i === 0 ? grp.narration     : '',   // col 4 — Narration
          r.accountCode ?? '',                 // col 5 — A/C Code
          descLines,                           // col 6 — Description / Particulars / Cost Centre
          r.dbCrFlag    ?? '',                 // col 7 — Dr/Cr
          this.fmt(amt),                       // col 8 — Amount (single column)
          [r.referenceNo, r.referenceDate].filter(Boolean).join('\n')  // col 9 — Ref No / Ref Dt
        ]);
        rowMeta.push({ type: 'data' });
      });

      // Voucher Total
      body.push(['', '', '', '', '', '', 'Voucher Total', '', this.fmt(grp.voucherTotal), '']);
      rowMeta.push({ type: 'vtotal' });
    }

    // Grand Total
    body.push(['', '', '', '', '', '', 'Grand Total', '', this.fmt(this.grandTotal), '']);
    rowMeta.push({ type: 'gtotal' });

    // ── autoTable ─────────────────────────────────────────────────────────
    // A4 landscape 277mm usable (10mm margin each side):
    // 20+18+24+28+30+14+52+8+28+55 = 277 ✓
    (doc as any).autoTable({
      startY    : 28,
      margin    : { left: 10, right: 10, top: 10, bottom: 10 },
      tableWidth: 277,
      head: [[
        'Onhold No', 'Date', 'Vchr No',
        'Vendor Code & Name', 'Narration',
        'A/C Code',
        'Account Desc. / Line Particulars / Cost Centre',
        'Dr/Cr', 'Amount (Rs.)', 'Ref No / Ref Dt'
      ]],
      body,
      theme : 'grid',
      styles: {
        fontSize   : 7,
        cellPadding: { top: 1, bottom: 1, left: 2, right: 2 },
        overflow   : 'linebreak',
        textColor  : [30, 30, 30],
        lineColor  : [221, 221, 221],
        lineWidth  : 0.2
      },
      headStyles: {
        fillColor: this.G1,
        textColor: this.WHT,
        fontStyle: 'bold',
        fontSize : 7.5,
        halign   : 'left'
      },
      columnStyles: {
        0: { cellWidth: 20 },                               // Onhold No
        1: { cellWidth: 18 },                               // Date
        2: { cellWidth: 24 },                               // Vchr No
        3: { cellWidth: 28 },                               // Vendor Code & Name
        4: { cellWidth: 30 },                               // Narration
        5: { cellWidth: 14 },                               // A/C Code
        6: { cellWidth: 52 },                               // Description / Particulars / Cost Centre
        7: { cellWidth: 8  },                               // Dr/Cr
        8: { cellWidth: 28, halign: 'right' as const },     // Amount
        9: { cellWidth: 55 }                                // Ref No / Ref Dt
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
            if (col === 8) { data.cell.styles.halign = 'right'; data.cell.styles.textColor = [40, 40, 40]; }
            break;

          case 'gtotal':
            data.cell.styles.fillColor = this.G1;
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = this.WHT;
            if (col === 6 || col === 8) data.cell.styles.halign = 'right';
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

  // =========================================================================
  // EXCEL DOWNLOAD
  // =========================================================================

  downloadExcel(): void {
    if (!this.voucherGroups.length) return;

    const wb       = XLSX.utils.book_new();
    const aoaRows: any[][] = [];
    const rowTypes: ('title' | 'blank' | 'header' | 'data' | 'vtotal' | 'gtotal')[] = [];

    aoaRows.push(['OTTO BILZ (INDIA) PVT. LTD.', ...Array(14).fill('')]);
    rowTypes.push('title');

    aoaRows.push([
      `CREDIT NOTE REGISTER FOR THE MONTH OF ${this.accPeriodLabel.toUpperCase()}`,
      ...Array(14).fill('')
    ]);
    rowTypes.push('title');

    aoaRows.push(Array(15).fill(''));
    rowTypes.push('blank');

    // Header — 15 columns (A–O)
    aoaRows.push([
      'Onhold No', 'Date', 'Vchr No',
      'Vendor Code', 'Vendor Sub Code', 'Vendor Name',
      'Narration',
      'A/C Code', 'Account Description', 'Line Particulars',
      'Cost Centre', 'Expense Type', 'Cost Type',
      'Dr/Cr', 'Amount (Rs.)',
      'Ref No', 'Ref Date'
    ]);
    rowTypes.push('header');

    for (const grp of this.voucherGroups) {
      grp.rows.forEach((r, i) => {
        aoaRows.push([
          i === 0 ? grp.onHoldNo           : '',
          i === 0 ? grp.voucherDate         : '',
          i === 0 ? grp.voucherNumber       : '',
          i === 0 ? grp.hdrAccountCode      : '',
          i === 0 ? grp.hdrSubAccountCode   : '',
          i === 0 ? grp.hdrSubAccountDesc   : '',
          i === 0 ? grp.narration           : '',
          r.accountCode        ?? '',
          r.accountDescription ?? '',
          r.particulars        ?? '',
          r.costCentreCode     ?? '',
          r.expenseTypeDesc    ?? '',
          r.costTypeDesc       ?? '',
          r.dbCrFlag           ?? '',
          Number(r.amount)     || null,
          r.referenceNo        ?? '',
          r.referenceDate      ?? ''
        ]);
        rowTypes.push('data');
      });

      // Voucher Total — amount in col index 14 (col O)
      aoaRows.push([
        ...Array(13).fill(''),
        'Voucher Total',
        grp.voucherTotal,
        '', ''
      ]);
      rowTypes.push('vtotal');
    }

    // Grand Total
    aoaRows.push([
      ...Array(13).fill(''),
      'Grand Total',
      this.grandTotal,
      '', ''
    ]);
    rowTypes.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);

    ws['!cols'] = [
      { wch: 16 }, { wch: 12 }, { wch: 16 },
      { wch: 10 }, { wch: 10 }, { wch: 28 },
      { wch: 28 }, { wch: 10 }, { wch: 28 },
      { wch: 28 }, { wch: 14 }, { wch: 20 },
      { wch: 20 }, { wch: 6  }, { wch: 16 },
      { wch: 14 }, { wch: 12 }
    ];

    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 16 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 16 } }
    ];

    // numCols = [14] → Amount column (index 14)
    this.applyExcelStyles(ws, aoaRows, rowTypes, [14], 17);

    XLSX.utils.book_append_sheet(wb, ws, 'Credit Note Register');
    XLSX.writeFile(wb, `CreditNoteRegister_${this.accPeriodLabel}.xlsx`);
  }

  // ── Shared Excel style helper ─────────────────────────────────────────────

  private applyExcelStyles(
    ws: any, aoaRows: any[][], rowTypes: string[], numCols: number[], totalCols: number
  ): void {
    const BDR = {
      top   : { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left  : { style: 'thin', color: { rgb: '000000' } },
      right : { style: 'thin', color: { rgb: '000000' } }
    };
    const NUM    = '#,##0.00';
    const G1hex  = '4EAA39';
    const MIDhex = 'EDF6EB';
    const CL = (c: number) => String.fromCharCode(65 + c);

    aoaRows.forEach((row, ri) => {
      const type = rowTypes[ri];
      const xlR  = ri + 1;
      for (let c = 0; c < totalCols; c++) {
        const addr = `${CL(c)}${xlR}`;
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };
        const isNum = numCols.includes(c);
        const val   = row[c];
        if (isNum && val !== null && val !== '' && !isNaN(Number(val))) {
          ws[addr].t = 'n'; ws[addr].v = Number(val);
        }
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
}