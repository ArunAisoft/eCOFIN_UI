import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LedgeraccountComponent } from './ledgeraccount.component';

describe('LedgeraccountComponent', () => {
  let component: LedgeraccountComponent;
  let fixture: ComponentFixture<LedgeraccountComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LedgeraccountComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LedgeraccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
