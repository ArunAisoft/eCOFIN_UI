import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreditnoteComponent } from './creditnote.component';

describe('CreditnoteComponent', () => {
  let component: CreditnoteComponent;
  let fixture: ComponentFixture<CreditnoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreditnoteComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreditnoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
