import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ZardAlertDialogService } from '@/shared/components/alert-dialog';
import { DEFAULT_SETTINGS, type AppSettings, type AppSettingsUpdate } from '../../../../shared/contracts';
import { ToastService } from '../../../core/services/toast.service';
import { SettingsStore } from '../../../core/stores/settings.store';
import { TemplatesStore } from '../../../core/stores/templates.store';
import { SettingsViewComponent } from './settings-view.component';

describe('SettingsViewComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function render(initialSettings: AppSettings = DEFAULT_SETTINGS) {
    const settings = signal<AppSettings>(initialSettings);
    const updateSetting = vi.fn((key: keyof AppSettings, value: AppSettings[keyof AppSettings]) => {
      settings.update((current) => ({ ...current, [key]: value }));
    });
    const update = vi.fn(async (payload: AppSettingsUpdate) => {
      settings.set({
        ...settings(),
        ...payload
      });
    });

    const settingsStore = {
      settings,
      saving: signal(false),
      savingKey: signal<keyof AppSettings | null>(null),
      lastSavedAt: signal<number | null>(null),
      error: signal<string | null>(null),
      saveOutcome: signal<'success' | 'error' | null>(null),
      saveOutcomeAt: signal<number | null>(null),
      updateSetting,
      update,
      resetToDefaults: vi.fn(async () => update({ ...DEFAULT_SETTINGS }))
    };

    const templatesStore = {
      templates: signal([]),
      load: vi.fn(async () => undefined),
      save: vi.fn(async () => undefined),
      remove: vi.fn(async () => undefined)
    };

    const toast = {
      push: vi.fn()
    };

    const alertDialog = {
      confirm: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [SettingsViewComponent],
      providers: [
        { provide: SettingsStore, useValue: settingsStore },
        { provide: TemplatesStore, useValue: templatesStore },
        { provide: ToastService, useValue: toast },
        { provide: ZardAlertDialogService, useValue: alertDialog }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, settingsStore, updateSetting, update, toast, alertDialog };
  }

  it('renders all section headings and anchor links', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('General');
    expect(html.textContent).toContain('Brew & CLI');
    expect(html.textContent).toContain('Notifications');
    expect(html.textContent).toContain('Updates');
    expect(html.textContent).toContain('Privacy');
    expect(html.textContent).toContain('Danger zone');

    const nav = html.querySelector('nav[aria-label="Settings sections"]');
    expect(nav).toBeTruthy();
    expect(nav?.querySelectorAll('a[href^="#settings-"]').length).toBe(6);
  });

  it('marks the active anchor with aria-current and links to scroll targets', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const active = html.querySelector('nav a[aria-current="location"]');
    expect(active?.getAttribute('href')).toBe('#settings-general');

    for (const id of ['general', 'brew', 'notifications', 'updates', 'privacy', 'danger']) {
      expect(html.querySelector(`#settings-${id}`)).toBeTruthy();
    }
  });

  it('toggle triggers store updateSetting', async () => {
    const { fixture, updateSetting } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const privacySection = html.querySelector('#settings-privacy');
    const telemetrySwitch = privacySection?.querySelector('button[role="switch"]') as HTMLButtonElement | null;
    telemetrySwitch?.click();
    fixture.detectChanges();

    expect(updateSetting).toHaveBeenCalledWith('telemetryEnabled', true);
  });

  it('shows save error alert when store reports failure', async () => {
    const { fixture, settingsStore } = await render();
    settingsStore.error.set('IPC failed');
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    expect(html.textContent).toContain('IPC failed');
  });

  it('shows success toast when save outcome is success', async () => {
    const { fixture, settingsStore, toast } = await render();

    settingsStore.saveOutcome.set('success');
    settingsStore.saveOutcomeAt.set(Date.now());
    fixture.detectChanges();
    await fixture.whenStable();

    expect(toast.push).toHaveBeenCalledWith('Settings saved', 'success', 2_000);
  });

  it('opens reset confirmation dialog from danger zone', async () => {
    const { fixture, alertDialog } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const resetButton = [...html.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Reset settings')
    ) as HTMLButtonElement;
    resetButton.click();

    expect(alertDialog.confirm).toHaveBeenCalledWith(
      expect.objectContaining({
        zTitle: 'Reset all settings?',
        zOkText: 'Reset settings'
      })
    );
  });

  it('updates default view when segmented control changes', async () => {
    const { fixture, updateSetting } = await render({
      ...DEFAULT_SETTINGS,
      defaultView: 'updates'
    });
    const html = fixture.nativeElement as HTMLElement;

    const browseOption = [...html.querySelectorAll('#settings-general button')].find((button) =>
      button.textContent?.includes('Browse')
    ) as HTMLButtonElement | undefined;
    browseOption?.click();
    fixture.detectChanges();

    expect(updateSetting).toHaveBeenCalledWith('defaultView', 'browse');
  });
});
