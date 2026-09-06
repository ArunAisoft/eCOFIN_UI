import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { TdsService } from 'src/app/shared/services/master/tds.service';

@Component({
  selector: 'app-tds',
  templateUrl: './tds.component.html',
  styleUrls: ['./tds.component.css']
})
export class TdsComponent {
  isLoading = false;
  userName = '';
  form!: FormGroup;

  readonly statusOptions = [
    { value: 'ACTVE', label: 'Active' },
    { value: 'INACT', label: 'Inactive' },
    { value: 'OBSLT', label: 'Obsolete' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: TdsService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;

    this.form = this.fb.group({
      tdsRecords: this.fb.array([])
    });

    this.loadTds();
  }

  get tdsRecords(): FormArray {
    return this.form.get('tdsRecords') as FormArray;
  }

  private createRow(d: any = {}): FormGroup {
    return this.fb.group({
      tdscode: [d.tdscode ?? '', [Validators.required, Validators.maxLength(5)]],
      tdsdescription: [d.tdsdescription ?? '', [Validators.required, Validators.maxLength(100)]],
      tdsperc: [d.tdsperc ?? null, [Validators.required, Validators.min(0), Validators.max(100), Validators.pattern(/^\d+(\.\d{1,3})?$/)]],
      objectStatus: [d.objectStatus ?? 'ACTVE', Validators.required],
      isNew: [d.isNew ?? false],
      isEdit: [d.isEdit ?? false],
      _origDesc: [d.tdsdescription ?? ''],
      _origPerc: [d.tdsperc ?? null],
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

  loadTds(): void {
    this.isLoading = true;
    this.svc.getAllActiveTDS()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          const list: any[] = Array.isArray(resp?.data) ? resp.data : [];
          this.tdsRecords.clear();
          this.tdsRecords.insert(0, this.createRow({ isNew: true }));
          list.forEach(item =>
            this.tdsRecords.push(this.createRow({
              tdscode: item.tdscode,
              tdsdescription: item.tdsdescription,
              tdsperc: item.tdsperc,
              objectStatus: item.objectStatus ?? 'ACTVE'
            }))
          );
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load TDS records.')
      });
  }

  saveNewRow(index: number): void {
    const row = this.tdsRecords.at(index) as FormGroup;
    row.markAllAsTouched();
    if (row.invalid) return;
    const code = (row.get('tdscode')?.value as string).trim().toUpperCase();
    const duplicate = this.tdsRecords.controls.some(
      (r, i) => i !== index &&
        !r.get('isNew')?.value &&
        (r.get('tdscode')?.value ?? '').toString().toUpperCase() === code
    );
    if (duplicate) {
      this.alertService.warning(`TDS code '${code}' already exists.`);
      return;
    }

    this.isLoading = true;
    this.svc.saveOrUpdateTds(this.buildPayload(row))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          if (resp?.success === false) {
            this.alertService.warning(resp?.message || 'Failed to save.');
            return;
          }
          this.alertService.success(resp?.message || 'Saved successfully.');
          this.loadTds();
        },
        error: () => this.alertService.error('Save failed.')
      });
  }

  clearNewRow(index: number): void {
    const row = this.tdsRecords.at(index) as FormGroup;
    row.reset({
      tdscode: '',
      tdsdescription: '',
      tdsperc: null,
      objectStatus: 'ACTVE',
      isNew: true,
      isEdit: false,
      _origDesc: '',
      _origPerc: null,
      _origStatus: 'ACTVE'
    });
    row.markAsPristine();
    row.markAsUntouched();
  }

  startEdit(i: number): void {
    const row = this.tdsRecords.at(i);
    row.patchValue({
      isEdit: true,
      _origDesc: row.get('tdsdescription')?.value,
      _origPerc: row.get('tdsperc')?.value,
      _origStatus: row.get('objectStatus')?.value
    });
  }

  cancelEdit(i: number): void {
    const row = this.tdsRecords.at(i);
    row.patchValue({
      tdsdescription: row.get('_origDesc')?.value,
      tdsperc: row.get('_origPerc')?.value,
      objectStatus: row.get('_origStatus')?.value,
      isEdit: false
    });
    row.markAsPristine();
    row.markAsUntouched();
  }

  updateRow(i: number): void {
    const row = this.tdsRecords.at(i) as FormGroup;
    row.markAllAsTouched();
    if (row.invalid) return;

    this.isLoading = true;
    this.svc.saveOrUpdateTds(this.buildPayload(row))
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
      tdscode: (row.get('tdscode')?.value as string).trim().toUpperCase(),
      tdsdescription: (row.get('tdsdescription')?.value as string).trim(),
      tdsperc: row.get('tdsperc')?.value ?? null,
      objectStatus: row.get('objectStatus')?.value ?? 'ACTVE',
      username: this.userName,
      location: 'BILZ'
    };
  }
}
