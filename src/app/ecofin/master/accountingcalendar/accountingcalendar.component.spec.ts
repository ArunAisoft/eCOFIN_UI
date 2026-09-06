import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AccountingcalendarComponent } from './accountingcalendar.component';

describe('AccountingcalendarComponent', () => {
  let component: AccountingcalendarComponent;
  let fixture: ComponentFixture<AccountingcalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AccountingcalendarComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountingcalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
