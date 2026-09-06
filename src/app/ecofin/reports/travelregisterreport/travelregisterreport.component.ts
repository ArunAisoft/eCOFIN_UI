import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { TravelRegisterService } from 'src/app/shared/services/reports/travelregisterreport.service';

declare const jspdf: any;
declare const XLSX: any;

@Component({
  selector: 'app-travelregisterreport',
  templateUrl: './travelregisterreport.component.html',
  styleUrls: ['./travelregisterreport.component.css']
})
export class TravelregisterreportComponent implements OnInit {

  isLoading = false;
  today = '';
  filterForm!: FormGroup;

  // Accounts populated from cfn_v_travelregister (distinct accountcode + description)
  accounts: any[] = [];
  // Flat rows — no grouping needed; travel register is line-item centric
  reportRows: any[] = [];

  private readonly G1 = [78, 170, 57];
  private readonly WHT = [255, 255, 255];

  constructor(
    private fb: FormBuilder,
    private svc: TravelRegisterService,
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

  // Loads distinct travel accounts from cfn_v_travelregister
  loadAccounts(): void {
    this.isLoading = true;
    this.svc.getTravelAccounts()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.accounts = Array.isArray(resp?.data) ? resp.data : [];
        },
        error: () => this.alertService.error('Failed to load travel accounts.')
      });
  }

  onRetrieve(): void {
    this.filterForm.markAllAsTouched();
    if (this.filterForm.invalid) return;
    const v = this.filterForm.value;
    const accountCodes: string[] = Array.isArray(v.accountCode) ? v.accountCode : [];
    this.isLoading = true;
    this.reportRows = [];

    this.svc.getTravelReport({
      accountCode: accountCodes.join(','),
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
          this.reportRows = Array.isArray(resp?.data) ? resp.data : [];
          this.cdr.detectChanges();
        },
        error: () => this.alertService.error('Failed to retrieve Travel Register.')
      });
  }

  onClose(): void {
    this.reportRows = [];
    this.filterForm.reset({
      accountCode: [],
      fromDate: null,
      toDate: null
    });
    this.filterForm.markAsPristine();
    this.filterForm.markAsUntouched();
  }

  get grandDebitTotal(): number {
    return this.reportRows
      .filter(r => (r.dbCrFlag ?? '').toUpperCase() === 'D')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  }

  get grandCreditTotal(): number {
    return this.reportRows
      .filter(r => (r.dbCrFlag ?? '').toUpperCase() === 'C')
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);
  }

  trackByRow = (i: number, r: any) => (r.voucherNumber ?? '') + i;

  private fmt(n: number): string {
    return n === 0 ? '' : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ── PDF Export ─────────────────────────────────────────────────────────────
  downloadPdf(): void {
    if (!this.reportRows.length) return;
    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const v = this.filterForm.value;
    const period = `${v.fromDate} to ${v.toDate}`;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
    doc.text('TRAVEL REGISTER', pageW / 2, 13, { align: 'center' });
    doc.setFontSize(10);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 19, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(90, 136, 96);
    doc.text(`Period: ${period}    |    Printed on: ${today}`, pageW / 2, 24, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    const body: any[] = this.reportRows.map(r => {
      const isD = (r.dbCrFlag ?? '').toUpperCase() === 'D';
      const amt = Number(r.amount) || 0;
      return [
        r.accPeriod ?? '',
        r.accountCode ?? '',
        r.description ?? '',
        r.voucherNumber ?? '',
        r.voucherDate ?? '',
        r.costCentreCode ? `${r.costCentreCode}\n${r.costCentreDesc ?? ''}` : '',
        r.subAccountCode ?? '',
        r.costType ?? '',
        r.expenseType ?? '',
        r.lineParticulars ?? '',
        [r.referenceNumber, r.referenceDate].filter(Boolean).join('\n'),
        isD ? this.fmt(amt) : '',
        !isD ? this.fmt(amt) : ''
      ];
    });

    body.push(['', '', '', '', '', '', '', '', '', '', 'Grand Total', this.fmt(this.grandDebitTotal), this.fmt(this.grandCreditTotal)]);

    (doc as any).autoTable({
      startY: 28,
      margin: { left: 8, right: 8, top: 10, bottom: 10 },
      head: [['Acc Period', 'A/C Code', 'Description', 'Vchr No', 'Vchr Date', 'Cost Centre', 'Sub A/C', 'Cost Type', 'Expense Type', 'Line Particulars', 'Ref No/Date', 'Debit', 'Credit']],
      body,
      theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: { top: 1, bottom: 1, left: 2, right: 2 }, overflow: 'linebreak', textColor: [30, 30, 30], lineColor: [221, 221, 221], lineWidth: 0.2 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold', fontSize: 7, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 16 }, 1: { cellWidth: 16 }, 2: { cellWidth: 26 },
        3: { cellWidth: 22 }, 4: { cellWidth: 16 }, 5: { cellWidth: 22 },
        6: { cellWidth: 18 }, 7: { cellWidth: 18 }, 8: { cellWidth: 18 },
        9: { cellWidth: 28 }, 10: { cellWidth: 18 },
        11: { cellWidth: 20, halign: 'right' as const },
        12: { cellWidth: 20, halign: 'right' as const }
      },
      didParseCell: (data: any) => {
        if (data.section !== 'body') return;
        const isLast = data.row.index === body.length - 1;
        if (isLast) {
          data.cell.styles.fillColor = this.G1;
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.textColor = this.WHT;
          if (data.column.index >= 10) data.cell.styles.halign = 'right';
        }
      },
      didDrawPage: (data: any) => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(90, 136, 96);
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageW - 15, doc.internal.pageSize.getHeight() - 5, { align: 'right' });
        doc.setTextColor(0, 0, 0);
      }
    });
    doc.save(`TravelRegister_${v.fromDate}_${v.toDate}.pdf`);
  }

  // ── Excel Export ───────────────────────────────────────────────────────────
  downloadExcel(): void {
    if (!this.reportRows.length) return;
    const v = this.filterForm.value;
    const wb = XLSX.utils.book_new();
    const aoaRows: any[][] = [];
    const rowTypes: string[] = [];

    aoaRows.push(['OTTO BILZ (INDIA) PVT. LTD.', ...Array(12).fill('')]); rowTypes.push('title');
    aoaRows.push([`TRAVEL REGISTER — ${v.fromDate} TO ${v.toDate}`, ...Array(12).fill('')]); rowTypes.push('title');
    aoaRows.push(Array(13).fill('')); rowTypes.push('blank');
    aoaRows.push(['Acc Period', 'A/C Code', 'Description', 'Vchr No', 'Vchr Date', 'Cost Centre Code', 'Cost Centre Desc', 'Sub A/C', 'Cost Type', 'Expense Type', 'Line Particulars', 'Ref No / Date', 'Debit', 'Credit']); rowTypes.push('header');

    for (const r of this.reportRows) {
      const isD = (r.dbCrFlag ?? '').toUpperCase() === 'D';
      const amt = Number(r.amount) || 0;
      aoaRows.push([
        r.accPeriod ?? '', r.accountCode ?? '', r.description ?? '',
        r.voucherNumber ?? '', r.voucherDate ?? '',
        r.costCentreCode ?? '', r.costCentreDesc ?? '',
        r.subAccountCode ?? '', r.costType ?? '', r.expenseType ?? '',
        r.lineParticulars ?? '',
        [r.referenceNumber, r.referenceDate].filter(Boolean).join(' / '),
        isD ? amt : null,
        !isD ? amt : null
      ]);
      rowTypes.push('data');
    }

    aoaRows.push([...Array(12).fill(''), this.grandDebitTotal, this.grandCreditTotal]); rowTypes.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);
    ws['!cols'] = [{ wch: 12 }, { wch: 10 }, { wch: 28 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 16 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 13 } }];
    this.applyExcelStyles(ws, aoaRows, rowTypes, [12, 13], 14);
    XLSX.utils.book_append_sheet(wb, ws, 'Travel Register');
    XLSX.writeFile(wb, `TravelRegister_${v.fromDate}_${v.toDate}.xlsx`);
  }

  private applyExcelStyles(ws: any, aoaRows: any[][], rowTypes: string[], numCols: number[], totalCols: number): void {
    const BDR = { top: { style: 'thin', color: { rgb: '000000' } }, bottom: { style: 'thin', color: { rgb: '000000' } }, left: { style: 'thin', color: { rgb: '000000' } }, right: { style: 'thin', color: { rgb: '000000' } } };
    const NUM = '#,##0.00'; const G1hex = '4EAA39';
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
          case 'gtotal': ws[addr].s = isNum ? { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: G1hex } }, alignment: { horizontal: 'right' }, numFmt: NUM, border: BDR } : { font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: G1hex } }, border: BDR }; break;
        }
      }
    });
  }
}
