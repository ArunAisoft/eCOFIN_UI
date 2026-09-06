import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportcustomerComponent } from './importcustomer.component';

describe('ImportcustomerComponent', () => {
  let component: ImportcustomerComponent;
  let fixture: ComponentFixture<ImportcustomerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportcustomerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportcustomerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
