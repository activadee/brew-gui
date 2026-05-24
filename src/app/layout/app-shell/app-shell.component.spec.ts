import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import type { BrewJobFailedEvent, WindowChromeState } from '../../../shared/contracts';
import { BrewFacadeService } from '../../core/services/brew-facade.service';
import { PackageActionsService } from '../../core/services/package-actions.service';
import { ToastService } from '../../core/services/toast.service';
import { PackageSelectionStore } from '../../core/stores/package-selection.store';
import { PackageDetailsStore } from '../../core/stores/package-details.store';
import { TemplatesStore } from '../../core/stores/templates.store';
import { AppStatusStore } from '../../core/stores/app-status.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { InstalledStore } from '../../core/stores/installed.store';
import { JobsStore } from '../../core/stores/jobs.store';
import { SettingsStore } from '../../core/stores/settings.store';
import { UpdatesStore } from '../../core/stores/updates.store';
import { AppShellComponent } from './app-shell.component';

@Component({ standalone: true, template: '<p>view</p>' })
class DummyRouteComponent {}

const chromeState: WindowChromeState = {
  platform: 'darwin',
  isFocused: true,
  isMaximized: false,
  isFullScreen: false,
  canClose: true,
  canMinimize: true,
  canZoom: true,
  canFullScreen: true
};

describe('AppShellComponent titlebar', () => {
  async function render() {
    let onJobFailedHandler: ((event: BrewJobFailedEvent) => void) | undefined;
    const appStatusStore = {
      availability: signal({
        available: true,
        path: '/opt/homebrew/bin/brew',
        version: '4.5.1',
        checkedAt: new Date().toISOString()
      }),
      initialize: vi.fn(async () => undefined),
      applyUpdatesChanged: vi.fn()
    };

    const catalogStore = { refresh: vi.fn(async () => undefined), items: signal([]) };
    const installedStore = { refresh: vi.fn(async () => undefined), items: signal([]) };
    const updatesStore = {
      updateCount: signal(2),
      lastCheckedAt: signal<string | null>(new Date().toISOString()),
      refresh: vi.fn(async () => undefined),
      checkNow: vi.fn(async () => undefined),
      setExternalUpdate: vi.fn(),
      items: signal([])
    };

    const jobsStore = {
      drawerOpen: signal(false),
      runningCount: signal(0),
      succeededCount: signal(0),
      failedCount: signal(0),
      statusFilter: signal<'all' | 'running' | 'succeeded' | 'failed'>('all'),
      actionFilter: signal<
        | 'all'
        | 'install'
        | 'uninstall'
        | 'reinstall'
        | 'upgradeOne'
        | 'upgradeAll'
        | 'cleanup'
        | 'pin'
        | 'unpin'
        | 'tapAdd'
        | 'tapRemove'
        | 'serviceStart'
        | 'serviceStop'
        | 'serviceRestart'
        | 'doctor'
        | 'syncMetadata'
      >('all'),
      kindFilter: signal<'all' | 'formula' | 'cask' | 'system'>('all'),
      query: signal(''),
      filteredJobs: signal([]),
      closeDrawer: vi.fn(),
      openDrawer: vi.fn(),
      clearHistory: vi.fn(),
      setStatusFilter: vi.fn(),
      setActionFilter: vi.fn(),
      setKindFilter: vi.fn(),
      setQuery: vi.fn(),
      pushProgress: vi.fn(),
      markComplete: vi.fn(),
      markFailed: vi.fn()
    };

    const settingsStore = { load: vi.fn(async () => undefined), settings: () => ({}) };
    const templatesStore = { load: vi.fn(async () => undefined), templates: signal([]) };
    const packageDetailsStore = {
      open: signal(false),
      loading: signal(false),
      error: signal<string | null>(null),
      details: signal(null),
      openFor: vi.fn(async () => undefined),
      close: vi.fn()
    };
    const packageActions = {
      upgradeMany: vi.fn(async () => ({ succeeded: 0, failed: 0, results: [] })),
      uninstallMany: vi.fn(async () => ({ succeeded: 0, failed: 0, results: [] })),
      pinMany: vi.fn(async () => ({ succeeded: 0, failed: 0, results: [] })),
      installOne: vi.fn(async () => true),
      uninstallOne: vi.fn(async () => true),
      runTemplate: vi.fn(async () => true),
      notifyPinSuccess: vi.fn()
    };

    const facade = {
      isElectron: true,
      getWindowChromeState: vi.fn(async () => chromeState),
      recoverJobs: vi.fn(async () => []),
      pinOne: vi.fn(async () => ({ success: true })),
      syncMetadata: vi.fn(async () => ({ success: true, output: '', syncedAt: new Date().toISOString() })),
      onUpdatesChanged: vi.fn(() => () => undefined),
      onWindowChromeChanged: vi.fn(() => () => undefined),
      onJobProgress: vi.fn(() => () => undefined),
      onJobComplete: vi.fn(() => () => undefined),
      onJobFailed: vi.fn((handler: (event: BrewJobFailedEvent) => void) => {
        onJobFailedHandler = handler;
        return () => undefined;
      }),
      quitAndInstallUpdate: vi.fn(async () => undefined),
      getUpdateState: vi.fn(async () => ({
        status: 'disabled' as const,
        currentVersion: '0.0.0'
      })),
      onUpdateStateChanged: vi.fn(() => () => undefined)
    };

    const toast = {
      toasts: signal<
        Array<{
          id: string;
          message: string;
          kind: 'info' | 'success' | 'error';
        }>
      >([]),
      dismiss: vi.fn(),
      push: vi.fn(),
      pushWithAction: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AppShellComponent],
      providers: [
        provideRouter([
          { path: 'updates', component: DummyRouteComponent },
          { path: 'installed', component: DummyRouteComponent },
          { path: 'browse', component: DummyRouteComponent },
          { path: 'taps', component: DummyRouteComponent },
          { path: 'cleanup', component: DummyRouteComponent },
          { path: 'services', component: DummyRouteComponent },
          { path: 'doctor', component: DummyRouteComponent },
          { path: 'settings', component: DummyRouteComponent },
          { path: '', pathMatch: 'full', redirectTo: 'updates' }
        ]),
        { provide: AppStatusStore, useValue: appStatusStore },
        { provide: CatalogStore, useValue: catalogStore },
        { provide: InstalledStore, useValue: installedStore },
        { provide: UpdatesStore, useValue: updatesStore },
        { provide: JobsStore, useValue: jobsStore },
        { provide: SettingsStore, useValue: settingsStore },
        { provide: TemplatesStore, useValue: templatesStore },
        { provide: PackageDetailsStore, useValue: packageDetailsStore },
        { provide: PackageActionsService, useValue: packageActions },
        { provide: BrewFacadeService, useValue: facade },
        { provide: ToastService, useValue: toast },
        PackageSelectionStore
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(AppShellComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, facade, toast, onJobFailedHandler };
  }

  it('marks the titlebar as draggable and controls as non-draggable', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const titlebar = html.querySelector('.brew-titlebar');
    const paletteButton = html.querySelector('[data-testid="titlebar-palette"]');
    const customTrafficLight = html.querySelector('[data-testid="traffic-close"]');

    expect(titlebar?.classList.contains('drag-region')).toBe(true);
    expect(paletteButton?.classList.contains('no-drag')).toBe(true);
    expect(customTrafficLight).toBeNull();
  });

  it('opens command palette from titlebar quick action', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const paletteButton = html.querySelector(
      '[data-testid="titlebar-palette"]'
    ) as HTMLButtonElement | null;

    paletteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const paletteAction = Array.from(html.querySelectorAll('[role="option"]')).find((option) =>
      option.textContent?.includes('Check for updates now')
    );
    expect(paletteAction).toBeTruthy();
  });

  it('includes taps navigation action in command palette', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const paletteButton = html.querySelector(
      '[data-testid="titlebar-palette"]'
    ) as HTMLButtonElement | null;

    paletteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const tapsAction = Array.from(html.querySelectorAll('[role="option"]')).find((option) =>
      option.textContent?.includes('Go to Taps')
    );
    expect(tapsAction).toBeTruthy();
  });

  it('includes cleanup navigation action in command palette', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const paletteButton = html.querySelector(
      '[data-testid="titlebar-palette"]'
    ) as HTMLButtonElement | null;

    paletteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const cleanupAction = Array.from(html.querySelectorAll('[role="option"]')).find((option) =>
      option.textContent?.includes('Go to Cleanup')
    );
    expect(cleanupAction).toBeTruthy();
  });

  it('includes services navigation action in command palette', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const paletteButton = html.querySelector(
      '[data-testid="titlebar-palette"]'
    ) as HTMLButtonElement | null;

    paletteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const servicesAction = Array.from(html.querySelectorAll('[role="option"]')).find((option) =>
      option.textContent?.includes('Go to Services')
    );
    expect(servicesAction).toBeTruthy();
  });

  it('includes doctor navigation action in command palette', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const paletteButton = html.querySelector(
      '[data-testid="titlebar-palette"]'
    ) as HTMLButtonElement | null;

    paletteButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    const doctorAction = Array.from(html.querySelectorAll('[role="option"]')).find((option) =>
      option.textContent?.includes('Go to Doctor')
    );
    expect(doctorAction).toBeTruthy();
  });

  it('suppresses global toast for sync metadata job failures', async () => {
    const { onJobFailedHandler, toast } = await render();
    const toastPush = vi.mocked(toast.push);
    const before = toastPush.mock.calls.length;

    onJobFailedHandler?.({
      jobId: 'job-1',
      action: 'syncMetadata',
      command: 'brew update',
      kind: 'system',
      packageName: null,
      exitCode: 1,
      durationMs: 200,
      error: 'update failed',
      output: 'Error: update failed',
      timestamp: new Date().toISOString()
    });

    expect(toastPush.mock.calls.length).toBe(before);
  });
});
