import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgeingReportComponent } from './ageingreport.component';

describe('AgeingReportComponent', () => {
  let component: AgeingReportComponent;
  let fixture: ComponentFixture<AgeingReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgeingReportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AgeingReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
