import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { SubLedgerReportService } from 'src/app/shared/services/reports/subledgerreport.service';

declare const jspdf: any;
declare const XLSX: any;

@Component({
  selector: 'app-subledgerreport',
  templateUrl: './subledgerreport.component.html',
  styleUrls: ['./subledgerreport.component.css']
})
export class SubLedgerReportComponent implements OnInit {

  isLoading = false;
  userName  = '';
  today     = '';

  filterForm!: FormGroup;
  accPeriods: any[] = [];
  reportRows: any[] = [];

  private readonly G1  = [78, 170, 57];
  private readonly WHT = [255, 255, 255];
  private readonly MID = [237, 246, 235];

  readonly reportTypes = [
    { value: 'SL_DEBT',  label: 'Debtor Ledger'       },
    { value: 'SL_CRDT',  label: 'Credit Ledger'        },
    { value: 'SL_LOAN',  label: 'Staff Loan Ledger'    },
    { value: 'SL_STADV', label: 'Staff Advance Ledger' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: SubLedgerReportService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.today = new Date().toISOString().split('T')[0];
    this.buildForm();
    this.loadAccPeriods();
  }

  buildForm(): void {
    this.filterForm = this.fb.group({
      reportType: ['SL_DEBT', Validators.required],
      accPeriod:  ['',        Validators.required],
      fromDate:   [null,      Validators.required],
      toDate:     [null,      Validators.required]
    }, { validators: this.dateRangeValidator });
  }

  get reportType(): string { return this.filterForm.get('reportType')?.value ?? 'SL_DEBT'; }

  get reportTitle(): string {
    return this.reportTypes.find(t => t.value === this.reportType)?.label ?? 'Sub Ledger';
  }

  onReportTypeChange(): void {
    this.reportRows = [];
    this.filterForm.get('fromDate')?.reset();
    this.filterForm.get('toDate')?.reset();
  }

  dateRangeValidator(form: FormGroup) {
    const from = form.get('fromDate')?.value;
    const to   = form.get('toDate')?.value;
    if (from && to && new Date(from) > new Date(to)) {
      form.get('toDate')?.setErrors({ dateInvalid: true });
    } else {
      const e = form.get('toDate')?.errors;
      if (e) { delete e['dateInvalid']; form.get('toDate')?.setErrors(Object.keys(e).length ? e : null); }
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
      case 'SL_DEBT':  this.svc.getDebtorLedger(v.accPeriod, v.fromDate, v.toDate).pipe(done).subscribe({ next: handle, error: err }); break;
      case 'SL_CRDT':  this.svc.getCreditLedger(v.accPeriod, v.fromDate, v.toDate, this.userName).pipe(done).subscribe({ next: handle, error: err }); break;
      case 'SL_LOAN':  this.svc.getStaffLoanLedger(v.accPeriod, v.fromDate, v.toDate).pipe(done).subscribe({ next: handle, error: err }); break;
      case 'SL_STADV': this.svc.getStaffAdvanceLedger(v.accPeriod, v.fromDate, v.toDate).pipe(done).subscribe({ next: handle, error: err }); break;
    }
  }

  onClose(): void {
    this.reportRows = [];
    this.filterForm.reset({ reportType: 'SL_DEBT', accPeriod: '' });
    this.filterForm.markAsPristine();
    this.filterForm.markAsUntouched();
  }

  get totalOpening(): number { return this.reportRows.reduce((s, r) => s + (Number(r.openingBalance) || 0), 0); }
  get totalAmount():  number { return this.reportRows.reduce((s, r) => s + (Number(r.voucherAmount)  || 0), 0); }

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
    doc.text(`Period: ${v.accPeriod}   From: ${v.fromDate}  To: ${v.toDate}`, 210, 18, { align: 'center' });

    const cols = ['Account', 'Description', 'Sub Account', 'Sub Desc', 'Vchr No', 'Date', 'Particulars', 'Opening', 'Amount'];
    const body = this.reportRows.map(r => [
      r.accountCode, r.accountDescription, r.subAccountCode, r.subAccountDesc,
      r.vchrNumber, r.vchrDate, r.lineDetails, fmtN(r.openingBalance), fmtN(r.voucherAmount)
    ]);
    body.push(['', '', '', '', '', '', 'Grand Total', fmtN(this.totalOpening), fmtN(this.totalAmount)]);

    (doc as any).autoTable({
      head: [cols], body, startY: 22,
      styles: { fontSize: 6, cellPadding: 1.2 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: this.MID },
      columnStyles: { 7: { halign: 'right' }, 8: { halign: 'right' } },
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

    aoa.push([`${this.reportTitle} — Period: ${v.accPeriod}  |  From: ${v.fromDate}  To: ${v.toDate}`]); types.push('title');
    aoa.push([]); types.push('blank');

    const cols = ['Account', 'Description', 'Sub Account', 'Sub Desc', 'Vchr No', 'Date', 'Particulars', 'Opening', 'Amount'];
    aoa.push(cols); types.push('header');

    for (const r of this.reportRows) {
      aoa.push([r.accountCode, r.accountDescription, r.subAccountCode, r.subAccountDesc,
                r.vchrNumber, r.vchrDate, r.lineDetails, fmtN(r.openingBalance), fmtN(r.voucherAmount)]);
      types.push('data');
    }

    const ws    = XLSX.utils.aoa_to_sheet(aoa);
    const G1H   = 'FF4EAA39';
    const numCI = [7, 8];
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
    XLSX.writeFile(wb, `${this.reportTitle.replace(/\s/g, '_')}_${v.accPeriod}.xlsx`);
  }
}