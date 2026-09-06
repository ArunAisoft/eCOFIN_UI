import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { EmployeeService } from 'src/app/shared/services/master/employee.service';

export interface ImportEmployeeRow {
  empNo:    string;
  name:     string;
  padd1:    string;
  padd2:    string;
  pCity:    string;
  pState:   string;
  pincode:  string;
  pcountry: string;
  tel:      string;
  mobile:   string;
  reportto: string;
  bankaccno:string;
  _selected:    boolean;
  _accountCode: string;
}

@Component({
  selector: 'app-importemployee',
  templateUrl: './importemployee.component.html',
  styleUrls: ['./importemployee.component.css']
})
export class ImportEmployeeComponent implements OnInit {

  isLoading  = false;
  userName   = '';
  searchText = '';

  importList:  ImportEmployeeRow[] = [];
  accountList: { accountCode: string; description: string }[] = [];

  constructor(
    private svc:          EmployeeService,
    private alertService: AlertService,
    private cd:           ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.loadEmpAccounts();
    this.loadImportList();
  }

  get filteredList(): ImportEmployeeRow[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.importList;
    return this.importList.filter(r =>
      r.empNo?.toLowerCase().includes(q) ||
      r.name?.toLowerCase().includes(q)  ||
      r.pCity?.toLowerCase().includes(q)
    );
  }

  selectedRows(): ImportEmployeeRow[] {
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

  onRowSelect(row: ImportEmployeeRow): void {}

  loadEmpAccounts(): void {
    this.svc.getEmpAccounts().subscribe({
      next: (resp: any) => {
        this.accountList = Array.isArray(resp?.data) ? resp.data : [];
        this.cd.detectChanges();
      },
      error: () => this.alertService.error('Failed to load accounts.')
    });
  }

  loadImportList(): void {
    this.isLoading = true;
    this.svc.getPendingPersonnel()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          const raw: any[] = Array.isArray(resp?.data) ? resp.data : [];
          this.importList = raw.map(r => ({ ...r, _selected: false, _accountCode: '' }));
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load import employees.')
      });
  }

  onSaveRow(row: ImportEmployeeRow): void {
    if (!row._accountCode) {
      this.alertService.warning('Please select an account for this employee.');
      return;
    }
    this.isLoading = true;
    this.svc.importEmployee(this.buildPayload(row))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Import failed.');
            return;
          }
          this.alertService.success(resp?.message || `Employee ${row.empNo} - ${row.name} imported.`);
          this.importList = this.importList.filter(r => r.empNo !== row.empNo);
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
      this.alertService.warning('Please select an account for: ' + missing.map(r => r.empNo).join(', '));
      return;
    }

    this.isLoading = true;
    this.svc.importEmployees(rows.map(r => this.buildPayload(r)))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Bulk import failed.');
            return;
          }
          const imported = rows.map(r => r.empNo);
          this.alertService.success(resp?.message || `${imported.length} employee(s) imported.`);
          this.importList = this.importList.filter(r => !imported.includes(r.empNo));
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Bulk import failed.')
      });
  }

  private buildPayload(row: ImportEmployeeRow): any {
    return {
      employeeCode:  row.empNo,
      employeeName:  row.name,
      bankAccount:   row.bankaccno  || null,
      reportTo:      row.reportto   || null,
      addrLine1:     row.padd1      || null,
      addrLine2:     row.padd2      || null,
      addrCity:      row.pCity      || null,
      addrPin:       row.pincode    || null,
      addrState:     row.pState     || null,
      addrCountry:   row.pcountry   || null,
      commTelephone1: row.tel       || null,
      commTelephone2: row.mobile    || null,
      accountCode:   row._accountCode,
      objectStatus:  'ACTVE',
      username:      this.userName,
      location:      'BILZ'
    };
  }
}