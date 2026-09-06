import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LedgerpartywisereportComponent } from './ledgerpartywisereport.component';

describe('LedgerpartywisereportComponent', () => {
  let component: LedgerpartywisereportComponent;
  let fixture: ComponentFixture<LedgerpartywisereportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LedgerpartywisereportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LedgerpartywisereportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
