import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { VendorService } from 'src/app/shared/services/master/vendor.service';

export interface ImportVendorRow {
  code: string;
  name: string;
  add1: string;
  add2: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  phoneNo: string;
  faxNo: string;
  emailId: string;
  panNo: string;
  tinNo: string;
  eccNo: string;
  _selected: boolean;
  _accountCode: string;
}

@Component({
  selector: 'app-importsupplier',
  templateUrl: './importsupplier.component.html',
  styleUrls: ['./importsupplier.component.css']
})
export class ImportSupplierComponent implements OnInit {

  isLoading = false;
  userName = '';
  searchText = '';
  sourceType: 'supplier' | 'vendor' = 'supplier';

  importList: ImportVendorRow[] = [];
  vendorAccounts: { accountCode: string; description: string }[] = [];

  constructor(
    private svc: VendorService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.loadVendorAccounts();
    this.loadImportList();
  }

  get filteredList(): ImportVendorRow[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.importList;
    return this.importList.filter(r =>
      r.code?.toLowerCase().includes(q) ||
      r.name?.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q)
    );
  }

  onSourceChange(): void {
    this.importList = [];
    this.searchText = '';
    this.loadImportList();
  }

  selectedRows(): ImportVendorRow[] {
    return this.importList.filter(r => r._selected);
  }

  allSelected(): boolean {
    const f = this.filteredList;
    return f.length > 0 && f.every(r => r._selected);
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredList.forEach(r => (r._selected = checked));
  }

  onRowSelect(row: ImportVendorRow): void { }

  loadVendorAccounts(): void {
    this.svc.getVendorAccounts().subscribe({
      next: (resp: any) => {
        this.vendorAccounts = Array.isArray(resp?.data) ? resp.data : [];
        this.cd.detectChanges();
      },
      error: () => this.alertService.error('Failed to load accounts.')
    });
  }

  loadImportList(): void {
    this.isLoading = true;
    const obs$ = this.sourceType === 'supplier'
      ? this.svc.getImportableSuppliers()
      : this.svc.getImportableVendors();

    obs$.pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          const raw: any[] = Array.isArray(resp?.data) ? resp.data : [];
          this.importList = raw.map(r => ({ ...r, _selected: false, _accountCode: '' }));
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load import vendors.')
      });
  }

  onSaveRow(row: ImportVendorRow): void {
    if (!row._accountCode) {
      this.alertService.warning('Please select an account for this vendor.');
      return;
    }
    this.isLoading = true;
    this.svc.importVendor(this.buildPayload(row))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Import failed.');
            return;
          }
          this.alertService.success(resp?.message || `Vendor ${row.code} - ${row.name} imported.`);
          this.importList = this.importList.filter(r => r.code !== row.code);
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Import failed.')
      });
  }

  onSaveAll(): void {
    const rows = this.selectedRows();
    if (rows.length === 0) { this.alertService.warning('No rows selected.'); return; }

    const missing = rows.filter(r => !r._accountCode);
    if (missing.length > 0) {
      this.alertService.warning('Please select an account for: ' + missing.map(r => r.code).join(', '));
      return;
    }

    this.isLoading = true;
    this.svc.importVendors(rows.map(r => this.buildPayload(r)))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Bulk import failed.');
            return;
          }
          const imported = rows.map(r => r.code);
          this.alertService.success(resp?.message || `${imported.length} vendor(s) imported.`);
          this.importList = this.importList.filter(r => !imported.includes(r.code));
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Bulk import failed.')
      });
  }

  private buildPayload(row: ImportVendorRow): any {
    return {
      vendorCode: row.code,
      vendorName: row.name,
      vendorType: 'INLND',
      addrLine1: row.add1 || null,
      addrLine2: row.add2 || null,
      addrCity: row.city || null,
      addrPin: row.pinCode || null,
      addrState: row.state || null,
      addrCountry: row.country || null,
      panNumber: row.panNo || null,
      tinNumber: row.tinNo || null,
      eccNumber: row.eccNo || null,
      objectStatus: 'ACTVE',
      accountCode: row._accountCode,
      source: this.sourceType,
      username: this.userName,
      location: 'BILZ'
    };
  }
}