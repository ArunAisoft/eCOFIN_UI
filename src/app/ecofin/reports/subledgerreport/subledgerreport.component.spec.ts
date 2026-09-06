import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubLedgerReportComponent } from './subledgerreport.component';

describe('SubLedgerReportComponent', () => {
  let component: SubLedgerReportComponent;
  let fixture: ComponentFixture<SubLedgerReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubLedgerReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubLedgerReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
