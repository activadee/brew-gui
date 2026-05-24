import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { AppUpdateStore } from '../../../core/stores/app-update.store';
import { SidebarNavComponent } from './sidebar-nav.component';

describe('SidebarNavComponent', () => {
  function configure(updateStore: Record<string, unknown> = {}) {
    const appUpdateStore = {
      currentVersion: signal('0.5.2'),
      canRestart: signal(false),
      sidebarFooterLabel: signal(''),
      state: signal<{ status: string } | null>({ status: 'upToDate' }),
      quitAndInstall: () => undefined,
      ...updateStore
    };

    return TestBed.configureTestingModule({
      imports: [SidebarNavComponent],
      providers: [
        provideRouter([]),
        { provide: AppUpdateStore, useValue: appUpdateStore }
      ]
    });
  }

  it('should create', async () => {
    await configure().compileComponents();

    const fixture = TestBed.createComponent(SidebarNavComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('includes services navigation entry', async () => {
    await configure().compileComponents();

    const fixture = TestBed.createComponent(SidebarNavComponent);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Services');
  });

  it('includes doctor navigation entry', async () => {
    await configure().compileComponents();

    const fixture = TestBed.createComponent(SidebarNavComponent);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Doctor');
  });

  it('shows version in the sidebar footer', async () => {
    await configure().compileComponents();

    const fixture = TestBed.createComponent(SidebarNavComponent);
    fixture.detectChanges();

    const footer = (fixture.nativeElement as HTMLElement).querySelector('.brew-sidebar-footer');
    expect(footer?.textContent).toContain('v0.5.2');
  });

  it('shows Update button when an app update is ready', async () => {
    await configure({
      canRestart: signal(true),
      state: signal({ status: 'ready' })
    }).compileComponents();

    const fixture = TestBed.createComponent(SidebarNavComponent);
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('Update');
    expect(html.querySelector('.brew-sidebar-footer button')).toBeTruthy();
  });
});
