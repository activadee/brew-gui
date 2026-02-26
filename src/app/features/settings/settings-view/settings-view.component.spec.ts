import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS, type AppSettings, type AppSettingsUpdate } from '../../../../shared/contracts';
import { SettingsStore } from '../../../core/stores/settings.store';
import { SettingsViewComponent } from './settings-view.component';

describe('SettingsViewComponent', () => {
  async function render(initialSettings: AppSettings = DEFAULT_SETTINGS) {
    const settings = signal<AppSettings>(initialSettings);
    const update = vi.fn(async (payload: AppSettingsUpdate) => {
      settings.set({
        ...settings(),
        ...payload
      });
    });
    const settingsStore = {
      settings,
      saving: signal(false),
      error: signal<string | null>(null),
      update
    };

    await TestBed.configureTestingModule({
      imports: [SettingsViewComponent],
      providers: [{ provide: SettingsStore, useValue: settingsStore }]
    }).compileComponents();

    const fixture = TestBed.createComponent(SettingsViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, settingsStore, update };
  }

  it('renders scheduled maintenance and quiet-hours controls', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('Metadata sync');
    expect(html.textContent).toContain('Cleanup');
    expect(html.textContent).toContain('Mute scheduled tray alerts during quiet hours');
  });

  it('submits expanded settings payload on save', async () => {
    const { fixture, update } = await render();
    const component = fixture.componentInstance as any;

    component.form.patchValue({
      checkIntervalMinutes: '1440',
      autoCheckOnLaunch: false,
      trayNotifyOnUpdates: false,
      scheduledMetadataSyncEnabled: false,
      scheduledCleanupEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '23:15',
      quietHoursEnd: '06:45',
      defaultView: 'installed'
    });

    await component.save();

    expect(update).toHaveBeenCalledWith({
      checkIntervalMinutes: 1440,
      autoCheckOnLaunch: false,
      trayNotifyOnUpdates: false,
      scheduledMetadataSyncEnabled: false,
      scheduledCleanupEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '23:15',
      quietHoursEnd: '06:45',
      defaultView: 'installed'
    });
  });

  it('resets form state back to current store settings', async () => {
    const initial: AppSettings = {
      ...DEFAULT_SETTINGS,
      scheduledCleanupEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '21:00',
      quietHoursEnd: '05:30'
    };

    const { fixture } = await render(initial);
    const component = fixture.componentInstance as any;

    component.form.patchValue({
      checkIntervalMinutes: '60',
      quietHoursStart: '10:00',
      quietHoursEnd: '11:00',
      scheduledCleanupEnabled: false
    });

    component.resetForm();

    expect(component.form.getRawValue()).toEqual({
      checkIntervalMinutes: '360',
      autoCheckOnLaunch: true,
      trayNotifyOnUpdates: true,
      scheduledMetadataSyncEnabled: true,
      scheduledCleanupEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '21:00',
      quietHoursEnd: '05:30',
      defaultView: 'updates'
    });
  });
});
