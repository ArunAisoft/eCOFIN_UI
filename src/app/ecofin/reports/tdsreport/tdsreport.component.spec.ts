import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TdsreportComponent } from './tdsreport.component';

describe('TdsreportComponent', () => {
  let component: TdsreportComponent;
  let fixture: ComponentFixture<TdsreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TdsreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TdsreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
