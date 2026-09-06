import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankbookreportComponent } from './bankbookreport.component';

describe('BankbookreportComponent', () => {
  let component: BankbookreportComponent;
  let fixture: ComponentFixture<BankbookreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BankbookreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankbookreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
