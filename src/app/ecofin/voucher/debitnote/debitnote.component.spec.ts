import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DebitnoteComponent } from './debitnote.component';

describe('DebitnoteComponent', () => {
  let component: DebitnoteComponent;
  let fixture: ComponentFixture<DebitnoteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DebitnoteComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DebitnoteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
