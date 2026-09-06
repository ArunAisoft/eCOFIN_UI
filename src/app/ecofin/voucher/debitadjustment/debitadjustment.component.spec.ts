import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DebitAdjustmentComponent } from './debitadjustment.component';

describe('DebitAdjustmentComponent', () => {
  let component: DebitAdjustmentComponent;
  let fixture: ComponentFixture<DebitAdjustmentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DebitAdjustmentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DebitAdjustmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
