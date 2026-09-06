import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebitnoteregisterreportComponent } from './debitnoteregisterreport.component';

describe('DebitnoteregisterreportComponent', () => {
  let component: DebitnoteregisterreportComponent;
  let fixture: ComponentFixture<DebitnoteregisterreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DebitnoteregisterreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DebitnoteregisterreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
