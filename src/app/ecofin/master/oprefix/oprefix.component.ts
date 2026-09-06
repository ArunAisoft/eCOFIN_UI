import {
  Component, OnInit, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy,
  ViewChild, ElementRef
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/shared/utils/alert.service';
import {
  DefinePrefixService,
  PrefixLinkDto,
  AccountLookupDto,
  CustomerLookupDto,
  PrefixAddContextDto,
  CtrlStatus
} from 'src/app/shared/services/master/define-prefix.service';

/**
 * Define Prefix (cfn_accountottolink).
 *
 * Codes verified against the live table:
 *     vchr_type  prod_prefixtype  rows
 *     I          D                1711    Sales / Domestic
 *     I          E                  53    Sales / Export
 *     P          D                  62    Purchase / Domestic
 *     P          I                   5    Purchase / Import
 *
 * So 'P' = Purchase and 'I' = Sales. The original comment said the reverse.
 * The legacy profiler confirms it: only the vchr_type='I' query joins
 * cfn_customer, and only the Sales screen shows a Customer Name column.
 *
 * prod_prefixtype is NOT shared between modes:
 *     Purchase -> D (Domestic) or I (Import)
 *     Sales    -> D (Domestic) or E (Export)
 *
 * prod_levytype 'P' means Product in Purchase mode and Customer in Sales mode,
 * matching the legacy column headers "Product Levytype" / "Customer/Levytype".
 *
 * Add flow mirrors the legacy toolbar: Add enters ADD mode after a permission
 * check, then Post or On Hold commits, or Cancel discards.
 */
@Component({
  selector: 'app-oprefix',
  templateUrl: './oprefix.component.html',
  styleUrls: ['./oprefix.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OprefixComponent implements OnInit, OnDestroy {

  isLoading = false;
  isSaving = false;
  userName = '';
  searchText = '';

  prefixForm!: FormGroup;

  /* ---- add context: loaded on Add, never on page open ---- */
  addContext: PrefixAddContextDto | null = null;
  isAddMode = false;

  /** Scroll container, so a newly added row can be brought into view. */
  @ViewChild('gridScroll') gridScroll?: ElementRef<HTMLDivElement>;

  accountList: AccountLookupDto[] = [];
  customerList: CustomerLookupDto[] = [];

  private accountMap = new Map<string, string>();
  private customerMap = new Map<string, string>();

  /* ---- paging ---- */
  page = 1;
  pageSize = 50;
  totalCount = 0;
  totalPages = 0;
  readonly pageSizeOptions = [25, 50, 100, 200];

  /* ---- mode ---- */
  readonly vchrTypeOptions = [
    { value: 'P', label: 'Purchase' },
    { value: 'I', label: 'Sales' }
  ];

  private static readonly PREFIX_TYPES_PURCHASE = [
    { value: 'D', label: 'Domestic' },
    { value: 'I', label: 'Import' }
  ];

  private static readonly PREFIX_TYPES_SALES = [
    { value: 'D', label: 'Domestic' },
    { value: 'E', label: 'Export' }
  ];

  /** Recomputed on mode change, not a getter, so OnPush stays cheap. */
  prefixTypeOptions = OprefixComponent.PREFIX_TYPES_PURCHASE;
  levyTypeOptions = [
    { value: 'L', label: 'Levy' },
    { value: 'P', label: 'Product' }
  ];

  readonly dbcrOptions = [
    { value: 'D', label: 'Debit' },
    { value: 'C', label: 'Credit' }
  ];

  isSalesMode = false;
  levyColumnLabel = 'Product Levytype';
  prefixColumnLabel = 'Product Prefix / Levy Code';

  private readonly search$ = new Subject<string>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private svc: DefinePrefixService,
    private alertService: AlertService,
    private cd: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.userName = localStorage.getItem('userName') ?? '';
    this.buildForm();
    this.applyMode('P');

    // No lookup preload. The legacy screen issued zero lookup queries on open;
    // Description and Customer Name come from the grid's own join.
    this.loadLinks();

    this.prefixForm.get('vchrType')!.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((v: string) => {
        this.applyMode(v);
        this.page = 1;
        this.isAddMode = false;
        this.loadLinks();
      });

    this.prefixForm.get('prefixType')!.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.isAddMode = false;
        this.loadLinks();
      });

    this.search$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => { this.page = 1; this.loadLinks(); });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  buildForm(): void {
    this.prefixForm = this.fb.group({
      vchrType: ['P', Validators.required],    // Purchase
      prefixType: ['D', Validators.required],  // Domestic
      rows: this.fb.array([])
    });
  }

  private applyMode(vchrType: string): void {
    this.isSalesMode = vchrType === 'I';

    this.prefixTypeOptions = this.isSalesMode
      ? OprefixComponent.PREFIX_TYPES_SALES
      : OprefixComponent.PREFIX_TYPES_PURCHASE;

    this.levyTypeOptions = [
      { value: 'L', label: 'Levy' },
      { value: 'P', label: this.isSalesMode ? 'Customer' : 'Product' }
    ];

    this.levyColumnLabel = this.isSalesMode ? 'Customer/Levytype' : 'Product Levytype';
    this.prefixColumnLabel = this.isSalesMode
      ? 'Customer Code / Levy Code'
      : 'Product Prefix / Levy Code';

    // Purchase 'I' has no equivalent in Sales, which uses 'E'.
    const current = this.prefixForm.get('prefixType')!;
    if (!this.prefixTypeOptions.some(o => o.value === current.value)) {
      current.setValue('D', { emitEvent: false });
    }

    this.cd.markForCheck();
  }

  get rows(): FormArray {
    return this.prefixForm.get('rows') as FormArray;
  }

  get currentModeLabel(): string {
    const v = this.vchrTypeOptions.find(x => x.value === this.prefixForm.get('vchrType')?.value)?.label ?? '';
    const p = this.prefixTypeOptions.find(x => x.value === this.prefixForm.get('prefixType')?.value)?.label ?? '';
    return `${v} - ${p}`;
  }

  get modeBadge(): string {
    return this.isAddMode ? 'ADD' : 'BROWSE';
  }

  /**
   * Track by the FormGroup instance, not the index. Inserting a row at the top
   * shifts every index, so an index-based key would change for every row and
   * make Angular rebuild the whole grid. The control object stays stable across
   * an insert, and is correctly replaced on a reload.
   */
  trackByRow = (_index: number, ctrl: AbstractControl): AbstractControl => ctrl;

  trackByCode = (_: number, item: { accountCode?: string; customerCode?: string }): string =>
    item.accountCode ?? item.customerCode ?? '';

  accountDescription(code: string): string {
    return this.accountMap.get((code ?? '').trim()) ?? '';
  }

  customerName(code: string): string {
    return this.customerMap.get((code ?? '').trim()) ?? '';
  }

  /** 'P' = Product in Purchase mode, Customer in Sales mode. */
  isPrefixRow(row: AbstractControl): boolean {
    return row.get('prodLevyType')?.value === 'P';
  }

  isLevyRow(row: AbstractControl): boolean {
    return row.get('prodLevyType')?.value === 'L';
  }

  /** Only a Sales 'P' row is an actual customer, so only then offer the list. */
  isCustomerRow(row: AbstractControl): boolean {
    return this.isSalesMode && this.isPrefixRow(row);
  }

  private createRow(d: Partial<PrefixLinkDto> = {}): FormGroup {
    return this.fb.group({
      prodLevyType: [d.prodLevyType ?? 'P', Validators.required],
      prodPrefix: [(d.prodPrefix ?? '').trim(), [Validators.required, Validators.maxLength(15)]],
      customerName: [{ value: d.customerName ?? '', disabled: true }],
      accountCode: [(d.accountCode ?? '').trim(), [Validators.required, Validators.maxLength(10)]],
      description: [{ value: d.description ?? '', disabled: true }],
      dbcrFlag: [d.dbcrFlag ?? 'D', Validators.required],
      isNew: [!d.prodPrefix]
    });
  }

  /* ================= ADD / POST / HOLD / CANCEL ================= */

  /**
   * Mirrors the legacy Add: resolve the task, check the permission level,
   * fetch the help metadata and the lookups, then enter ADD mode.
   */
  onAdd(): void {
    if (this.addContext) {
      if (!this.addContext.canAdd) {
        this.alertService.warning(
          `Your access level (${this.addContext.levelLabel}) does not permit Add.`);
        return;
      }
      this.enterAddMode();
      return;
    }

    this.isLoading = true;
    this.cd.markForCheck();

    this.svc.getAddContext(this.userName)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.isLoading = false; this.cd.markForCheck(); })
      )
      .subscribe({
        next: res => {
          const ctx = res?.data;
          if (!ctx) { this.alertService.error('Could not load add context.'); return; }

          this.addContext = ctx;
          this.accountList = ctx.accounts ?? [];
          this.customerList = ctx.customers ?? [];
          this.accountMap = new Map(this.accountList.map(a => [a.accountCode.trim(), a.description]));
          this.customerMap = new Map(this.customerList.map(c => [c.customerCode.trim(), c.customerName]));

          if (!ctx.canAdd) {
            this.alertService.warning(
              `Your access level (${ctx.levelLabel}) does not permit Add.`);
            return;
          }
          this.enterAddMode();
        },
        error: () => this.alertService.error('Could not load add context.')
      });
  }

  /**
   * ADD mode shows ONLY the new rows, exactly like the legacy screen's
   * "Mode: ADD". The browse list is cleared so there is no doubt about what
   * Post will write, and no need to pull all 1711 Sales/Domestic rows first.
   * Post inserts only what is on screen; existing rows are never touched.
   */
  private enterAddMode(): void {
    this.isAddMode = true;
    this.searchText = '';
    this.prefixForm.setControl('rows', this.fb.array([]));
    this.addBlankRow();
  }

  /** New rows go in at the top so they are visible without scrolling. */
  private addBlankRow(): void {
    this.rows.insert(0, this.createRow());
    this.cd.markForCheck();

    setTimeout(() => {
      const el = this.gridScroll?.nativeElement;
      if (el) el.scrollTop = 0;
      (document.getElementById('prefix_0') as HTMLInputElement | null)?.focus();
    }, 0);
  }

  addRow(): void {
    if (!this.isAddMode) { this.onAdd(); return; }
    this.addBlankRow();
  }

  // Post is the only commit action. The legacy screen greyed out On Hold,
  // and cfn_accountottolink has never contained an on-hold row
  // (1,658 'Post' + 174 blank, no 'Hold' / 'ONHOLD').
  onPost(): void { this.save('Post'); }

  onCancel(): void {
    this.isAddMode = false;
    this.loadLinks();
  }

  removeRow(i: number): void {
    const row = this.rows.at(i);
    if (!row) return;

    if (row.get('isNew')?.value === true) {
      this.rows.removeAt(i);
      this.cd.markForCheck();
      return;
    }

    const prodPrefix = row.get('prodPrefix')?.value;
    const accountCode = row.get('accountCode')?.value;
    if (!prodPrefix || !accountCode) {
      this.rows.removeAt(i);
      this.cd.markForCheck();
      return;
    }

    if (!confirm(`Delete row '${prodPrefix}' -> '${accountCode}'?`)) return;

    this.isSaving = true;
    this.svc.deleteLink({
      prodPrefix,
      accountCode,
      vchrType: this.prefixForm.get('vchrType')?.value,
      prefixType: this.prefixForm.get('prefixType')?.value
    })
      .pipe(finalize(() => { this.isSaving = false; this.cd.markForCheck(); }))
      .subscribe({
        next: (res: any) => {
          if (res?.success === false) { this.alertService.warning(res?.message || 'Delete failed.'); return; }
          this.alertService.success(res?.message || 'Deleted.');
          this.rows.removeAt(i);
          this.totalCount = Math.max(0, this.totalCount - 1);
        },
        error: () => this.alertService.error('Delete failed.')
      });
  }

  onLevyTypeChange(i: number): void {
    const row = this.rows.at(i);
    if (!row) return;
    row.get('prodPrefix')?.setValue('');
    row.get('customerName')?.setValue('');
    this.cd.markForCheck();
  }

  onPrefixChange(i: number): void {
    const row = this.rows.at(i);
    if (!row) return;
    const code = (row.get('prodPrefix')?.value ?? '').trim();
    row.get('prodPrefix')?.setValue(code, { emitEvent: false });

    // Only Sales customer rows have a name to resolve. Purchase prefixes are
    // product / levy codes with no cfn_customer row.
    if (this.isCustomerRow(row)) {
      row.get('customerName')?.setValue(this.customerName(code));
    }
    this.cd.markForCheck();
  }

  onAccountChange(i: number): void {
    const row = this.rows.at(i);
    if (!row) return;
    const code = (row.get('accountCode')?.value ?? '').trim();
    row.get('accountCode')?.setValue(code, { emitEvent: false });
    row.get('description')?.setValue(this.accountDescription(code));
    this.cd.markForCheck();
  }

  isNewRow(row: AbstractControl): boolean {
    return row.get('isNew')?.value === true;
  }

  isRowInvalid(row: AbstractControl, ctrl: string): boolean {
    const c = row.get(ctrl);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  /* ================= SEARCH & PAGING ================= */

  onSearchInput(value: string): void {
    this.searchText = value;
    this.search$.next(value);
  }

  clearSearch(): void {
    this.searchText = '';
    this.search$.next('');
  }

  goToPage(p: number): void {
    if (p < 1 || (this.totalPages > 0 && p > this.totalPages) || p === this.page) return;
    this.page = p;
    this.loadLinks();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = Number(size) || 50;
    this.page = 1;
    this.loadLinks();
  }

  get rangeStart(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  /* ================= DATA ================= */

  loadLinks(after?: () => void): void {
    const vchr = this.prefixForm.get('vchrType')?.value;
    const ptype = this.prefixForm.get('prefixType')?.value;
    if (!vchr || !ptype) return;

    this.isLoading = true;
    this.cd.markForCheck();

    this.svc.getLinks(vchr, ptype, {
      search: this.searchText,
      page: this.page,
      pageSize: this.pageSize
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => { this.isLoading = false; this.cd.markForCheck(); })
      )
      .subscribe({
        next: (res) => {
          const list: PrefixLinkDto[] = Array.isArray(res?.data) ? res.data : [];
          this.totalCount = res?.totalCount ?? list.length;
          this.totalPages = res?.totalPages ?? 1;

          // Rebuild in one shot. Pushing one at a time fires a valueChanges
          // and a full validity recalculation per push.
          const arr = this.fb.array(list.map(item => this.createRow(item)));
          this.prefixForm.setControl('rows', arr);

          this.cd.markForCheck();
          if (after) after();
        },
        error: () => this.alertService.error('Failed to load prefix links.')
      });
  }

  private save(ctrlStatus: CtrlStatus): void {
    this.prefixForm.markAllAsTouched();
    if (this.prefixForm.invalid) {
      this.alertService.warning('Please fix the highlighted rows.');
      return;
    }
    if (this.rows.length === 0) { this.alertService.warning('Add at least one row.'); return; }

    if (ctrlStatus === 'Post' && this.addContext && !this.addContext.canPost) {
      this.alertService.warning(
        `Your access level (${this.addContext.levelLabel}) does not permit Post.`);
      return;
    }
    const seen = new Set<string>();
    for (const r of this.rows.controls) {
      const key = `${r.get('prodPrefix')?.value}||${r.get('accountCode')?.value}`;
      if (seen.has(key)) {
        this.alertService.warning(
          `Duplicate row: ${r.get('prodPrefix')?.value} / ${r.get('accountCode')?.value}`);
        return;
      }
      seen.add(key);
    }

    const payload = {
      vchrType: this.prefixForm.get('vchrType')?.value,
      prefixType: this.prefixForm.get('prefixType')?.value,
      username: this.userName,
      location: 'BILZ',
      rows: this.rows.getRawValue().map((r: any) => ({
        prodPrefix: (r.prodPrefix ?? '').trim(),
        accountCode: (r.accountCode ?? '').trim(),
        prodLevyType: r.prodLevyType,
        dbcrFlag: r.dbcrFlag
      }))
    };

    this.isSaving = true;
    this.cd.markForCheck();

    this.svc.saveLinks(payload, ctrlStatus)
      .pipe(finalize(() => { this.isSaving = false; this.cd.markForCheck(); }))
      .subscribe({
        next: (res: any) => {
          if (res?.success === false) { this.alertService.warning(res?.message || 'Failed to save.'); return; }
          this.alertService.success(res?.message || 'Saved successfully.');
          this.isAddMode = false;
          this.loadLinks();
        },
        error: () => this.alertService.error('Save failed.')
      });
  }

  onRefresh(): void {
    this.searchText = '';
    this.page = 1;
    this.isAddMode = false;
    this.addContext = null;
    this.svc.clearLookupCache();
    this.loadLinks();
  }
}