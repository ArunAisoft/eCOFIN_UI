import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContravoucherregisterreportComponent } from './contravoucherregisterreport.component';

describe('ContravoucherregisterreportComponent', () => {
  let component: ContravoucherregisterreportComponent;
  let fixture: ComponentFixture<ContravoucherregisterreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContravoucherregisterreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContravoucherregisterreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
