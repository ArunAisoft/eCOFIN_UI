import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankReceiptsComponent } from './bankreceipts.component';

describe('BankreceiptsComponent', () => {
  let component: BankReceiptsComponent;
  let fixture: ComponentFixture<BankReceiptsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BankReceiptsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankReceiptsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
