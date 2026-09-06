import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SalevoucherComponent } from './salevoucher.component';

describe('SalevoucherComponent', () => {
  let component: SalevoucherComponent;
  let fixture: ComponentFixture<SalevoucherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SalevoucherComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SalevoucherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
