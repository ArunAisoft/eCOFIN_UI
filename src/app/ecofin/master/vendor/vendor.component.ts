import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { VendorService } from 'src/app/shared/services/master/vendor.service';

@Component({
  selector: 'app-vendor',
  templateUrl: './vendor.component.html',
  styleUrls: ['./vendor.component.css']
})
export class VendorComponent implements OnInit {

  isLoading = false;
  isSegSaving = false;
  userName = '';
  isEditMode = false;
  editingCode = '';
  searchText = '';

  vendorForm!: FormGroup;
  vendorList: any[] = [];

  showSegmentPopup = false;
  segmentForm!: FormGroup;
  vendorAccounts: any[] = [];

  readonly statusOptions = [
    { value: 'ACTVE', label: 'Active' },
    { value: 'INACT', label: 'Inactive' },
    { value: 'OBSLT', label: 'Obsolete' }
  ];

  readonly vendorTypeOptions = [
    { value: 'INLND', label: 'Inland' },
    { value: 'FORGN', label: 'Foreign' }
  ];

  readonly vendorCategoryOptions = [
    { value: 'PURC', label: 'Purchase' },
    { value: 'NSSI', label: 'Non-SSI' },
    { value: 'SSI', label: 'SSI' },
    { value: 'REGLR', label: 'Regular' },
    { value: 'SUBCN', label: 'Sub-Contractor' }
  ];

  readonly vendorStatusOptions = [
    { value: 'VREG', label: 'Regular' },
    { value: 'VBLL', label: 'Block Listed' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: VendorService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.buildForm();
    this.buildSegmentForm();
    this.loadVendors();
    this.loadVendorAccounts();
  }

  get filteredCustomerList(): any[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.vendorList;
    return this.vendorList.filter(r =>
      r.vendorCode?.toLowerCase().includes(q) ||
      r.vendorName?.toLowerCase().includes(q) ||
      r.vendorType?.toLowerCase().includes(q) ||
      r.vendorCategory?.toLowerCase().includes(q) ||
      r.panNumber?.toLowerCase().includes(q) ||
      r.addrLine1?.toLowerCase().includes(q) ||
      r.addrLine2?.toLowerCase().includes(q) ||
      r.addrCity?.toLowerCase().includes(q) ||
      r.addrState?.toLowerCase().includes(q)
    );
  }

  buildForm(): void {
    this.vendorForm = this.fb.group({
      vendorCode: ['', [Validators.required, Validators.maxLength(10)]],
      vendorName: ['', [Validators.required, Validators.maxLength(100)]],
      vendorType: [''],
      vendorCategory: [''],
      panNumber: ['', Validators.maxLength(50)],
      lstNumber: ['', Validators.maxLength(100)],
      cstNumber: ['', Validators.maxLength(100)],
      tinNumber: ['', Validators.maxLength(100)],
      serviceTax: ['', Validators.maxLength(100)],
      eccNumber: ['', Validators.maxLength(100)],
      vendorStatus: [''],
      objectStatus: ['ACTVE', Validators.required],
      addrLine1: ['', Validators.maxLength(100)],
      addrLine2: ['', Validators.maxLength(100)],
      addrLine3: ['', Validators.maxLength(100)],
      addrLine4: ['', Validators.maxLength(100)],
      addrCity: ['', Validators.maxLength(50)],
      addrPin: ['', Validators.maxLength(10)],
      addrState: ['', Validators.maxLength(50)],
      addrCountry: ['', Validators.maxLength(50)]
    });
  }

  buildSegmentForm(): void {
    this.segmentForm = this.fb.group({
      rows: this.fb.array([])
    });
  }

  get segmentRows(): FormArray {
    return this.segmentForm.get('rows') as FormArray;
  }

  private createSegmentRow(d: any = {}): FormGroup {
    return this.fb.group({
      accountCode: [d.accountCode ?? '', Validators.required],
      vendorStatus: [d.vendorStatus ?? 'ACTVE', Validators.required]
    });
  }

  addSegmentRow(): void {
    this.segmentRows.push(this.createSegmentRow());
  }

  removeSegmentRow(i: number): void {
    this.segmentRows.removeAt(i);
    if (this.segmentRows.length === 0) this.addSegmentRow();
  }

  isSegRowInvalid(row: AbstractControl, ctrl: string): boolean {
    const c = row.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  loadVendorAccounts(): void {
    this.svc.getVendorAccounts()
      .subscribe({
        next: (resp: any) => {
          this.vendorAccounts = Array.isArray(resp?.data) ? resp.data : [];
        },
        error: () => this.alertService.error('Failed to load credit accounts.')
      });
  }

  isInvalid(ctrl: string): boolean {
    const c = this.vendorForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.vendorForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  statusLabel(val: string): string { return this.statusOptions.find(x => x.value === val)?.label ?? val ?? ''; }
  vendorTypeLabel(val: string): string { return this.vendorTypeOptions.find(x => x.value === val)?.label ?? val ?? ''; }
  vendorCategoryLabel(val: string): string { return this.vendorCategoryOptions.find(x => x.value === val)?.label ?? val ?? ''; }
  vendorStatusLabel(val: string): string { return this.vendorStatusOptions.find(x => x.value === val)?.label ?? val ?? ''; }

  loadVendors(): void {
    this.isLoading = true;
    this.svc.getAllVendor()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.vendorList = Array.isArray(resp?.data) ? resp.data : [];
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load vendors.')
      });
  }

  onSave(): void {
    this.vendorForm.markAllAsTouched();
    if (this.vendorForm.invalid) return;

    const v = this.vendorForm.value;
    const code = v.vendorCode as string;

    if (!this.isEditMode) {
      const dup = this.vendorList.some(r => (r.vendorCode ?? '') === code);
      if (dup) { this.alertService.warning(`Vendor code '${code}' already exists.`); return; }
    }

    this.isLoading = true;
    this.svc.saveOrUpdateVendor(this.buildPayload(v))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) { this.alertService.warning(resp?.message || 'Failed to save.'); return; }
          this.alertService.success(resp?.message || (this.isEditMode ? 'Updated successfully.' : 'Saved successfully.'));
          this.onClear();
          this.loadVendors();
        },
        error: () => this.alertService.error(this.isEditMode ? 'Update failed.' : 'Save failed.')
      });
  }

  onClear(): void {
    this.isEditMode = false;
    this.editingCode = '';
    this.vendorForm.reset({ objectStatus: 'ACTVE', vendorType: '', vendorCategory: '', vendorStatus: '' });
    this.vendorForm.markAsPristine();
    this.vendorForm.markAsUntouched();
    this.vendorForm.get('vendorCode')?.enable();
    this.cd.detectChanges();
  }

  startEdit(row: any): void {
    this.isEditMode = true;
    this.editingCode = row.vendorCode;
    this.vendorForm.patchValue({
      vendorCode: row.vendorCode, vendorName: row.vendorName,
      vendorType: row.vendorType, vendorCategory: row.vendorCategory,
      panNumber: row.panNumber, lstNumber: row.lstNumber,
      cstNumber: row.cstNumber, tinNumber: row.tinNumber,
      serviceTax: row.serviceTax, eccNumber: row.eccNumber,
      vendorStatus: row.vendorStatus, objectStatus: row.objectStatus ?? 'ACTVE',
      addrLine1: row.addrLine1, addrLine2: row.addrLine2,
      addrLine3: row.addrLine3, addrLine4: row.addrLine4,
      addrCity: row.addrCity, addrPin: row.addrPin,
      addrState: row.addrState, addrCountry: row.addrCountry
    });
    this.vendorForm.get('vendorCode')?.disable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private buildPayload(v: any): any {
    return {
      vendorCode: this.isEditMode ? this.editingCode : (v.vendorCode as string),
      vendorName: v.vendorName,
      vendorType: v.vendorType || null,
      vendorCategory: v.vendorCategory || null,
      panNumber: v.panNumber || null,
      lstNumber: v.lstNumber || null,
      cstNumber: v.cstNumber || null,
      tinNumber: v.tinNumber || null,
      serviceTax: v.serviceTax || null,
      eccNumber: v.eccNumber || null,
      vendorStatus: v.vendorStatus || null,
      objectStatus: v.objectStatus ?? 'ACTVE',
      addrLine1: v.addrLine1 || null,
      addrLine2: v.addrLine2 || null,
      addrLine3: v.addrLine3 || null,
      addrLine4: v.addrLine4 || null,
      addrCity: v.addrCity || null,
      addrPin: v.addrPin || null,
      addrState: v.addrState || null,
      addrCountry: v.addrCountry || null,
      username: this.userName,
      location: 'BILZ'
    };
  }

  openSegmentPopup(vendorCode : string): void {
    if (!vendorCode) return;
    this.editingCode = vendorCode;
    this.segmentRows.clear();
    this.showSegmentPopup = true;
    this.isLoading = true;

    this.svc.getByVendor(this.editingCode)
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
      vendorCode: this.editingCode,
      rows: this.segmentRows.controls.map(r => ({
        accountCode: r.get('accountCode')?.value,
        vendorStatus: r.get('vendorStatus')?.value ?? 'ACTVE'
      }))
    };

    this.isSegSaving = true;
    this.svc.saveAccVendor(payload)
      .pipe(finalize(() => (this.isSegSaving = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) { this.alertService.warning(resp?.message || 'Failed to save.'); return; }
          this.alertService.success(resp?.message || 'Segment links saved successfully.');
          this.closeSegmentPopup();
        },
        error: () => this.alertService.error('Segment save failed.')
      });
  }
}