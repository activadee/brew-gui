import { TestBed } from '@angular/core/testing';

import { PackageMetaComponent } from './package-meta.component';

describe('PackageMetaComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [PackageMetaComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(PackageMetaComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders update channel badges for critical, security, and normal', async () => {
    await TestBed.configureTestingModule({
      imports: [PackageMetaComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(PackageMetaComponent);

    fixture.componentRef.setInput('updateChannel', 'critical');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('critical');

    fixture.componentRef.setInput('updateChannel', 'security');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('security');

    fixture.componentRef.setInput('updateChannel', 'normal');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('normal');
  });

  it('does not render an update channel badge when channel is null', async () => {
    await TestBed.configureTestingModule({
      imports: [PackageMetaComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(PackageMetaComponent);

    fixture.componentRef.setInput('updateChannel', null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('critical');
    expect(fixture.nativeElement.textContent).not.toContain('security');
    expect(fixture.nativeElement.textContent).not.toContain('normal');
  });
});
