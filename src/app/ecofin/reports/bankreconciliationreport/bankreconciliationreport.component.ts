import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { BankReconciliationReportService } from 'src/app/shared/services/reports/bankreconciliationreport.service';

declare const jspdf: any;
declare const XLSX: any;

@Component({
  selector: 'app-bankreconciliationreport',
  templateUrl: './bankreconciliationreport.component.html',
  styleUrls: ['./bankreconciliationreport.component.css']
})
export class BankReconciliationReportComponent implements OnInit {

  isLoading = false;
  today     = '';

  filterForm!: FormGroup;
  accPeriods: any[] = [];
  reportRows: any[] = [];

  private readonly G1  = [78, 170, 57];
  private readonly WHT = [255, 255, 255];
  private readonly MID = [237, 246, 235];

  readonly reportTypes = [
    { value: 'BR_ISSUE', label: 'Cheque Issued Not Presented'   },
    { value: 'BR_DEP',   label: 'Cheque Deposited Not Presented' },
    { value: 'BR_DBT',   label: 'Debited By Bank Not Accounted' },
    { value: 'BR_CRDT',  label: 'Credited By Bank Not Accounted'}
  ];

  constructor(
    private fb: FormBuilder,
    private svc: BankReconciliationReportService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.today = new Date().toISOString().split('T')[0];
    this.buildForm();
    this.loadAccPeriods();
  }

  buildForm(): void {
    this.filterForm = this.fb.group({
      reportType: ['BR_ISSUE', Validators.required],
      accPeriod:  ['',         Validators.required],
      asAtDate:   [null,       Validators.required]
    });
  }

  get reportType(): string { return this.filterForm.get('reportType')?.value ?? 'BR_ISSUE'; }

  get reportTitle(): string {
    return this.reportTypes.find(t => t.value === this.reportType)?.label ?? 'Bank Reconciliation';
  }

  onReportTypeChange(): void {
    this.reportRows = [];
    this.filterForm.get('asAtDate')?.reset();
  }

  isInvalid(ctrl: string): boolean {
    const c = this.filterForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.filterForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  loadAccPeriods(): void {
    this.svc.getAccPeriods().subscribe({
      next: (resp: any) => {
        this.accPeriods = Array.isArray(resp?.data) ? resp.data : [];
        this.cdr.detectChanges();
      },
      error: () => this.alertService.error('Failed to load accounting periods.')
    });
  }

  onRetrieve(): void {
    this.filterForm.markAllAsTouched();
    if (this.filterForm.invalid) return;
    const v = this.filterForm.value;
    this.isLoading  = true;
    this.reportRows = [];

    const done   = finalize(() => (this.isLoading = false));
    const handle = (resp: any) => {
      if (resp?.success === false) { this.alertService.info(resp?.message || 'No records found.'); return; }
      this.reportRows = Array.isArray(resp?.data) ? resp.data : [];
      this.cdr.detectChanges();
    };
    const err = () => this.alertService.error('Failed to retrieve report.');

    switch (this.reportType) {
      case 'BR_ISSUE': this.svc.getChequeIssuedNotPresented(v.accPeriod, v.asAtDate).pipe(done).subscribe({ next: handle, error: err }); break;
      case 'BR_DEP':   this.svc.getChequeDepositedNotPresented(v.accPeriod, v.asAtDate).pipe(done).subscribe({ next: handle, error: err }); break;
      case 'BR_DBT':   this.svc.getDebitedByBankNotAccounted(v.accPeriod, v.asAtDate).pipe(done).subscribe({ next: handle, error: err }); break;
      case 'BR_CRDT':  this.svc.getCreditedByBankNotAccounted(v.accPeriod, v.asAtDate).pipe(done).subscribe({ next: handle, error: err }); break;
    }
  }

  onClose(): void {
    this.reportRows = [];
    this.filterForm.reset({ reportType: 'BR_ISSUE', accPeriod: '' });
    this.filterForm.markAsPristine();
    this.filterForm.markAsUntouched();
  }

  get totalAmount(): number {
    return this.reportRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  downloadPdf(): void {
    if (!this.reportRows.length) return;
    const v    = this.filterForm.value;
    const doc  = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const fmtN = (n: any) => n == null || n === 0 ? '' :
      Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...this.G1);
    doc.text(this.reportTitle, 210, 12, { align: 'center' });
    doc.setFontSize(8); doc.setTextColor(80, 80, 80);
    doc.text(`Period: ${v.accPeriod}   As At: ${v.asAtDate}`, 210, 18, { align: 'center' });

    const { cols, body } = this.buildTableData(fmtN);

    (doc as any).autoTable({
      head: [cols], body, startY: 22,
      styles: { fontSize: 6, cellPadding: 1.2 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: this.MID },
      columnStyles: { [cols.length - 1]: { halign: 'right' } },
      didParseCell: (d: any) => {
        if (d.row.index === body.length - 1) {
          d.cell.styles.fillColor = this.G1;
          d.cell.styles.textColor = this.WHT;
          d.cell.styles.fontStyle = 'bold';
        }
      }
    });
    doc.save(`${this.reportTitle.replace(/\s/g, '_')}_${v.accPeriod}.pdf`);
  }

  // ── Excel ─────────────────────────────────────────────────────────────────
  downloadExcel(): void {
    if (!this.reportRows.length) return;
    const v    = this.filterForm.value;
    const fmtN = (n: any) => n == null ? null : Number(n) || null;
    const wb   = XLSX.utils.book_new();
    const aoa: any[][] = [];
    const types: string[] = [];

    aoa.push([`${this.reportTitle} — Period: ${v.accPeriod}  |  As At: ${v.asAtDate}`]); types.push('title');
    aoa.push([]); types.push('blank');

    const { cols, body } = this.buildTableData((n: any) =>
      n == null ? '' : Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
    const numCI = [cols.length - 1];
    aoa.push(cols); types.push('header');

    for (const row of body) {
      aoa.push(row.map((cell: any, idx: number) => numCI.includes(idx) ? fmtN(cell) : cell));
      types.push('data');
    }

    const ws  = XLSX.utils.aoa_to_sheet(aoa);
    const G1H = 'FF4EAA39';
    aoa.forEach((row, ri) => {
      row.forEach((_: any, ci: number) => {
        const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };
        const isNum = numCI.includes(ci) && types[ri] === 'data';
        ws[addr].s = {
          font:      types[ri] === 'title'  ? { bold: true, sz: 12, color: { rgb: G1H } }
                   : types[ri] === 'header' ? { bold: true, color: { rgb: 'FFFFFFFF' } } : {},
          fill:      types[ri] === 'header' ? { fgColor: { rgb: G1H } }
                   : ri % 2 === 0           ? { fgColor: { rgb: 'FFEDF6EB' } } : {},
          alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center' },
          numFmt:    isNum ? '#,##0.00' : undefined
        };
      });
    });
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, this.reportTitle.substring(0, 31));
    XLSX.writeFile(wb, `${this.reportTitle.replace(/\s/g, '_')}_${this.filterForm.value.accPeriod}.xlsx`);
  }

  // ── Shared table builder ──────────────────────────────────────────────────
  private buildTableData(fmtN: (n: any) => any): { cols: string[]; body: any[][] } {
    const fmtAmt = (r: any) => fmtN(r.amount);

    if (this.reportType === 'BR_ISSUE') {
      const cols = ['Voucher No', 'Vchr Date', 'Instrument No', 'Instrument Date', 'Acc Period', 'Particulars', 'Bank', 'Amount'];
      const body = this.reportRows.map(r => [r.voucherNumber, r.vchrDate, r.instrumentNo, r.instrumentDate, r.accPeriod, r.lineParticulars, r.bankName, fmtAmt(r)]);
      body.push(['', '', '', '', '', '', 'Grand Total', fmtN(this.totalAmount)]);
      return { cols, body };
    }
    if (this.reportType === 'BR_DEP') {
      const cols = ['Voucher No', 'Vchr Date', 'Instrument No', 'Instrument Date', 'Particulars', 'Party', 'Bank', 'Amount'];
      const body = this.reportRows.map(r => [r.voucherNumber, r.vchrDate, r.instrumentNo, r.instrumentDate, r.lineParticulars, r.partyName, r.bankName, fmtAmt(r)]);
      body.push(['', '', '', '', '', '', 'Grand Total', fmtN(this.totalAmount)]);
      return { cols, body };
    }
    // BR_DBT | BR_CRDT
    const cols = ['Voucher No', 'Vchr Date', 'Instrument No', 'Instrument Date', 'Particulars', 'Account', 'DB/CR', 'Amount'];
    const body = this.reportRows.map(r => [r.voucherNumber, r.vchrDate, r.instrumentNo, r.instrumentDate, r.lineParticulars, r.accountDesc, r.dbCrFlag, fmtAmt(r)]);
    body.push(['', '', '', '', '', '', 'Grand Total', fmtN(this.totalAmount)]);
    return { cols, body };
  }
}