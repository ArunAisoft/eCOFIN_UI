import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import { CustomerService } from 'src/app/shared/services/master/customer.service';

@Component({
  selector: 'app-customer',
  templateUrl: './customer.component.html'
})
export class CustomerComponent implements OnInit {

  isLoading = false;
  userName = '';
  isEditMode = false;
  editingCode = '';
  searchText = '';

  customerForm!: FormGroup;
  customerList: any[] = [];
  accountList: { accountCode: string; description: string }[] = [];

  readonly statusOptions = [
    { value: 'ACTVE', label: 'Active' },
    { value: 'INACT', label: 'Inactive' },
    { value: 'OBSLT', label: 'Obsolete' }
  ];

  readonly customerTypeOptions = [
    { value: 'DOMES', label: 'Domestic' },
    { value: 'EXPRT', label: 'Export' },
    { value: 'INTRN', label: 'Internal' }
  ];

  readonly businessNatureOptions = [
    { value: 'MANUF', label: 'Manufacturing' },
    { value: 'TRADE', label: 'Trading' },
    { value: 'SERVC', label: 'Services' },
    { value: 'OTHRS', label: 'Others' }
  ];

  constructor(
    private fb: FormBuilder,
    private svc: CustomerService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const u = localStorage.getItem('userName');
    if (u) this.userName = u;
    this.buildForm();
    this.loadAccounts();
    this.loadCustomers();
  }

  get filteredCustomerList(): any[] {
    const q = this.searchText.trim().toLowerCase();
    if (!q) return this.customerList;
    return this.customerList.filter(r =>
      r.customerCode?.toLowerCase().includes(q) ||
      r.customerName?.toLowerCase().includes(q) ||
      r.accountCode?.toLowerCase().includes(q) ||
      r.commTelephone1?.toLowerCase().includes(q) ||
      r.commEmail?.toLowerCase().includes(q) ||
      r.addrCity?.toLowerCase().includes(q) ||
      r.addrState?.toLowerCase().includes(q)
    );
  }

  buildForm(): void {
    this.customerForm = this.fb.group({
      customerCode: ['', [Validators.required, Validators.maxLength(10)]],
      customerName: ['', [Validators.required, Validators.maxLength(100)]],
      businessNature: [''],
      customerType: ['', Validators.required],
      geographyCode: ['', Validators.maxLength(5)],
      lstNoDate: ['', Validators.maxLength(100)],
      cstNoDate: ['', Validators.maxLength(100)],
      applCustomerCode: ['', Validators.maxLength(20)],
      objectStatus: ['ACTVE', Validators.required],
      accountCode: ['', Validators.required],
      addrLine1: ['', Validators.maxLength(100)],
      addrLine2: ['', Validators.maxLength(100)],
      addrLine3: ['', Validators.maxLength(100)],
      addrLine4: ['', Validators.maxLength(100)],
      addrCity: ['', Validators.maxLength(50)],
      addrPin: ['', Validators.maxLength(10)],
      addrState: ['', Validators.maxLength(50)],
      addrCountry: ['', Validators.maxLength(50)],
      commTelephone1: ['', Validators.maxLength(15)],
      commTelephone2: ['', Validators.maxLength(15)],
      commEmail: ['', [Validators.maxLength(80), Validators.email]],
      commTelexno: ['', Validators.maxLength(80)],
      commFaxno: ['', Validators.maxLength(80)],
      commGrams: ['', Validators.maxLength(80)],
      commContactperson: ['', Validators.maxLength(80)]
    });
  }

  isInvalid(ctrl: string): boolean {
    const c = this.customerForm.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  hasError(ctrl: string, err: string): boolean {
    const c = this.customerForm.get(ctrl);
    return !!(c && c.hasError(err) && (c.touched || c.dirty));
  }

  statusLabel(val: string): string {
    return this.statusOptions.find(x => x.value === val)?.label ?? val ?? '';
  }

  customerTypeLabel(val: string): string {
    return this.customerTypeOptions.find(x => x.value === val)?.label ?? val ?? '';
  }

  businessNatureLabel(val: string): string {
    return this.businessNatureOptions.find(x => x.value === val)?.label ?? val ?? '';
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

  loadCustomers(): void {
    this.isLoading = true;
    this.svc.getAllCustomer()
      .pipe(finalize(() => (this.isLoading = false)))
      .subscribe({
        next: (resp: any) => {
          this.customerList = Array.isArray(resp?.data) ? resp.data : [];
          this.cd.detectChanges();
        },
        error: () => this.alertService.error('Failed to load customers.')
      });
  }

  onSave(): void {
    this.customerForm.markAllAsTouched();
    if (this.customerForm.invalid) return;

    const v = this.customerForm.value;
    const code = v.customerCode as string;

    if (!this.isEditMode) {
      const duplicate = this.customerList.some(r => (r.customerCode ?? '') === code);
      if (duplicate) {
        this.alertService.warning("Customer code '" + code + "' already exists.");
        return;
      }
    }

    this.isLoading = true;
    this.svc.saveOrUpdateCustomer(this.buildPayload(v))
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
          this.loadCustomers();
        },
        error: () => this.alertService.error(this.isEditMode ? 'Update failed.' : 'Save failed.')
      });
  }

  onClear(): void {
    this.isEditMode = false;
    this.editingCode = '';
    this.customerForm.reset({ objectStatus: 'ACTVE', businessNature: '', customerType: '', accountCode: '' });
    this.customerForm.markAsPristine();
    this.customerForm.markAsUntouched();
    this.customerForm.get('customerCode')?.enable();
  }

  startEdit(row: any): void {
    this.isEditMode = true;
    this.editingCode = row.customerCode;

    this.customerForm.patchValue({
      customerCode: row.customerCode,
      customerName: row.customerName,
      businessNature: row.businessNature,
      customerType: row.customerType,
      geographyCode: row.geographyCode,
      lstNoDate: row.lstNoDate,
      cstNoDate: row.cstNoDate,
      applCustomerCode: row.applCustomerCode,
      objectStatus: row.objectStatus ?? 'ACTVE',
      accountCode: row.accountCode ?? '',
      addrLine1: row.addrLine1,
      addrLine2: row.addrLine2,
      addrLine3: row.addrLine3,
      addrLine4: row.addrLine4,
      addrCity: row.addrCity,
      addrPin: row.addrPin,
      addrState: row.addrState,
      addrCountry: row.addrCountry,
      commTelephone1: row.commTelephone1,
      commTelephone2: row.commTelephone2,
      commEmail: row.commEmail,
      commTelexno: row.commTelexno,
      commFaxno: row.commFaxno,
      commGrams: row.commGrams,
      commContactperson: row.commContactperson
    });

    this.customerForm.get('customerCode')?.disable();

    this.svc.getLinkedAccounts(row.customerCode).subscribe({
      next: (resp: any) => {
        const links: any[] = Array.isArray(resp?.data) ? resp.data : [];
        if (links.length > 0) {
          this.customerForm.patchValue({ accountCode: links[0].accountCode });
        }
        this.cd.detectChanges();
      },
      error: () => { }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private buildPayload(v: any): any {
    return {
      customerCode: this.isEditMode ? this.editingCode : (v.customerCode as string),
      customerName: v.customerName as string,
      customerType: v.customerType ?? '',
      businessNature: v.businessNature || null,
      geographyCode: v.geographyCode || null,
      lstNoDate: v.lstNoDate || null,
      cstNoDate: v.cstNoDate || null,
      applCustomerCode: v.applCustomerCode || null,
      objectStatus: v.objectStatus ?? 'ACTVE',
      accountCode: v.accountCode || null,
      addrLine1: v.addrLine1 || null,
      addrLine2: v.addrLine2 || null,
      addrLine3: v.addrLine3 || null,
      addrLine4: v.addrLine4 || null,
      addrCity: v.addrCity || null,
      addrPin: v.addrPin || null,
      addrState: v.addrState || null,
      addrCountry: v.addrCountry || null,
      commTelephone1: v.commTelephone1 || null,
      commTelephone2: v.commTelephone2 || null,
      commEmail: v.commEmail || null,
      commTelexno: v.commTelexno || null,
      commFaxno: v.commFaxno || null,
      commGrams: v.commGrams || null,
      commContactperson: v.commContactperson || null,
      username: this.userName,
      location: 'BILZ'
    };
  }
}