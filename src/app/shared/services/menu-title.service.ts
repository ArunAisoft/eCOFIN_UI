import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MenuTitleService {
  private readonly storageKey = 'currentMenuTitle';

  private titleSource = new BehaviorSubject<string>(
    localStorage.getItem(this.storageKey) || 'Dashboard'
  );

  readonly currentTitle: Observable<string> = this.titleSource.asObservable();

  get currentValue(): string {
    return this.titleSource.value;
  }

  setTitle(title: string): void {
    const safeTitle = title || 'Dashboard';
    this.titleSource.next(safeTitle);
    localStorage.setItem(this.storageKey, safeTitle);
  }
}
