import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators, AbstractControl } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { CurrencyService } from 'src/app/shared/services/master/currency.service';

@Component({
  selector: 'app-currency',
  templateUrl: './currency.component.html'
})
export class CurrencyComponent implements OnInit {

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
    private svc: CurrencyService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const userName = localStorage.getItem('userName');
    if (userName) this.userName = userName;

    this.form = this.fb.group({
      currencies: this.fb.array([])
    });

    this.loadCurrencies();
  }

  get currencies(): FormArray {
    return this.form.get('currencies') as FormArray;
  }

  private createRow(d: any = {}): FormGroup {
    return this.fb.group({
      currencyCode: [d.currencyCode ?? '', [Validators.required, Validators.maxLength(5)]],
      currencyName: [d.currencyName ?? '', [Validators.required, Validators.maxLength(50)]],
      country: [d.country ?? '', Validators.maxLength(50)],
      symbol: [d.symbol ?? '', Validators.maxLength(5)],
      objectStatus: [d.objectStatus ?? 'ACTVE', Validators.required],
      isNew: [d.isNew ?? false],
      isEdit: [d.isEdit ?? false],
      _origName: [d.currencyName ?? ''],
      _origCountry: [d.country ?? ''],
      _origSymbol: [d.symbol ?? ''],
      _origStatus: [d.objectStatus ?? 'ACTVE']
    });
  }

  loadCurrencies(): void {
    this.isLoading = true;
    this.svc.getAllActiveCurrencies()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          const list: any[] = Array.isArray(resp?.data) ? resp.data : [];
          this.currencies.clear();
          this.currencies.insert(0, this.createRow({ isNew: true }));
          list.forEach(item =>
            this.currencies.push(this.createRow({
              currencyCode: item.currencyCode,
              currencyName: item.currencyName,
              country: item.country,
              symbol: item.symbol,
              objectStatus: item.objectStatus ?? 'ACTVE'
            }))
          );
          this.cd.detectChanges();
        },
        error: () => {
          this.alertService.error('Failed to load currencies.');
        }
      });
  }

  saveNewRow(index: number): void {
    const row = this.currencies.at(index) as FormGroup;
    row.markAllAsTouched();
    if (row.invalid) return;
    const code = row.get('currencyCode')?.value.toUpperCase();
    const duplicate = this.currencies.controls.some((r, i) => i !== index && !r.get('isNew')?.value && (r.get('currencyCode')?.value || '').toUpperCase() === code);

    if (duplicate) {
      this.alertService.warning('Duplicate currency code');
      return;
    }

    this.isLoading = true;
    this.svc.saveOrUpdateCurrency(this.buildPayload(row))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          this.alertService.success('Saved successfully');
          this.loadCurrencies();
        },
        error: () => this.alertService.error('Save failed')
      });
  }

  clearNewRow(index: number): void {
    const row = this.currencies.at(index) as FormGroup;
    row.reset({
      currencyCode: '',
      currencyName: '',
      country: '',
      symbol: '',
      objectStatus: 'ACTVE',
      isNew: true
    });
  }

  startEdit(i: number) {
    const row = this.currencies.at(i);
    row.patchValue({
      isEdit: true,
      _origName: row.get('currencyName')?.value,
      _origCountry: row.get('country')?.value,
      _origSymbol: row.get('symbol')?.value,
      _origStatus: row.get('objectStatus')?.value
    });
  }

  cancelEdit(i: number) {
    const row = this.currencies.at(i);
    row.patchValue({
      currencyName: row.get('_origName')?.value,
      country: row.get('_origCountry')?.value,
      symbol: row.get('_origSymbol')?.value,
      objectStatus: row.get('_origStatus')?.value,
      isEdit: false
    });
  }

  updateRow(i: number) {
    const row = this.currencies.at(i) as FormGroup;
    row.markAllAsTouched();
    if (row.invalid) return;
    this.isLoading = true;
    this.svc.saveOrUpdateCurrency(this.buildPayload(row))
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: () => {
          this.alertService.success('Updated successfully');
          row.patchValue({ isEdit: false });
        },
        error: () => {
          this.alertService.error('Update failed');
        }
      });
  }

  private buildPayload(row: FormGroup) {
    return {
      currencyCode: row.get('currencyCode')?.value.toUpperCase(),
      currencyName: row.get('currencyName')?.value,
      country: row.get('country')?.value,
      symbol: row.get('symbol')?.value,
      objectStatus: row.get('objectStatus')?.value,
      username: this.userName,
      location: 'BILZ'
    };
  }

  statusLabel(val: string) {
    return this.statusOptions.find(x => x.value === val)?.label;
  }

  isRowInvalid(row: AbstractControl, controlName: string): boolean {
    const control = row.get(controlName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  hasRowError(row: AbstractControl, controlName: string, error: string): boolean {
    const control = row.get(controlName);
    return !!(control && control.hasError(error) && (control.touched || control.dirty));
  }
}