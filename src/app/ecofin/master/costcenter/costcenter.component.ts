import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { CostCenterService } from 'src/app/shared/services/master/costcenter.service';

@Component({
  selector: 'app-costcenter',
  templateUrl: './costcenter.component.html',
})
export class CostCenterComponent implements OnInit {

  isLoading = false;
  userName = '';
  form!: FormGroup;

  readonly statusOptions = [
    { value: 'ACTVE', label: 'Active' },
    { value: 'INACT', label: 'Inactive' },
    { value: 'OBSLT', label: 'Obsolete' }
  ];

  readonly centreTypeOptions = [
    { value: 'DIRCT', label: 'Direct' },
    { value: 'INDRCT', label: 'Indirect' },
    { value: 'OVRHD', label: 'Overhead' }
  ];

  readonly costCentreStatusOptions = [
    { value: 'ACTVE', label: 'Active' },
    { value: 'CLSD', label: 'Closed' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: CostCenterService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;

    this.form = this.fb.group({
      costCentres: this.fb.array([])
    });

    this.loadCostCentres();
  }

  get costCentres(): FormArray {
    return this.form.get('costCentres') as FormArray;
  }

  private createRow(d: any = {}): FormGroup {
    return this.fb.group({
      costCentreCode: [d.costCentreCode ?? '', [Validators.required, Validators.maxLength(10)]],
      description: [d.description ?? '', [Validators.required, Validators.maxLength(100)]],
      centreType: [d.centreType ?? '', Validators.maxLength(10)],
      costCentreStatus: [d.costCentreStatus ?? '', Validators.maxLength(10)],
      objectStatus: [d.objectStatus ?? 'ACTVE', Validators.required],
      isNew: [d.isNew ?? false],
      isEdit: [d.isEdit ?? false],
      _origDesc: [d.description ?? ''],
      _origType: [d.centreType ?? ''],
      _origCCStatus: [d.costCentreStatus ?? ''],
      _origStatus: [d.objectStatus ?? 'ACTVE']
    });
  }

  isRowInvalid(row: AbstractControl, controlName: string): boolean {
    const c = row.get(controlName);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasRowError(row: AbstractControl, controlName: string, error: string): boolean {
    const c = row.get(controlName);
    return !!(c && c.hasError(error) && (c.touched || c.dirty));
  }

  statusLabel(val: string): string {
    return this.statusOptions.find(x => x.value === val)?.label ?? val ?? '';
  }

  centreTypeLabel(val: string): string {
    return this.centreTypeOptions.find(x => x.value === val)?.label ?? val ?? '';
  }

  ccStatusLabel(val: string): string {
    return this.costCentreStatusOptions.find(x => x.value === val)?.label ?? val ?? '';
  }

  loadCostCentres(): void {
    this.isLoading = true;
    this.svc.getAllCostCentre()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          const list: any[] = Array.isArray(resp?.data) ? resp.data : [];
          this.costCentres.clear();
          this.costCentres.insert(0, this.createRow({ isNew: true }));
          list.forEach(item =>
            this.costCentres.push(this.createRow({
              costCentreCode: item.costCentreCode,
              description: item.description,
              centreType: item.centreType,
              costCentreStatus: item.costCentreStatus,
              objectStatus: item.objectStatus ?? 'ACTVE'
            }))
          );
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load cost centres.')
      });
  }

  saveNewRow(index: number): void {
    const row = this.costCentres.at(index) as FormGroup;
    row.markAllAsTouched();
    if (row.invalid) return;
    const code = (row.get('costCentreCode')?.value as string).trim().toUpperCase();
    const duplicate = this.costCentres.controls.some((r, i) => i !== index && !r.get('isNew')?.value && (r.get('costCentreCode')?.value ?? '').toString().toUpperCase() === code);
    if (duplicate) {
      this.alertService.warning(`Cost Centre code '${code}' already exists.`);
      return;
    }

    this.isLoading = true;
    this.svc.saveOrUpdateCostCentre(this.buildPayload(row))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Failed to save.');
            return;
          }
          this.alertService.success(resp?.message || 'Saved successfully.');
          this.loadCostCentres();
        },
        error: () => this.alertService.error('Save failed.')
      });
  }

  clearNewRow(index: number): void {
    const row = this.costCentres.at(index) as FormGroup;
    row.reset({
      costCentreCode: '',
      description: '',
      centreType: '',
      costCentreStatus: '',
      objectStatus: 'ACTVE',
      isNew: true,
      isEdit: false,
      _origDesc: '',
      _origType: '',
      _origCCStatus: '',
      _origStatus: 'ACTVE'
    });
    row.markAsPristine();
    row.markAsUntouched();
  }

  startEdit(i: number): void {
    const row = this.costCentres.at(i);
    row.patchValue({
      isEdit: true,
      _origDesc: row.get('description')?.value,
      _origType: row.get('centreType')?.value,
      _origCCStatus: row.get('costCentreStatus')?.value,
      _origStatus: row.get('objectStatus')?.value
    });
  }

  cancelEdit(i: number): void {
    const row = this.costCentres.at(i);
    row.patchValue({
      description: row.get('_origDesc')?.value,
      centreType: row.get('_origType')?.value,
      costCentreStatus: row.get('_origCCStatus')?.value,
      objectStatus: row.get('_origStatus')?.value,
      isEdit: false
    });
    row.markAsPristine();
    row.markAsUntouched();
  }

  updateRow(i: number): void {
    const row = this.costCentres.at(i) as FormGroup;
    row.markAllAsTouched();
    if (row.invalid) return;

    this.isLoading = true;
    this.svc.saveOrUpdateCostCentre(this.buildPayload(row))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Failed to update.');
            return;
          }
          this.alertService.success(resp?.message || 'Updated successfully.');
          row.patchValue({ isEdit: false });
          row.markAsPristine();
          row.markAsUntouched();
        },
        error: () => this.alertService.error('Update failed.')
      });
  }

  private buildPayload(row: FormGroup): any {
    return {
      costCentreCode: (row.get('costCentreCode')?.value as string).trim().toUpperCase(),
      description: (row.get('description')?.value as string).trim(),
      centreType: (row.get('centreType')?.value as string)?.trim() || null,
      costCentreStatus: (row.get('costCentreStatus')?.value as string)?.trim() || null,
      objectStatus: row.get('objectStatus')?.value ?? 'ACTVE',
      username: this.userName,
      location: 'BILZ'
    };
  }
}