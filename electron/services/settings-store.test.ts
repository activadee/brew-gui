import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('electron-store', () => ({
  default: class MockElectronStore<T extends Record<string, unknown>> {
    private readonly data: Record<string, unknown>;

    constructor(options: { defaults?: Record<string, unknown> }) {
      this.data = { ...(options.defaults ?? {}) };
    }

    get<K extends keyof T>(key: K): T[K] {
      return this.data[key as string] as T[K];
    }

    set<K extends keyof T>(key: K, value: T[K]): void {
      this.data[key as string] = value;
    }
  }
}));

import { DEFAULT_SETTINGS } from '../../src/shared/contracts';
import { SettingsStore } from './settings-store';

describe('SettingsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fills missing settings keys from defaults for legacy persisted payloads', () => {
    const store = new SettingsStore() as any;
    store.store.set('settings', {
      checkIntervalMinutes: 60,
      autoCheckOnLaunch: false,
      trayNotifyOnUpdates: false,
      defaultView: 'installed'
    });

    const settings = store.getSettings();

    expect(settings).toEqual({
      ...DEFAULT_SETTINGS,
      checkIntervalMinutes: 60,
      autoCheckOnLaunch: false,
      trayNotifyOnUpdates: false,
      defaultView: 'installed'
    });
  });

  it('persists scheduler timestamp metadata with typed getters/setters', () => {
    const store = new SettingsStore();

    store.setLastMetadataSyncAt('2026-02-20T10:00:00.000Z');
    store.setLastCleanupAt('2026-02-14T10:00:00.000Z');

    expect(store.getLastMetadataSyncAt()).toBe('2026-02-20T10:00:00.000Z');
    expect(store.getLastCleanupAt()).toBe('2026-02-14T10:00:00.000Z');
  });

  it('updates expanded settings payloads while preserving existing values', () => {
    const store = new SettingsStore();

    const updated = store.updateSettings({
      scheduledCleanupEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '21:30',
      quietHoursEnd: '06:30'
    });

    expect(updated.scheduledMetadataSyncEnabled).toBe(true);
    expect(updated.scheduledCleanupEnabled).toBe(true);
    expect(updated.quietHoursEnabled).toBe(true);
    expect(updated.quietHoursStart).toBe('21:30');
    expect(updated.quietHoursEnd).toBe('06:30');
    expect(updated.checkIntervalMinutes).toBe(DEFAULT_SETTINGS.checkIntervalMinutes);
  });

  it('persists smart-upgrade blocked package preferences', () => {
    const store = new SettingsStore();

    const updated = store.updateSettings({
      smartUpgradeBlockedPackages: [
        {
          kind: 'formula',
          name: 'openssl@3'
        },
        {
          kind: 'cask',
          name: 'firefox'
        }
      ]
    });

    expect(updated.smartUpgradeBlockedPackages).toEqual([
      { kind: 'formula', name: 'openssl@3' },
      { kind: 'cask', name: 'firefox' }
    ]);
  });
});
