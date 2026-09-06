import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreditAdjustmentComponent } from './creditadjustment.component';

describe('creditadjustmentComponent', () => {
  let component: CreditAdjustmentComponent;
  let fixture: ComponentFixture<CreditAdjustmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreditAdjustmentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreditAdjustmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
