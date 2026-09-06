import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PurchaseregisterreportComponent } from './purchaseregisterreport.component';

describe('PurchaseregisterreportComponent', () => {
  let component: PurchaseregisterreportComponent;
  let fixture: ComponentFixture<PurchaseregisterreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PurchaseregisterreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PurchaseregisterreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
