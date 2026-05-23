import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { BrewFacadeService } from '../../../core/services/brew-facade.service';
import { AppStatusStore } from '../../../core/stores/app-status.store';
import { SettingsStore } from '../../../core/stores/settings.store';
import { UpdatesStore } from '../../../core/stores/updates.store';
import { TrayPopoverComponent } from './tray-popover.component';

describe('TrayPopoverComponent', () => {
  async function render() {
    const appStatusStore = {
      availability: signal({
        available: true,
        path: '/opt/homebrew/bin/brew',
        version: '4.5.1',
        checkedAt: new Date().toISOString(),
      }),
      initialize: vi.fn(async () => undefined),
    };

    const updatesStore = {
      updateCount: signal(2),
      lastCheckedAt: signal<string | null>(new Date('2026-05-24T01:21:35').toISOString()),
      refresh: vi.fn(async () => undefined),
      checkNow: vi.fn(async () => undefined),
      setExternalUpdate: vi.fn(),
    };

    const settingsStore = {
      load: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
      settings: signal({ checkIntervalMinutes: 360 }),
    };

    const facade = {
      onUpdatesChanged: vi.fn(() => () => undefined),
      openMainWindow: vi.fn(async () => undefined),
    };

    await TestBed.configureTestingModule({
      imports: [TrayPopoverComponent],
      providers: [
        { provide: AppStatusStore, useValue: appStatusStore },
        { provide: UpdatesStore, useValue: updatesStore },
        { provide: SettingsStore, useValue: settingsStore },
        { provide: BrewFacadeService, useValue: facade },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(TrayPopoverComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, updatesStore, settingsStore, appStatusStore, facade };
  }

  it('should create', async () => {
    const { fixture } = await render();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders flat tray titlebar chrome', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const titlebar = html.querySelector('.brew-titlebar.brew-tray-titlebar.window-titlebar');
    expect(titlebar).toBeTruthy();
    expect(titlebar?.classList.contains('brew-titlebar-compact')).toBe(true);
    expect(titlebar?.querySelector('.brew-titlebar-left')?.textContent).toContain('Brewdeck');
    expect(titlebar?.querySelector('.brew-tray-status-badge')?.textContent).toContain('2 updates');
  });

  it('renders tray status row with brew connection and last check', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const statusRow = html.querySelector('.brew-tray-status-row');
    expect(statusRow).toBeTruthy();
    expect(statusRow?.querySelector('app-connection-status-pill')).toBeTruthy();
    expect(statusRow?.querySelector('.brew-tray-last-check-label')?.textContent).toContain('Last check');
    expect(statusRow?.querySelector('.brew-tray-last-check-time')?.textContent).toMatch(/\d{2}:\d{2}:\d{2}/);
    expect(html.querySelector('app-top-status-bar')).toBeNull();
  });

  it('renders check interval segmented control and open app action', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    expect(html.querySelector('.brew-tray-content z-segmented')).toBeTruthy();
    expect(html.textContent).toContain('Check interval');
    expect(html.textContent).toContain('Open app');
    expect(html.querySelector('z-card')).toBeNull();
  });

  it('renders check now in titlebar', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const titlebar = html.querySelector('.brew-titlebar-right');
    expect(titlebar?.textContent).toContain('Check now');
  });

  it('initializes app status on load', async () => {
    const { appStatusStore } = await render();
    expect(appStatusStore.initialize).toHaveBeenCalled();
  });

  it('renders tray shell chrome with theme tokens in dark mode', async () => {
    document.documentElement.classList.add('dark');

    try {
      const { fixture } = await render();
      const html = fixture.nativeElement as HTMLElement;

      expect(html.querySelector('.brew-tray-shell')).toBeTruthy();
      expect(html.querySelector('.brew-tray-status-row')).toBeTruthy();
      expect(html.querySelector('.brew-tray-segmented')).toBeTruthy();
    } finally {
      document.documentElement.classList.remove('dark');
    }
  });
});
