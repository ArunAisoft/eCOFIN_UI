import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { AgeingReportService } from 'src/app/shared/services/reports/ageingreport.service';

declare const jspdf: any;
declare const XLSX: any;

// ── Bucket interface (shared by bills, payments, totals) ──────────────────
interface BucketTotals {
  bucket0_30: number;
  bucket30_45: number;
  bucket46_90: number;
  bucket91_120: number;
  bucket121_180: number;
  bucket180Plus: number;
  total: number;
}

interface AgeingRow extends BucketTotals {
  nature: string;
  accountCode: string;
  subAccountCode: string;
  partyName: string;
  vchrNumber: string;
  vchrDate: string;
  billNo: string;
  billDueDate: string;
  daysOutstanding: number;
}

interface PartyGroup {
  accountCode: string;
  subAccountCode: string;
  partyName: string;
  bills: AgeingRow[];
  payments: AgeingRow[];
  billTotals: BucketTotals;
  paymentTotals: BucketTotals;
  partyTotals: BucketTotals;
}

@Component({
  selector: 'app-ageingreport',
  templateUrl: './ageingreport.component.html',
  styleUrls: ['./ageingreport.component.css']
})
export class AgeingReportComponent implements OnInit {

  isLoading = false;
  userName = '';
  today = '';

  filterForm!: FormGroup;
  groupedParties: PartyGroup[] = [];
  grandTotals: BucketTotals = this.emptyBucket();

  private readonly G1 = [78, 170, 57];
  private readonly WHT = [255, 255, 255];
  private readonly MID = [237, 246, 235];

  constructor(
    private fb: FormBuilder,
    private svc: AgeingReportService,
    private alertService: AlertService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.today = new Date().toISOString().split('T')[0];
    this.buildForm();
  }

  buildForm(): void {
    this.filterForm = this.fb.group({
      reportType: ['Debtors', Validators.required],
      reportDate: [null, Validators.required]
    });
  }

  isInvalid(ctrl: string): boolean {
    const c = this.filterForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.filterForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  // ── Load ──────────────────────────────────────────────────────────────
  onRetrieve(): void {
    this.filterForm.markAllAsTouched();
    if (this.filterForm.invalid) return;
    const v = this.filterForm.value;
    this.isLoading = true;
    this.groupedParties = [];
    this.grandTotals = this.emptyBucket();

    this.svc.getAgeingReport({ reportType: v.reportType, reportDate: v.reportDate })
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.info(resp?.message || 'No records found.');
            return;
          }
          const rows: AgeingRow[] = Array.isArray(resp?.data) ? resp.data : [];
          this.groupedParties = this.buildGroups(rows);
          this.grandTotals = this.calcGrandTotals();
          this.cdr.detectChanges();
        },
        error: () => this.alertService.error('Failed to retrieve Ageing report.')
      });
  }

  onClose(): void {
    this.groupedParties = [];
    this.grandTotals = this.emptyBucket();
    this.filterForm.reset({ reportType: 'Debtors' });
    this.filterForm.markAsPristine();
    this.filterForm.markAsUntouched();
  }

  // ── Group flat rows into party groups ─────────────────────────────────
  private buildGroups(rows: AgeingRow[]): PartyGroup[] {
    const map = new Map<string, PartyGroup>();

    for (const row of rows) {
      const key = `${row.accountCode}||${row.subAccountCode}`;
      if (!map.has(key)) {
        map.set(key, {
          accountCode: row.accountCode,
          subAccountCode: row.subAccountCode,
          partyName: row.partyName,
          bills: [],
          payments: [],
          billTotals: this.emptyBucket(),
          paymentTotals: this.emptyBucket(),
          partyTotals: this.emptyBucket()
        });
      }
      const grp = map.get(key)!;
      if (row.nature === 'Bills') grp.bills.push(row);
      else grp.payments.push(row);
    }

    for (const grp of map.values()) {
      grp.billTotals = this.sumRows(grp.bills);
      grp.paymentTotals = this.sumRows(grp.payments);
      grp.partyTotals = this.addBuckets(grp.billTotals, grp.paymentTotals);
    }

    return Array.from(map.values());
  }

  private calcGrandTotals(): BucketTotals {
    return this.groupedParties.reduce(
      (acc, g) => this.addBuckets(acc, g.partyTotals),
      this.emptyBucket()
    );
  }

  private sumRows(rows: AgeingRow[]): BucketTotals {
    return rows.reduce((acc, r) => ({
      bucket0_30: acc.bucket0_30 + (r.bucket0_30 || 0),
      bucket30_45: acc.bucket30_45 + (r.bucket30_45 || 0),
      bucket46_90: acc.bucket46_90 + (r.bucket46_90 || 0),
      bucket91_120: acc.bucket91_120 + (r.bucket91_120 || 0),
      bucket121_180: acc.bucket121_180 + (r.bucket121_180 || 0),
      bucket180Plus: acc.bucket180Plus + (r.bucket180Plus || 0),
      total: acc.total + (r.total || 0)
    }), this.emptyBucket());
  }

  private addBuckets(a: BucketTotals, b: BucketTotals): BucketTotals {
    return {
      bucket0_30: a.bucket0_30 + b.bucket0_30,
      bucket30_45: a.bucket30_45 + b.bucket30_45,
      bucket46_90: a.bucket46_90 + b.bucket46_90,
      bucket91_120: a.bucket91_120 + b.bucket91_120,
      bucket121_180: a.bucket121_180 + b.bucket121_180,
      bucket180Plus: a.bucket180Plus + b.bucket180Plus,
      total: a.total + b.total
    };
  }

  private emptyBucket(): BucketTotals {
    return {
      bucket0_30: 0, bucket30_45: 0, bucket46_90: 0,
      bucket91_120: 0, bucket121_180: 0, bucket180Plus: 0, total: 0
    };
  }

  // ── PDF ───────────────────────────────────────────────────────────────
  downloadPdf(): void {
    if (!this.groupedParties.length) return;
    const v = this.filterForm.value;
    const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const fmtN = (n: number) => n === 0 ? '' :
      n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtD = (d: any) => d ? new Date(d).toLocaleDateString('en-GB') : '';

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...this.G1);
    const title = `${v.reportType} Ageing Analysis — As at ${v.reportDate}`;
    doc.text(title, 210, 12, { align: 'center' });

    const cols = ['Voucher No', 'Vchr Date', 'Bill No', 'Bill Due Dt',
      '<= 30', '31 to 45', '46 to 90', '91 to 120', '121 to 180', '> 180', 'Total', 'Days'];
    const numCols = [4, 5, 6, 7, 8, 9, 10];
    const body: any[][] = [];

    for (const party of this.groupedParties) {
      body.push([{ content: `${party.accountCode} ${party.subAccountCode} : ${party.partyName}`, colSpan: 12, styles: { fontStyle: 'bold', fillColor: [232, 245, 233] } }]);

      if (party.bills.length > 0) {
        body.push([{ content: 'Bills', colSpan: 12, styles: { halign: 'center', fontStyle: 'italic', textColor: [100, 100, 100] } }]);
        for (const r of party.bills) {
          body.push([r.vchrNumber, fmtD(r.vchrDate), r.billNo, fmtD(r.billDueDate),
          fmtN(r.bucket0_30), fmtN(r.bucket30_45), fmtN(r.bucket46_90),
          fmtN(r.bucket91_120), fmtN(r.bucket121_180), fmtN(r.bucket180Plus),
          fmtN(r.total), r.daysOutstanding]);
        }
        body.push(['', '', '', 'Total Bills',
          fmtN(party.billTotals.bucket0_30), fmtN(party.billTotals.bucket30_45),
          fmtN(party.billTotals.bucket46_90), fmtN(party.billTotals.bucket91_120),
          fmtN(party.billTotals.bucket121_180), fmtN(party.billTotals.bucket180Plus),
          fmtN(party.billTotals.total), '']);
      }

      if (party.payments.length > 0) {
        body.push([{ content: 'Payments', colSpan: 12, styles: { halign: 'center', fontStyle: 'italic', textColor: [100, 100, 100] } }]);
        for (const r of party.payments) {
          body.push([r.vchrNumber, fmtD(r.vchrDate), r.billNo, fmtD(r.billDueDate),
          fmtN(r.bucket0_30), fmtN(r.bucket30_45), fmtN(r.bucket46_90),
          fmtN(r.bucket91_120), fmtN(r.bucket121_180), fmtN(r.bucket180Plus),
          fmtN(r.total), r.daysOutstanding]);
        }
        body.push(['', '', '', 'Total Payments',
          fmtN(party.paymentTotals.bucket0_30), fmtN(party.paymentTotals.bucket30_45),
          fmtN(party.paymentTotals.bucket46_90), fmtN(party.paymentTotals.bucket91_120),
          fmtN(party.paymentTotals.bucket121_180), fmtN(party.paymentTotals.bucket180Plus),
          fmtN(party.paymentTotals.total), '']);
      }

      body.push([{ content: '', colSpan: 3 }, 'Total for Party',
      fmtN(party.partyTotals.bucket0_30), fmtN(party.partyTotals.bucket30_45),
      fmtN(party.partyTotals.bucket46_90), fmtN(party.partyTotals.bucket91_120),
      fmtN(party.partyTotals.bucket121_180), fmtN(party.partyTotals.bucket180Plus),
      fmtN(party.partyTotals.total), '']);
    }

    // Grand Total
    body.push([{ content: '', colSpan: 3 }, 'Grand Total',
    fmtN(this.grandTotals.bucket0_30), fmtN(this.grandTotals.bucket30_45),
    fmtN(this.grandTotals.bucket46_90), fmtN(this.grandTotals.bucket91_120),
    fmtN(this.grandTotals.bucket121_180), fmtN(this.grandTotals.bucket180Plus),
    fmtN(this.grandTotals.total), '']);

    (doc as any).autoTable({
      head: [cols],
      body,
      startY: 18,
      styles: { fontSize: 6, cellPadding: 1.2 },
      headStyles: { fillColor: this.G1, textColor: this.WHT, fontStyle: 'bold', halign: 'center' },
      alternateRowStyles: { fillColor: this.MID },
      columnStyles: {
        ...Object.fromEntries(numCols.map(i => [i, { halign: 'right' }])),
        0: { cellWidth: 24 }, 2: { cellWidth: 18 }
      },
      didParseCell: (data: any) => {
        const lastIdx = body.length - 1;
        if (data.row.index === lastIdx) {
          data.cell.styles.fillColor = this.G1;
          data.cell.styles.textColor = this.WHT;
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    doc.save(`${v.reportType}Ageing_${v.reportDate}.pdf`);
  }

  // ── Excel ─────────────────────────────────────────────────────────────
  downloadExcel(): void {
    if (!this.groupedParties.length) return;
    const v = this.filterForm.value;
    const wb = XLSX.utils.book_new();
    const aoaRows: any[][] = [];
    const rowTypes: string[] = [];
    const fmtN = (n: number) => n === 0 ? null : n;
    const fmtD = (d: any) => d ? new Date(d).toLocaleDateString('en-GB') : '';
    const HDR = ['Voucher No', 'Vchr Date', 'Bill No', 'Bill Due Dt',
      '<= 30', '31 to 45', '46 to 90', '91 to 120', '121 to 180', '> 180', 'Total', 'Days'];

    aoaRows.push([`${v.reportType} Ageing Analysis — As at ${v.reportDate}`, ...Array(11).fill('')]);
    rowTypes.push('title');
    aoaRows.push(Array(12).fill(''));
    rowTypes.push('blank');
    aoaRows.push(HDR);
    rowTypes.push('header');

    for (const party of this.groupedParties) {
      aoaRows.push([`${party.accountCode} ${party.subAccountCode} : ${party.partyName}`, ...Array(11).fill('')]);
      rowTypes.push('party');

      if (party.bills.length > 0) {
        aoaRows.push(['Bills', ...Array(11).fill('')]);
        rowTypes.push('section');
        for (const r of party.bills) {
          aoaRows.push([r.vchrNumber, fmtD(r.vchrDate), r.billNo, fmtD(r.billDueDate),
          fmtN(r.bucket0_30), fmtN(r.bucket30_45), fmtN(r.bucket46_90),
          fmtN(r.bucket91_120), fmtN(r.bucket121_180), fmtN(r.bucket180Plus),
          fmtN(r.total), r.daysOutstanding]);
          rowTypes.push('data');
        }
        aoaRows.push(['', '', '', 'Total Bills',
          party.billTotals.bucket0_30, party.billTotals.bucket30_45,
          party.billTotals.bucket46_90, party.billTotals.bucket91_120,
          party.billTotals.bucket121_180, party.billTotals.bucket180Plus,
          party.billTotals.total, '']);
        rowTypes.push('subtotal');
      }

      if (party.payments.length > 0) {
        aoaRows.push(['Payments', ...Array(11).fill('')]);
        rowTypes.push('section');
        for (const r of party.payments) {
          aoaRows.push([r.vchrNumber, fmtD(r.vchrDate), r.billNo, fmtD(r.billDueDate),
          fmtN(r.bucket0_30), fmtN(r.bucket30_45), fmtN(r.bucket46_90),
          fmtN(r.bucket91_120), fmtN(r.bucket121_180), fmtN(r.bucket180Plus),
          fmtN(r.total), r.daysOutstanding]);
          rowTypes.push('data');
        }
        aoaRows.push(['', '', '', 'Total Payments',
          party.paymentTotals.bucket0_30, party.paymentTotals.bucket30_45,
          party.paymentTotals.bucket46_90, party.paymentTotals.bucket91_120,
          party.paymentTotals.bucket121_180, party.paymentTotals.bucket180Plus,
          party.paymentTotals.total, '']);
        rowTypes.push('subtotal');
      }

      aoaRows.push(['', '', '', 'Total for Party',
        party.partyTotals.bucket0_30, party.partyTotals.bucket30_45,
        party.partyTotals.bucket46_90, party.partyTotals.bucket91_120,
        party.partyTotals.bucket121_180, party.partyTotals.bucket180Plus,
        party.partyTotals.total, '']);
      rowTypes.push('partytotal');
    }

    aoaRows.push(['', '', '', 'Grand Total',
      this.grandTotals.bucket0_30, this.grandTotals.bucket30_45,
      this.grandTotals.bucket46_90, this.grandTotals.bucket91_120,
      this.grandTotals.bucket121_180, this.grandTotals.bucket180Plus,
      this.grandTotals.total, '']);
    rowTypes.push('gtotal');

    const ws = XLSX.utils.aoa_to_sheet(aoaRows);
    ws['!cols'] = [
      { wch: 20 }, { wch: 10 }, { wch: 14 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 6 }
    ];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }];

    const G1H = 'FF4EAA39';
    const numCols = [4, 5, 6, 7, 8, 9, 10];
    aoaRows.forEach((row, ri) => {
      const type = rowTypes[ri];
      row.forEach((_, ci) => {
        const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };
        const isNum = numCols.includes(ci) && ['data', 'subtotal', 'partytotal', 'gtotal'].includes(type);
        ws[addr].s = {
          font: type === 'title' ? { bold: true, sz: 12, color: { rgb: G1H } }
            : type === 'header' || type === 'gtotal' ? { bold: true, color: { rgb: 'FFFFFFFF' } }
              : type === 'party' ? { bold: true }
                : type === 'partytotal' || type === 'subtotal' ? { bold: true }
                  : {},
          fill: type === 'header' || type === 'gtotal' ? { fgColor: { rgb: G1H } }
            : type === 'party' ? { fgColor: { rgb: 'FFE8F5E9' } }
              : type === 'partytotal' ? { fgColor: { rgb: 'FFC8E6C9' } }
                : type === 'subtotal' ? { fgColor: { rgb: 'FFF1F8E9' } }
                  : type === 'data' && ri % 2 === 0 ? { fgColor: { rgb: 'FFEDF6EB' } } : {},
          alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center' },
          numFmt: isNum ? '#,##0.00' : undefined
        };
      });
    });

    XLSX.utils.book_append_sheet(wb, ws, `${v.reportType} Ageing`);
    XLSX.writeFile(wb, `${v.reportType}Ageing_${v.reportDate}.xlsx`);
  }
}
