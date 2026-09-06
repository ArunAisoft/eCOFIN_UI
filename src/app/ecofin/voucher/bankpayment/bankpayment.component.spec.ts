import { ComponentFixture, TestBed } from '@angular/core/testing';

import { bankpaymentComponent } from './bankpayment.component';

describe('bankpaymentComponent', () => {
  let component: bankpaymentComponent;
  let fixture: ComponentFixture<bankpaymentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ bankpaymentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(bankpaymentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
