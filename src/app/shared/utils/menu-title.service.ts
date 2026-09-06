import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MenuTitleService {
  private titleSubject = new BehaviorSubject<string>('Dashboard');
  currentTitle = this.titleSubject.asObservable();

  setTitle(title: string): void {
    this.titleSubject.next(title);
  }

  get currentValue(): string {
    return this.titleSubject.value;
  }
}
