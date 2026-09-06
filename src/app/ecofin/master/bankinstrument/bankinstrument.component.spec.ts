import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BankinstrumentComponent } from './bankinstrument.component';

describe('BankinstrumentComponent', () => {
  let component: BankinstrumentComponent;
  let fixture: ComponentFixture<BankinstrumentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BankinstrumentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BankinstrumentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
