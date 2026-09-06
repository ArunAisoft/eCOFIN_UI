import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EcofinComponent } from './ecofin.component';

describe('EcofinComponent', () => {
  let component: EcofinComponent;
  let fixture: ComponentFixture<EcofinComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EcofinComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EcofinComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
