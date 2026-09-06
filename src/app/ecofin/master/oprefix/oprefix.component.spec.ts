import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OprefixComponent } from './oprefix.component';

describe('OprefixComponent', () => {
  let component: OprefixComponent;
  let fixture: ComponentFixture<OprefixComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OprefixComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OprefixComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
