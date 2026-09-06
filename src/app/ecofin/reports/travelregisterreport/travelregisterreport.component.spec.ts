import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TravelregisterreportComponent } from './travelregisterreport.component';

describe('TravelregisterreportComponent', () => {
  let component: TravelregisterreportComponent;
  let fixture: ComponentFixture<TravelregisterreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TravelregisterreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TravelregisterreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
