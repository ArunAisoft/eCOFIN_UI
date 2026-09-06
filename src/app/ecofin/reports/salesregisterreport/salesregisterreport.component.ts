import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { SalesRegisterService } from 'src/app/shared/services/reports/salesregisterreport.service';

declare const jspdf: any;
declare const XLSX: any;

export interface SalesVoucherGroup {
  voucherDate: string;
  voucherNumber: string;
  onHoldNo: string;
  hdrAccountCode: string;
  hdrAccountDesc: string;
  hdrSubAccountCode: string;
  hdrSubAccountDesc: string;
  narration: string;
  refNumber: string;
  refDate: string;
  rows: any[];
  debitTotal: number;
  creditTotal: number;
}

@Component({
  selector: 'app-salesregisterreport',
  templateUrl: './salesregisterreport.component.html',
  styleUrls: ['./salesregisterreport.component.css']
})
export class SalesregisterreportComponent implements OnInit {

  isLoading = false;
  today = '';
  filterForm!: FormGroup;

  // Accounts populated from API (Sales accounts: DbCrFlag = 'C')
  accounts: any[] = [];
  voucherGroups: SalesVoucherGroup[] = [];

  private readonly G1 = [78, 170, 57];
  private readonly WHT = [255, 255, 255];
  private readonly MID = [237, 246, 235];

  constructor(
    private fb: FormBuilder,
    private svc: SalesRegisterService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.today = new Date().toISOString().split('T')[0];
    this.buildFilterForm();
    this.loadAccounts();
  }

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

  accDisplay = (acc: any) => `${acc.accountCode} — ${acc.description}`;

onAccountChange(selected: string[]): void {
  if (this.voucherGroups.length) {
    this.voucherGroups = [];
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

  // Loads distinct Sales accounts (DBCRFLAG = 'C' in CFN_SALVDETAIL)
  loadAccounts(): void {
    this.isLoading = true;
    this.svc.getSalesAccounts()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.accounts = Array.isArray(resp?.data) ? resp.data : [];
        },
        error: () => this.alertService.error('Failed to load sales accounts.')
      });
  }

onRetrieve(): void {
  this.filterForm.markAllAsTouched();
  if (this.filterForm.invalid) return;
  const v = this.filterForm.value;
  const accountCodes: string[] = Array.isArray(v.accountCode) ? v.accountCode : [];
  this.isLoading = true;
  this.voucherGroups = [];

  this.svc.getSalesReport({
    accountCode: accountCodes.join(','),   // ← join array for API
    fromDate: v.fromDate,
    toDate: v.toDate
  })
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
      error: () => this.alertService.error('Failed to retrieve Sales Register.')
    });
}

onClose(): void {
  this.voucherGroups = [];
  this.filterForm.reset({
    accountCode: [],    // ← [] not null
    fromDate: null,
    toDate: null
  });
  this.filterForm.markAsPristine();
  this.filterForm.markAsUntouched();
}

  private groupByVoucher(rows: any[]): SalesVoucherGroup[] {
    const map = new Map<string, SalesVoucherGroup>();
    for (const r of rows) {
      const key = r.vchrNumber ?? r.ctrlOnholdno ?? '';
      if (!map.has(key)) {
        map.set(key, {
          voucherDate: r.vchrDate ?? '',
          voucherNumber: r.vchrNumber ?? '',
          onHoldNo: r.ctrlOnholdno ?? '',
          hdrAccountCode: r.hdrAccountCode ?? '',
          hdrAccountDesc: r.hdrAccountDesc ?? '',
          hdrSubAccountCode: r.hdrSubAccountCode ?? '',
          hdrSubAccountDesc: r.hdrSubAccountDesc ?? '',
          narration: r.vchrNarration ?? '',
          refNumber: r.vchrRefNumber ?? '',
          refDate: r.vchrRefDate ?? '',
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

  get grandDebitTotal(): number {
    return this.voucherGroups.reduce((s, g) => s + g.debitTotal, 0);
  }
  get grandCreditTotal(): number {
    return this.voucherGroups.reduce((s, g) => s + g.creditTotal, 0);
  }

  trackByVoucherGroup = (_: number, g: SalesVoucherGroup) => g.voucherNumber;
  trackByRow = (i: number, r: any) => (r.detailAccountCode ?? '') + i;

  private fmt(n: number): string {
    return n === 0 ? '' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── PDF Export ─────────────────────────────────────────────────────────────
  downloadPdf(): void {
    if (!this.voucherGroups.length) return;
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const v = this.filterForm.value;
    const period = `${v.fromDate} to ${v.toDate}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('SALES REGISTER', pageW / 2, 13, { align: 'center' });
    doc.setFontSize(10);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 136, 96);
    doc.text(`Period: ${period}    |    Printed on: ${today}`, pageW / 2, 24, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    type RowType = 'data' | 'vtotal' | 'gtotal';
    const body: any[] = [];
    const rowMeta: { type: RowType }[] = [];

    for (const grp of this.voucherGroups) {
      grp.rows.forEach((r, i) => {
        const isD = (r.dbCrFlag ?? '').toUpperCase() === 'D';
        const amt = Number(r.amount) || 0;
        body.push([
          i === 0 ? grp.voucherDate : '',
          i === 0 ? grp.voucherNumber : '',
          i === 0 ? grp.onHoldNo : '',
          i === 0 ? `${grp.hdrAccountCode}\n${grp.hdrAccountDesc}` : '',
          i === 0 ? `${grp.hdrSubAccountCode}\n${grp.hdrSubAccountDesc}` : '',
          i === 0 ? [grp.refNumber, grp.refDate].filter(Boolean).join('\n') : '',
          [r.billNo, r.billDate].filter(Boolean).join('\n'),
          r.billAmount ? this.fmt(Number(r.billAmount)) : '',
          `${r.detailAccountCode ?? ''}\n${r.detailAccountDesc ?? ''}`,
          `${r.detailSubAccountCode ?? ''}\n${r.detailSubAccountDesc ?? ''}`,
          isD ? this.fmt(amt) : '',
          !isD ? this.fmt(amt) : ''
        ]);
        rowMeta.push({ type: 'data' });
      });
      body.push(['', '', '', '', '', '', '', '', '', 'Vchr Total', this.fmt(grp.debitTotal), this.fmt(grp.creditTotal)]);
      rowMeta.push({ type: 'vtotal' });
    }
    body.push(['', '', '', '', '', '', '', '', '', 'Grand Total', this.fmt(this.grandDebitTotal), this.fmt(this.grandCreditTotal)]);
    rowMeta.push({ type: 'gtotal' });

    (doc as any).autoTable({
      startY: 28,
      margin: { left: 8, right: 8, top: 10, bottom: 10 },
      head: [['Vchr Date', 'Vchr No', 'Onhold No', 'Hdr A/C', 'Hdr Sub A/C', 'Ref No/Date', 'Bill No/Date', 'Bill Amt', 'Detail A/C', 'Detail Sub A/C', 'Debit', 'Credit']],
      body,
      theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 }, overflow: 'linebreak', textColor: [30, 30, 30], lineColor: [221, 221, 221], lineWidth: 0.2 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold', fontSize: 7, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 16 }, 1: { cellWidth: 24 }, 2: { cellWidth: 22 },
        3: { cellWidth: 28 }, 4: { cellWidth: 28 }, 5: { cellWidth: 20 },
        6: { cellWidth: 20 }, 7: { cellWidth: 18, halign: 'right' as const },
        8: { cellWidth: 24 }, 9: { cellWidth: 22 },
        10: { cellWidth: 20, halign: 'right' as const },
        11: { cellWidth: 20, halign: 'right' as const }
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        const meta = rowMeta[data.row.index];
        if (!meta) return;
        const col = data.column.index;
        if (meta.type === 'vtotal') {
          data.cell.styles.fillColor = this.MID;
          data.cell.styles.fontStyle = 'bold';
          if (col === 9) data.cell.styles.halign = 'right';
          if (col === 10) { data.cell.styles.halign = 'right'; data.cell.styles.textColor = [255, 0, 38]; }
          if (col === 11) { data.cell.styles.halign = 'right'; data.cell.styles.textColor = [0, 23, 252]; }
        }
        if (meta.type === 'gtotal') {
          data.cell.styles.fillColor = this.G1;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = this.WHT;
          if (col >= 9) data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 136, 96);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageW - 15, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      }
    });

    doc.save(`SalesRegister_${v.fromDate}_${v.toDate}.pdf`);
  }

  // ── Excel Export ───────────────────────────────────────────────────────────
  downloadExcel(): void {
    if (!this.voucherGroups.length) return;
    const v = this.filterForm.value;
    const wb = XLSX.utils.book_new();
    const aoaRows: any[][] = [];
    const rowTypes: string[] = [];

    aoaRows.push(['OTTO BILZ (INDIA) PVT. LTD.', ...Array(11).fill('')]); rowTypes.push('title');
    aoaRows.push([`SALES REGISTER — ${v.fromDate} TO ${v.toDate}`, ...Array(11).fill('')]); rowTypes.push('title');
    aoaRows.push(Array(12).fill('')); rowTypes.push('blank');
    aoaRows.push(['Vchr Date', 'Vchr No', 'Onhold No', 'Hdr A/C Code', 'Hdr A/C Desc', 'Hdr Sub A/C', 'Ref No/Date', 'Bill No', 'Bill Amt', 'Detail A/C', 'Debit', 'Credit']); rowTypes.push('header');

    for (const grp of this.voucherGroups) {
      grp.rows.forEach((r, i) => {
        const isD = (r.dbCrFlag ?? '').toUpperCase() === 'D';
        const amt = Number(r.amount) || 0;
        aoaRows.push([
          i === 0 ? grp.voucherDate : '',
          i === 0 ? grp.voucherNumber : '',
          i === 0 ? grp.onHoldNo : '',
          i === 0 ? grp.hdrAccountCode : '',
          i === 0 ? grp.hdrAccountDesc : '',
          i === 0 ? `${grp.hdrSubAccountCode} ${grp.hdrSubAccountDesc}` : '',
          i === 0 ? [grp.refNumber, grp.refDate].filter(Boolean).join(' / ') : '',
          r.billNo ?? '',
          Number(r.billAmount) || null,
          `${r.detailAccountCode ?? ''} — ${r.detailAccountDesc ?? ''}`,
          isD ? amt : null,
          !isD ? amt : null
        ]);
        rowTypes.push('data');
      });
      aoaRows.push([...Array(10).fill(''), grp.debitTotal, grp.creditTotal]); rowTypes.push('vtotal');
    }
    aoaRows.push([...Array(10).fill(''), this.grandDebitTotal, this.grandCreditTotal]); rowTypes.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);
    ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 10 }, { wch: 28 }, { wch: 24 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 30 }, { wch: 16 }, { wch: 16 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }];
    this.applyExcelStyles(ws, aoaRows, rowTypes, [8, 10, 11], 12);
    XLSX.utils.book_append_sheet(wb, ws, 'Sales Register');
    XLSX.writeFile(wb, `SalesRegister_${v.fromDate}_${v.toDate}.xlsx`);
  }

  private applyExcelStyles(ws: any, aoaRows: any[][], rowTypes: string[], numCols: number[], totalCols: number): void {
    const BDR = { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: '000000' } }, right: { style: 'thin', color: { rgb: '000000' } } };
    const NUM = '#,##0.00'; const G1hex = '4EAA39'; const MIDhex = 'EDF6EB';
    const CL = (c: number) => String.fromCharCode(65 + c);

    aoaRows.forEach((row, ri) => {
      const type = rowTypes[ri]; const xlR = ri + 1;
      for (let c = 0; c < totalCols; c++) {
        const addr = `${CL(c)}${xlR}`;
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };
        const isNum = numCols.includes(c); const val = row[c];
        if (isNum && val !== null && val !== '' && !isNaN(Number(val))) { ws[addr].t = 'n'; ws[addr].v = Number(val); }
        switch (type) {
          case 'title': ws[addr].s = { font: { bold: true, sz: 13 }, alignment: { horizontal: 'center', vertical: 'center' } }; break;
          case 'header': ws[addr].s = { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: G1hex } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BDR }; break;
          case 'data': ws[addr].s = isNum ? { font: { sz: 9 }, alignment: { horizontal: 'right' }, numFmt: NUM, border: BDR } : { font: { sz: 9 }, border: BDR }; break;
          case 'vtotal': ws[addr].s = isNum ? { font: { bold: true, sz: 9 }, fill: { fgColor: { rgb: MIDhex } }, alignment: { horizontal: 'right' }, numFmt: NUM, border: BDR } : { font: { bold: true, sz: 9 }, fill: { fgColor: { rgb: MIDhex } }, border: BDR }; break;
          case 'gtotal': ws[addr].s = isNum ? { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: G1hex } }, alignment: { horizontal: 'right' }, numFmt: NUM, border: BDR } : { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: G1hex } }, border: BDR }; break;
        }
      }
    });
  }
}
