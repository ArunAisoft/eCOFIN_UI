import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralLedgerReportComponent } from './generalledgerreport.component';

describe('GeneralLedgerReportComponent', () => {
  let component: GeneralLedgerReportComponent;
  let fixture: ComponentFixture<GeneralLedgerReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralLedgerReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralLedgerReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
