import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { EmployeeService } from 'src/app/shared/services/master/employee.service';

@Component({
  selector: 'app-employee',
  templateUrl: './employee.component.html'
})
export class EmployeeComponent implements OnInit {

  isLoading    = false;
  isSegSaving  = false;
  userName     = '';
  isEditMode   = false;
  editingCode  = '';
  searchText   = '';

  employeeForm!: FormGroup;
  employeeList: any[] = [];

  get filteredEmployeeList(): any[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.employeeList;
    return this.employeeList.filter(r =>
      r.employeeCode?.toLowerCase().includes(q) ||
      r.employeeName?.toLowerCase().includes(q) ||
      r.commTelephone1?.toLowerCase().includes(q) ||
      r.commEmail?.toLowerCase().includes(q) ||
      r.addrCity?.toLowerCase().includes(q) ||
      r.addrState?.toLowerCase().includes(q)
    );
  }

  showSegmentPopup = false;
  segmentForm!: FormGroup;
  empAccounts: any[] = [];

  readonly statusOptions = [
    { value: 'ACTVE',  label: 'Active'   },
    { value: 'INACT', label: 'Inactive' }
  ];

  readonly employeeTypeOptions = [
    { value: 'PERMT', label: 'Permanent' },
    { value: 'CNTRC', label: 'Contract'  },
    { value: 'TMPRY', label: 'Temporary' },
    { value: 'PRTIM', label: 'Part-Time' }
  ];

  constructor(
    private fb:           FormBuilder,
    private svc:          EmployeeService,
    private alertService: AlertService,
    private cd:           ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.buildForm();
    this.buildSegmentForm();
    this.loadEmpAccounts();
    this.loadEmployees();
  }

  buildForm(): void {
    this.employeeForm = this.fb.group({
      employeeCode:     ['', [Validators.required, Validators.maxLength(10)]],
      employeeName:     ['', [Validators.required, Validators.maxLength(100)]],
      employeeType:     ['', Validators.maxLength(5)],
      bankAccount:      ['', Validators.maxLength(15)],
      reportTo:         ['', Validators.maxLength(10)],
      objectStatus:     ['ACTVE', Validators.required],
      addrLine1:        ['', Validators.maxLength(100)],
      addrLine2:        ['', Validators.maxLength(100)],
      addrLine3:        ['', Validators.maxLength(100)],
      addrLine4:        ['', Validators.maxLength(100)],
      addrCity:         ['', Validators.maxLength(50)],
      addrPin:          ['', Validators.maxLength(10)],
      addrState:        ['', Validators.maxLength(50)],
      addrCountry:      ['', Validators.maxLength(50)],
      commTelephone1:   ['', Validators.maxLength(15)],
      commTelephone2:   ['', Validators.maxLength(15)],
      commEmail:        ['', [Validators.maxLength(80), Validators.email]],
      commTelexno:      ['', Validators.maxLength(80)],
      commFaxno:        ['', Validators.maxLength(80)],
      commGrams:        ['', Validators.maxLength(80)],
      commContactperson:['', Validators.maxLength(80)]
    });
  }

  buildSegmentForm(): void {
    this.segmentForm = this.fb.group({ rows: this.fb.array([]) });
  }

  get segmentRows(): FormArray {
    return this.segmentForm.get('rows') as FormArray;
  }

  private createSegmentRow(d: any = {}): FormGroup {
    return this.fb.group({
      accountCode:    [d.accountCode    ?? '', Validators.required],
      employeeStatus: [d.employeeStatus ?? 'ACTVE', Validators.required]
    });
  }

  addSegmentRow(): void { this.segmentRows.push(this.createSegmentRow()); }

  removeSegmentRow(i: number): void {
    this.segmentRows.removeAt(i);
    if (this.segmentRows.length === 0) this.addSegmentRow();
  }

  isSegRowInvalid(row: AbstractControl, ctrl: string): boolean {
    const c = row.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  loadEmpAccounts(): void {
    this.svc.getEmployeeAccounts().subscribe({
      next: (resp: any) => {
        this.empAccounts = Array.isArray(resp?.data) ? resp.data : [];
      },
      error: () => this.alertService.error('Failed to load employee accounts.')
    });
  }

  isInvalid(ctrl: string): boolean {
    const c = this.employeeForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.employeeForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  statusLabel(val: string): string {
    return this.statusOptions.find(x => x.value === val)?.label ?? val ?? '';
  }

  employeeTypeLabel(val: string): string {
    return this.employeeTypeOptions.find(x => x.value === val)?.label ?? val ?? '';
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.svc.getAllEmployee()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.employeeList = Array.isArray(resp?.data) ? resp.data : [];
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load employees.')
      });
  }

  onSave(): void {
    this.employeeForm.markAllAsTouched();
    if (this.employeeForm.invalid) return;

    const v    = this.employeeForm.value;
    const code = v.employeeCode as string;

    if (!this.isEditMode) {
      const duplicate = this.employeeList.some(r => (r.employeeCode ?? '') === code);
      if (duplicate) {
        this.alertService.warning(`Employee code '${code}' already exists.`);
        return;
      }
    }

    this.isLoading = true;
    this.svc.saveOrUpdateEmployee(this.buildPayload(v))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Failed to save.');
            return;
          }
          this.alertService.success(
            resp?.message || (this.isEditMode ? 'Updated successfully.' : 'Saved successfully.')
          );
          this.onClear();
          this.loadEmployees();
        },
        error: () => this.alertService.error(this.isEditMode ? 'Update failed.' : 'Save failed.')
      });
  }

  onClear(): void {
    this.isEditMode  = false;
    this.editingCode = '';
    this.employeeForm.reset({ objectStatus: 'ACTVE' });
    this.employeeForm.markAsPristine();
    this.employeeForm.markAsUntouched();
    this.employeeForm.get('employeeCode')?.enable();
  }

  startEdit(row: any): void {
    this.isEditMode  = true;
    this.editingCode = row.employeeCode;

    this.employeeForm.patchValue({
      employeeCode:     row.employeeCode,
      employeeName:     row.employeeName,
      employeeType:     row.employeeType,
      bankAccount:      row.bankAccount,
      reportTo:         row.reportTo,
      objectStatus:     row.objectStatus ?? 'ACTVE',
      addrLine1:        row.addrLine1,
      addrLine2:        row.addrLine2,
      addrLine3:        row.addrLine3,
      addrLine4:        row.addrLine4,
      addrCity:         row.addrCity,
      addrPin:          row.addrPin,
      addrState:        row.addrState,
      addrCountry:      row.addrCountry,
      commTelephone1:   row.commTelephone1,
      commTelephone2:   row.commTelephone2,
      commEmail:        row.commEmail,
      commTelexno:      row.commTelexno,
      commFaxno:        row.commFaxno,
      commGrams:        row.commGrams,
      commContactperson:row.commContactperson
    });

    this.employeeForm.get('employeeCode')?.disable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private buildPayload(v: any): any {
    return {
      employeeCode:     this.isEditMode ? this.editingCode : (v.employeeCode as string),
      employeeName:     v.employeeName as string,
      employeeType:     v.employeeType      || null,
      bankAccount:      v.bankAccount       || null,
      reportTo:         v.reportTo          || null,
      objectStatus:     v.objectStatus      ?? 'ACTVE',
      addrLine1:        v.addrLine1         || null,
      addrLine2:        v.addrLine2         || null,
      addrLine3:        v.addrLine3         || null,
      addrLine4:        v.addrLine4         || null,
      addrCity:         v.addrCity          || null,
      addrPin:          v.addrPin           || null,
      addrState:        v.addrState         || null,
      addrCountry:      v.addrCountry       || null,
      commTelephone1:   v.commTelephone1    || null,
      commTelephone2:   v.commTelephone2    || null,
      commEmail:        v.commEmail         || null,
      commTelexno:      v.commTelexno       || null,
      commFaxno:        v.commFaxno         || null,
      commGrams:        v.commGrams         || null,
      commContactperson:v.commContactperson || null,
      username:         this.userName,
      location:         'BILZ'
    };
  }

  openSegmentPopup(empCode : string): void {
    if (!empCode) return;
    this.editingCode = empCode;
    this.segmentRows.clear();
    this.showSegmentPopup = true;
    this.isLoading = true;

    this.svc.getByEmployee(empCode)
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          const list: any[] = Array.isArray(resp?.data) ? resp.data : [];
          this.segmentRows.clear();
          list.forEach(item => this.segmentRows.push(this.createSegmentRow(item)));
          if (this.segmentRows.length === 0) this.addSegmentRow();
          this.cd.detectChanges();
        },
        error: () => {
          this.alertService.error('Failed to load segment links.');
          if (this.segmentRows.length === 0) this.addSegmentRow();
          this.cd.detectChanges();
        }
      });
  }

  closeSegmentPopup(): void {
    this.showSegmentPopup = false;
    this.segmentRows.clear();
    this.segmentForm.markAsPristine();
    this.segmentForm.markAsUntouched();
  }

  saveSegment(): void {
    this.segmentForm.markAllAsTouched();
    if (this.segmentForm.invalid) return;

    const payload = {
      employeeCode: this.editingCode,
      rows: this.segmentRows.controls.map(r => ({
        accountCode:    r.get('accountCode')?.value,
        employeeStatus: r.get('employeeStatus')?.value ?? 'ACTVE'
      }))
    };

    this.isSegSaving = true;
    this.svc.saveAccEmployee(payload)
      .pipe(finalize(() => (this.isSegSaving = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Failed to save.');
            return;
          }
          this.alertService.success(resp?.message || 'Segment links saved successfully.');
          this.closeSegmentPopup();
        },
        error: () => this.alertService.error('Segment save failed.')
      });
  }
}