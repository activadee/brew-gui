import { TestBed } from '@angular/core/testing';

import { UpdateSummaryCardComponent } from './update-summary-card.component';

describe('UpdateSummaryCardComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateSummaryCardComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(UpdateSummaryCardComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders per-channel count badges', async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateSummaryCardComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(UpdateSummaryCardComponent);

    fixture.componentRef.setInput('count', 6);
    fixture.componentRef.setInput('criticalCount', 1);
    fixture.componentRef.setInput('securityCount', 2);
    fixture.componentRef.setInput('normalCount', 3);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('total 6');
    expect(text).toContain('critical 1');
    expect(text).toContain('security 2');
    expect(text).toContain('normal 3');
  });

  it('keeps summary-line behavior for zero and non-zero totals', async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateSummaryCardComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(UpdateSummaryCardComponent);

    fixture.componentRef.setInput('count', 0);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Everything is current.');

    fixture.componentRef.setInput('count', 3);
    fixture.componentRef.setInput('lastCheckedAt', '2026-02-26T11:00:00.000Z');
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('3 updates available');
    expect(text).toContain('checked');
  });
});
