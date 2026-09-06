import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankReconciliationReportComponent } from './bankreconciliationreport.component';

describe('BankReconciliationReportComponent', () => {
  let component: BankReconciliationReportComponent;
  let fixture: ComponentFixture<BankReconciliationReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankReconciliationReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankReconciliationReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
