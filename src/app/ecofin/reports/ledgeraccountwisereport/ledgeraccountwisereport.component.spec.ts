import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LedgeraccountwisereportComponent } from './ledgeraccountwisereport.component';

describe('LedgeraccountwisereportComponent', () => {
  let component: LedgeraccountwisereportComponent;
  let fixture: ComponentFixture<LedgeraccountwisereportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LedgeraccountwisereportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LedgeraccountwisereportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
