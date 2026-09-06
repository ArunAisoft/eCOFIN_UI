import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditnoteregisterreportComponent } from './creditnoteregisterreport.component';

describe('CreditnoteregisterreportComponent', () => {
  let component: CreditnoteregisterreportComponent;
  let fixture: ComponentFixture<CreditnoteregisterreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditnoteregisterreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreditnoteregisterreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
