import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { GstreportService } from 'src/app/shared/services/reports/gstreport.service';

declare const jspdf: any;
declare const XLSX: any;

@Component({
  selector: 'app-gstreport',
  templateUrl: './gstreport.component.html',
  styleUrls: ['./gstreport.component.css']
})
export class GstreportComponent implements OnInit {

  isLoading = false;
  userName = '';
  today = '';

  filterForm!: FormGroup;
  reportRows: any[] = [];

  private readonly G1 = [78, 170, 57];
  private readonly WHT = [255, 255, 255];
  private readonly MID = [237, 246, 235];

  constructor(
    private fb: FormBuilder,
    private svc: GstreportService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.today = new Date().toISOString().split('T')[0];
    this.buildFilterForm();
  }

  buildFilterForm(): void {
    this.filterForm = this.fb.group(
      {
        fromDate: [null, Validators.required],
        toDate: [null, Validators.required]
      },
      { validators: this.dateRangeValidator }
    );
  }

  dateRangeValidator(form: FormGroup) {
    const from = form.get('fromDate')?.value;
    const to = form.get('toDate')?.value;
    if (from && to && new Date(from) > new Date(to)) {
      form.get('toDate')?.setErrors({ dateInvalid: true });
    } else {
      const errors = form.get('toDate')?.errors;
      if (errors) {
        delete errors['dateInvalid'];
        form.get('toDate')?.setErrors(Object.keys(errors).length ? errors : null);
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

  onRetrieve(): void {
    this.filterForm.markAllAsTouched();
    if (this.filterForm.invalid) return;
    const v = this.filterForm.value;
    this.isLoading = true;
    this.reportRows = [];
    this.svc.getGstReport({ fromDate: v.fromDate, toDate: v.toDate })
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
        error: () => this.alertService.error('Failed to retrieve VAT report.')
      });
  }

  onClose(): void {
    this.reportRows = [];
    this.filterForm.reset();
    this.filterForm.markAsPristine();
    this.filterForm.markAsUntouched();
  }


  private sum = (field: string) =>
    this.reportRows.reduce((s, r) => s + (Number(r[field]) || 0), 0);

  get totalBasicValue() { return this.sum('basicValue'); }
  get totalExciseDuty() { return this.sum('exciseDuty'); }
  get totalEdCess() { return this.sum('edCess'); }
  get totalHedCess() { return this.sum('hedCess'); }
  get totalOthers() { return this.sum('others'); }
  get totalVat() { return this.sum('vat'); }
  get totalNonVat() { return this.sum('nonVat'); }
  get totalCst() { return this.sum('cst'); }
  get totalAmount() { return this.sum('total'); }

  // ================= PDF =================

  downloadPdf(): void {
    if (!this.reportRows.length) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

    const pageW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('en-GB');
    const v = this.filterForm.value;

    // HEADER SAME AS TDS
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('GST REPORT', pageW / 2, 13, { align: 'center' });

    doc.setFontSize(10);
    doc.text('OTTO BILZ (INDIA) PVT. LTD.', pageW / 2, 19, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 136, 96);
    doc.text(`Period: ${v.fromDate} to ${v.toDate} | Printed on: ${today}`, pageW / 2, 24, { align: 'center' });

    doc.setTextColor(0, 0, 0);

    const cols = [
      'PJV No', 'PJV Date', 'GIN No', 'GIN Date', 'Party',
      'Invoice No', 'Inv Date', 'Item Description',
      'Basic Value', 'Excise Duty', 'ED Cess', 'HED Cess', 'Others',
      'Rate of Tax', 'VAT', 'Non VAT', 'CST', 'Total',
      'VAT Type', 'CST No', 'TIN No'
    ];

    const fmtN = (n: any) =>
      n == null || n === 0 ? '' :
        Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const fmtD = (d: any) =>
      d ? new Date(d).toLocaleDateString('en-GB') : '';

    const body = this.reportRows.map(r => [
      r.pjvNumber, fmtD(r.pjvDate), r.ginNumber, fmtD(r.ginDate), r.party,
      r.invoiceNo, fmtD(r.invoiceDate), r.itemDescription,
      fmtN(r.basicValue), fmtN(r.exciseDuty), fmtN(r.edCess), fmtN(r.hedCess), fmtN(r.others),
      fmtN(r.rateOfTax), fmtN(r.vat), fmtN(r.nonVat), fmtN(r.cst), fmtN(r.total),
      r.vatType, r.cstNo, r.tinNo
    ]);

    body.push([
      '', '', '', '', '', '', '', 'Grand Total',
      fmtN(this.totalBasicValue), fmtN(this.totalExciseDuty),
      fmtN(this.totalEdCess), fmtN(this.totalHedCess),
      fmtN(this.totalOthers), '',
      fmtN(this.totalVat), fmtN(this.totalNonVat),
      fmtN(this.totalCst), fmtN(this.totalAmount),
      '', '', ''
    ]);

    (doc as any).autoTable({
      startY: 28,
      head: [cols],
      body,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold' },
      didParseCell: (data: any) => {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fillColor = this.G1;
          data.cell.styles.textColor = this.WHT;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    doc.save(`GSTReport_${v.fromDate}_${v.toDate}.pdf`);
  }

  // ================= EXCEL =================

  downloadExcel(): void {
    if (!this.reportRows.length) return;

    const v = this.filterForm.value;
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [];

    // HEADER SAME AS TDS
    rows.push(['OTTO BILZ (INDIA) PVT. LTD.']);
    rows.push([`GST REPORT — ${v.fromDate} TO ${v.toDate}`]);
    rows.push([]);

    rows.push([
      'PJV No', 'PJV Date', 'GIN No', 'GIN Date', 'Party',
      'Invoice No', 'Inv Date', 'Item Description',
      'Basic Value', 'Excise Duty', 'ED Cess', 'HED Cess', 'Others',
      'Rate of Tax', 'VAT', 'Non VAT', 'CST', 'Total',
      'VAT Type', 'CST No', 'TIN No'
    ]);

    for (const r of this.reportRows) {
      rows.push([
        r.pjvNumber, r.pjvDate, r.ginNumber, r.ginDate, r.party,
        r.invoiceNo, r.invoiceDate, r.itemDescription,
        r.basicValue, r.exciseDuty, r.edCess, r.hedCess, r.others,
        r.rateOfTax, r.vat, r.nonVat, r.cst, r.total,
        r.vatType, r.cstNo, r.tinNo
      ]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'GST Report');
    XLSX.writeFile(wb, `GSTReport_${v.fromDate}_${v.toDate}.xlsx`);
  }
}