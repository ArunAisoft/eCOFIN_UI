import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultiSearchableSelectComponent } from './multisearchable-select.component';

describe('MultiSearchableSelectComponent', () => {
  let component: MultiSearchableSelectComponent;
  let fixture: ComponentFixture<MultiSearchableSelectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MultiSearchableSelectComponent] }).compileComponents();

    fixture = TestBed.createComponent(MultiSearchableSelectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
