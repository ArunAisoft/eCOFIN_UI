import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { CustomerService } from 'src/app/shared/services/master/customer.service';

export interface ImportCustomerRow {
  custcode: string;
  coname: string;
  add1: string;
  add2: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
  type: string;
  phoneno0: string;
  faxno0: string;
  mail0: string;
  cstdate: string;
  _selected: boolean;
  _accountCode: string;
}

@Component({
  selector: 'app-importcustomer',
  templateUrl: './importcustomer.component.html',
  styleUrls: ['./importcustomer.component.css']
})
export class ImportCustomerComponent implements OnInit {

  isLoading = false;
  userName = '';
  searchText = '';

  importList: ImportCustomerRow[] = [];
  accountList: { accountCode: string; description: string }[] = [];

  constructor(
    private svc: CustomerService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.loadAccounts();
    this.loadImportList();
  }

  get filteredList(): ImportCustomerRow[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.importList;
    return this.importList.filter(r =>
      r.custcode?.toLowerCase().includes(q) ||
      r.coname?.toLowerCase().includes(q) ||
      r.city?.toLowerCase().includes(q)
    );
  }

  selectedRows(): ImportCustomerRow[] {
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

  onRowSelect(row: ImportCustomerRow): void {
  }

  loadAccounts(): void {
    this.svc.getDebtorAccounts().subscribe({
      next: (resp: any) => {
        this.accountList = Array.isArray(resp?.data) ? resp.data : [];
        this.cd.detectChanges();
      },
      error: () => this.alertService.error('Failed to load accounts.')
    });
  }

  loadImportList(): void {
    this.isLoading = true;
    this.svc.getImportableCustomers()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          const raw: any[] = Array.isArray(resp?.data) ? resp.data : [];
          this.importList = raw.map(r => ({ ...r, _selected: false, _accountCode: '' }));
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load import customers.')
      });
  }

  onSaveRow(row: ImportCustomerRow): void {
    if (!row._accountCode) {
      this.alertService.warning('Please select an account for this customer.');
      return;
    }
    this.isLoading = true;
    this.svc.importCustomer(this.buildPayload(row))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Import failed.');
            return;
          }
          this.alertService.success(resp?.message || `Customer ${row.custcode} - ${row.coname} imported.`);
          this.importList = this.importList.filter(r => r.custcode !== row.custcode);
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Import failed.')
      });
  }

  onSaveAll(): void {
    const rows = this.selectedRows();
    if (rows.length === 0) {
      this.alertService.warning('No rows selected.');
      return;
    }
    const missing = rows.filter(r => !r._accountCode);
    if (missing.length > 0) {
      this.alertService.warning(
        'Please select an account for: ' + missing.map(r => r.custcode).join(', ')
      );
      return;
    }
    this.isLoading = true;
    this.svc.importCustomers(rows.map(r => this.buildPayload(r)))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Bulk import failed.');
            return;
          }
          const imported = rows.map(r => r.custcode);
          this.alertService.success(resp?.message || `${imported.length} customer(s) imported.`);
          this.importList = this.importList.filter(r => !imported.includes(r.custcode));
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Bulk import failed.')
      });
  }

  private readonly typeMap: Record<string, string> = {
    'domestic': 'DOMES', 'export': 'EXPRT', 'internal': 'INTRN',
    'domes': 'DOMES', 'exprt': 'EXPRT', 'intrn': 'INTRN'
  };

  private mapCustomerType(val: string): string {
    return this.typeMap[val?.trim().toLowerCase()] ?? 'DOMES';
  }

  private buildPayload(row: ImportCustomerRow): any {
    return {
      customerCode: row.custcode,
      customerName: row.coname,
      customerType: this.mapCustomerType(row.type),
      addrLine1: row.add1 || null,
      addrLine2: row.add2 || null,
      addrCity: row.city || null,
      addrPin: row.pincode || null,
      addrState: row.state || null,
      addrCountry: row.country || null,
      commTelephone1: row.phoneno0 || null,
      commFaxno: row.faxno0 || null,
      commEmail: row.mail0 || null,
      cstNoDate: row.cstdate || null,
      objectStatus: 'ACTVE',
      accountCode: row._accountCode,
      username: this.userName,
      location: 'BILZ'
    };
  }
}