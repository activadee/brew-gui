import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { DEFAULT_SETTINGS } from '../../../shared/contracts';
import { BrewFacadeService } from '../services/brew-facade.service';
import { SettingsStore } from './settings.store';

describe('SettingsStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createStore(
    updateSettings: ReturnType<typeof vi.fn>,
    getSettings = vi.fn(async () => DEFAULT_SETTINGS)
  ) {
    TestBed.configureTestingModule({
      providers: [
        SettingsStore,
        { provide: BrewFacadeService, useValue: { getSettings, updateSettings } }
      ]
    });

    return {
      store: TestBed.inject(SettingsStore),
      updateSettings
    };
  }

  it('debounces optimistic updates and records success outcome', async () => {
    const updateSettings = vi.fn(async () => ({
      ...DEFAULT_SETTINGS,
      telemetryEnabled: true
    }));

    const { store, updateSettings: update } = createStore(updateSettings);
    store.updateSetting('telemetryEnabled', true);

    expect(store.settings().telemetryEnabled).toBe(true);
    expect(update).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);

    expect(update).toHaveBeenCalledWith({ telemetryEnabled: true });
    expect(store.saveOutcome()).toBe('success');
    expect(store.saveOutcomeAt()).not.toBeNull();
  });

  it('reverts optimistic state and records error outcome when save fails', async () => {
    const updateSettings = vi.fn(async () => {
      throw new Error('IPC failed');
    });

    const { store } = createStore(updateSettings);
    store.updateSetting('telemetryEnabled', true);

    await vi.advanceTimersByTimeAsync(300);

    expect(store.settings().telemetryEnabled).toBe(false);
    expect(store.error()).toBe('IPC failed');
    expect(store.saveOutcome()).toBe('error');
  });

  it('merges rapid toggles into one debounced save with merged payload', async () => {
    const updateSettings = vi.fn(async () => ({
      ...DEFAULT_SETTINGS,
      telemetryEnabled: true,
      trayNotifyOnUpdates: true
    }));

    const { store, updateSettings: update } = createStore(updateSettings);

    store.updateSetting('telemetryEnabled', true);
    store.updateSetting('trayNotifyOnUpdates', true);

    expect(update).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(300);

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith({
      telemetryEnabled: true,
      trayNotifyOnUpdates: true
    });
  });

  it('serializes a second flush while save is in flight', async () => {
    let resolveFirst: ((value: typeof DEFAULT_SETTINGS) => void) | undefined;
    const updateSettings = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<typeof DEFAULT_SETTINGS>((resolve) => {
            resolveFirst = resolve;
          })
      )
      .mockImplementationOnce(async () => ({
        ...DEFAULT_SETTINGS,
        telemetryEnabled: true,
        trayNotifyOnUpdates: true
      }));

    const { store, updateSettings: update } = createStore(updateSettings);

    store.updateSetting('telemetryEnabled', true);
    await vi.advanceTimersByTimeAsync(300);
    expect(update).toHaveBeenCalledTimes(1);

    store.updateSetting('trayNotifyOnUpdates', true);
    await vi.advanceTimersByTimeAsync(300);
    expect(update).toHaveBeenCalledTimes(1);

    resolveFirst?.({ ...DEFAULT_SETTINGS, telemetryEnabled: true });
    await vi.runAllTimersAsync();

    expect(update).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenLastCalledWith({ trayNotifyOnUpdates: true });
  });

  it('persists immediately via update() and sets savingKey during save', async () => {
    const updateSettings = vi.fn(async () => ({
      ...DEFAULT_SETTINGS,
      checkIntervalMinutes: 360 as const
    }));

    const { store } = createStore(updateSettings);

    await store.update({ checkIntervalMinutes: 360 });

    expect(updateSettings).toHaveBeenCalledWith({ checkIntervalMinutes: 360 });
    expect(store.settings().checkIntervalMinutes).toBe(360);
    expect(store.saveOutcome()).toBe('success');
  });

  it('awaits debounced flush before immediate update during resetToDefaults', async () => {
    let resolvePending: ((value: typeof DEFAULT_SETTINGS) => void) | undefined;
    const updateSettings = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<typeof DEFAULT_SETTINGS>((resolve) => {
            resolvePending = resolve;
          })
      )
      .mockImplementationOnce(async () => DEFAULT_SETTINGS);

    const { store } = createStore(updateSettings);

    store.updateSetting('telemetryEnabled', true);
    await vi.advanceTimersByTimeAsync(300);

    const resetPromise = store.resetToDefaults();
    await Promise.resolve();

    expect(updateSettings).toHaveBeenCalledTimes(1);
    expect(updateSettings).not.toHaveBeenCalledWith(DEFAULT_SETTINGS);

    resolvePending?.({ ...DEFAULT_SETTINGS, telemetryEnabled: true });
    await resetPromise;

    expect(updateSettings).toHaveBeenCalledTimes(2);
    expect(updateSettings).toHaveBeenLastCalledWith(DEFAULT_SETTINGS);
    expect(store.settings()).toEqual(DEFAULT_SETTINGS);
  });
});
