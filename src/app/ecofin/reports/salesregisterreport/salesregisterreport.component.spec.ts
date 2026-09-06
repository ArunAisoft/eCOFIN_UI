import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalesregisterreportComponent } from './salesregisterreport.component';

describe('SalesregisterreportComponent', () => {
  let component: SalesregisterreportComponent;
  let fixture: ComponentFixture<SalesregisterreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalesregisterreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalesregisterreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
