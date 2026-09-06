import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JournalregisterreportComponent } from './journalregisterreport.component';

describe('JournalregisterreportComponent', () => {
  let component: JournalregisterreportComponent;
  let fixture: ComponentFixture<JournalregisterreportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JournalregisterreportComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JournalregisterreportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
