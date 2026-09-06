import {
  Component,
  Input,
  Output,
  EventEmitter,
  ElementRef,
  ViewChild,
  HostListener,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  Optional,
  Self
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';

@Component({
  selector: 'app-searchable-select',
  templateUrl: './searchable-select.component.html',
  styleUrls: ['./searchable-select.component.css']
})
export class SearchableSelectComponent
  implements ControlValueAccessor, AfterViewInit, OnChanges {

  @Input() items: any[] = [];
  @Input() bindValue = '';
  @Input() displayWith: ((item: any) => string) | null = null;
  @Input() placeholder = 'Select';
  @Input() searchable = false;
  @Input() disabled = false;
  @Input() nullOptionLabel = 'Select';

  @Input() dropdownPosition: 'top' | 'bottom' = 'bottom';

  @Output() selectionChange = new EventEmitter<any>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('container') container!: ElementRef<HTMLElement>;
  @ViewChild('nativeSelect') nativeSelect!: ElementRef<HTMLSelectElement>;

  dropdownOpen = false;
  search = '';
  filtered: any[] = [];
  highlightedIndex = -1;

  _value: any = null;
  isDisabled = false;

  onTouched: () => void = () => { };
  onChange: (_: any) => void = () => { };

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

  ngAfterViewInit(): void {
    this.filtered = this.items ? [...this.items] : [];
    if (this.nativeSelect?.nativeElement) {
      this.nativeSelect.nativeElement.value =
        this._coerceValueForSelect(this._value);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) {
      this.filtered = this.items ? [...this.items] : [];
    }
    if (changes['disabled']) {
      this.setDisabledState(!!this.disabled);
    }
  }

  writeValue(val: any): void {
    this._value = val;
    if (this.nativeSelect?.nativeElement) {
      this.nativeSelect.nativeElement.value =
        this._coerceValueForSelect(val);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
    this.disabled = isDisabled;
  }

  onNativeSelectChange(ev: Event) {
    const raw = (ev.target as HTMLSelectElement).value;
    const val = raw === '__null__' ? null : raw;
    this._value = val;
    this.onChange(val);
    this.onTouched();
    this.selectionChange.emit(val);
  }

  toggle() {
    if (this.isDisabled) return;

    this.dropdownOpen = !this.dropdownOpen;
    if (this.dropdownOpen) {
      const rect = this.container.nativeElement.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = 260;
      this.dropdownPosition = spaceBelow < dropdownHeight ? 'top' : 'bottom';
      this.filtered = this.getFiltered();
      this.highlightedIndex = this.filtered.length ? 0 : -1;

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
    this.highlightedIndex = this.filtered.length ? 0 : -1;
  }

  select(item: any) {
    const val = this.bindValue ? item?.[this.bindValue] : item;
    this._value = val ?? null;
    this.onChange(this._value);
    this.onTouched();
    this.selectionChange.emit(this._value);
    this.dropdownOpen = false;
    this.resetSearch();
  }

  getLabel(item: any): string {
    if (!item) return '';
    if (this.displayWith) return this.displayWith(item);
    if (typeof item !== 'object') return String(item);
    if ('name' in item) return String(item.name);
    if ('label' in item) return String(item.label);
    return Object.values(item).slice(0, 2).join(' ');
  }

  getSelectedLabel(): string {
    if (this._value == null) return this.placeholder;

    if (this.bindValue) {
      const found = this.items.find(
        it => String(it?.[this.bindValue]) === String(this._value)
      );
      return found ? this.getLabel(found) : String(this._value);
    }
    return this.getLabel(this._value);
  }

  resetSearch() {
    this.search = '';
    this.filtered = [...this.items];
    this.highlightedIndex = -1;
  }

  _coerceValueForSelect(v: any): string {
    return v == null ? '__null__' : String(v);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.container?.nativeElement.contains(e.target as Node)) {
      this.dropdownOpen = false;
      this.resetSearch();
    }
  }

  trackByIndex(index: number) {
    return index;
  }
}
