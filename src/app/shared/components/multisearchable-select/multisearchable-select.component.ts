import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  HostListener,
  OnChanges,
  SimpleChanges,
  Optional,
  Self
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

@Component({
  selector: 'app-multi-select',
  templateUrl: './multisearchable-select.component.html',
  styleUrls: ['./multisearchable-select.component.css']
})
export class MultiSearchableSelectComponent implements ControlValueAccessor, OnChanges {

  @Input() items: any[] = [];
  @Input() bindValue = '';
  @Input() displayWith: ((item: any) => string) | null = null;
  @Input() placeholder = 'Select';
  @Input() disabled = false;
  @Input() dropdownPosition: 'top' | 'bottom' = 'bottom';
  @Input() maxDisplayCount = 2;

  @Output() selectionChange = new EventEmitter<any[]>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('container') container!: ElementRef<HTMLElement>;

  dropdownOpen = false;
  search = '';
  filtered: any[] = [];
  highlightedIndex = -1;

  _value: any[] = [];
  isDisabled = false;

  onTouched: () => void = () => {};
  onChange: (_: any) => void = () => {};

  constructor(@Optional() @Self() public ngControl: NgControl) {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  get invalid(): boolean {
    return !!(this.ngControl?.invalid && (this.ngControl.touched || this.ngControl.dirty));
  }

  get panelPositionClass(): string {
    return this.dropdownPosition === 'top' ? 'ss-panel-top' : 'ss-panel-bottom';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.filtered = this.items ? [...this.items] : [];
    }
    if (changes['disabled']) {
      this.setDisabledState(!!this.disabled);
    }
  }

  // ── ControlValueAccessor ──────────────────────────────────────────────────

  writeValue(val: any): void {
    this._value = Array.isArray(val) ? val : (val != null ? [val] : []);
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    this.disabled = isDisabled;
  }

  // ── Dropdown ──────────────────────────────────────────────────────────────

  toggle() {
    if (this.isDisabled) return;
    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      this.filtered = this.getFiltered();
      this.highlightedIndex = -1;
      setTimeout(() => this.searchInput?.nativeElement?.focus(), 0);
    } else {
      this.resetSearch();
    }
  }

  getFiltered(): any[] {
    const q = (this.search || '').toLowerCase().trim();
    if (!q) return [...this.items];
    return this.items.filter(i =>
      this.getLabel(i).toLowerCase().includes(q)
    );
  }

  onSearchChange(val: string) {
    this.search = val;
    this.filtered = this.getFiltered();
    this.highlightedIndex = -1;
  }

  // ── Selection ─────────────────────────────────────────────────────────────

  getItemValue(item: any): any {
    return this.bindValue ? item?.[this.bindValue] : item;
  }

  isSelected(item: any): boolean {
    const val = this.getItemValue(item);
    return this._value.some(v => String(v) === String(val));
  }

  toggleItem(item: any) {
    const val = this.getItemValue(item);
    const current = [...this._value];
    const idx = current.findIndex(v => String(v) === String(val));
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(val);
    }
    this._value = current;
    this.onChange(this._value);
    this.onTouched();
    this.selectionChange.emit(this._value);
  }

  get allSelected(): boolean {
    return this.items.length > 0 && this._value.length === this.items.length;
  }

  get someSelected(): boolean {
    return this._value.length > 0 && !this.allSelected;
  }

  toggleAll() {
    if (this.allSelected) {
      this._value = [];
    } else {
      this._value = this.items.map(i => this.getItemValue(i));
    }
    this.onChange(this._value);
    this.onTouched();
    this.selectionChange.emit(this._value);
  }

  removeItem(val: any, event: MouseEvent) {
    event.stopPropagation();
    this._value = this._value.filter(v => String(v) !== String(val));
    this.onChange(this._value);
    this.onTouched();
    this.selectionChange.emit(this._value);
  }

  clearAll(event: MouseEvent) {
    event.stopPropagation();
    this._value = [];
    this.onChange(this._value);
    this.onTouched();
    this.selectionChange.emit(this._value);
  }

  // ── Labels ────────────────────────────────────────────────────────────────

  getLabel(item: any): string {
    if (!item) return '';
    if (this.displayWith) return this.displayWith(item);
    if (typeof item !== 'object') return String(item);
    if ('name' in item) return String(item.name);
    if ('label' in item) return String(item.label);
    return Object.values(item).slice(0, 2).join(' ');
  }

  getLabelByValue(val: any): string {
    if (this.bindValue) {
      const found = this.items.find(i => String(i[this.bindValue]) === String(val));
      return found ? this.getLabel(found) : String(val);
    }
    return this.getLabel(val);
  }

  get triggerLabel(): string {
    if (this._value.length === 0) return this.placeholder;
    if (this._value.length <= this.maxDisplayCount) {
      return this._value.map(v => this.getLabelByValue(v)).join(', ');
    }
    return `${this._value.length} items selected`;
  }

  // ── Misc ──────────────────────────────────────────────────────────────────

  resetSearch() {
    this.search = '';
    this.filtered = [...this.items];
    this.highlightedIndex = -1;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.container?.nativeElement.contains(e.target as Node)) {
      this.dropdownOpen = false;
      this.resetSearch();
    }
  }

  trackByIndex(index: number) { return index; }
}