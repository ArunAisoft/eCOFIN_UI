import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportsupplierComponent } from './importsupplier.component';

describe('ImportsupplierComponent', () => {
  let component: ImportsupplierComponent;
  let fixture: ComponentFixture<ImportsupplierComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportsupplierComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportsupplierComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
