import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CashpaymentComponent } from './cashpayment.component';

describe('CashpaymentComponent', () => {
  let component: CashpaymentComponent;
  let fixture: ComponentFixture<CashpaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CashpaymentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CashpaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
