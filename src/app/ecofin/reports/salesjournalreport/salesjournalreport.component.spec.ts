import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesjournalreportComponent } from './salesjournalreport.component';

describe('SalesjournalreportComponent', () => {
  let component: SalesjournalreportComponent;
  let fixture: ComponentFixture<SalesjournalreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesjournalreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesjournalreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
