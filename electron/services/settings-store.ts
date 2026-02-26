import Store from 'electron-store';

import {
  DEFAULT_SETTINGS,
  appSettingsSchema,
  appSettingsUpdateSchema,
  type AppSettings,
  type AppSettingsUpdate
} from '../../src/shared/contracts';

interface PersistedState {
  settings: AppSettings;
  lastUpdateCount: number;
  lastCheckedAt: string | null;
  lastMetadataSyncAt: string | null;
  lastCleanupAt: string | null;
}

export class SettingsStore {
  private readonly store: Store<PersistedState>;

  constructor() {
    this.store = new Store<PersistedState>({
      name: 'brew-gui-settings',
      defaults: {
        settings: DEFAULT_SETTINGS,
        lastUpdateCount: 0,
        lastCheckedAt: null,
        lastMetadataSyncAt: null,
        lastCleanupAt: null
      }
    });
  }

  getSettings(): AppSettings {
    const current = this.store.get('settings');
    const merged = isObject(current)
      ? {
          ...DEFAULT_SETTINGS,
          ...current
        }
      : DEFAULT_SETTINGS;
    const parsed = appSettingsSchema.parse(merged);
    this.store.set('settings', parsed);
    return parsed;
  }

  updateSettings(update: AppSettingsUpdate): AppSettings {
    const validatedUpdate = appSettingsUpdateSchema.parse(update);
    const current = this.getSettings();
    const next = appSettingsSchema.parse({ ...current, ...validatedUpdate });
    this.store.set('settings', next);
    return next;
  }

  getLastUpdateCount(): number {
    return this.store.get('lastUpdateCount');
  }

  getLastCheckedAt(): string | null {
    return this.store.get('lastCheckedAt');
  }

  setLastCheck(count: number, checkedAt: string): void {
    this.store.set('lastUpdateCount', count);
    this.store.set('lastCheckedAt', checkedAt);
  }

  getLastMetadataSyncAt(): string | null {
    return this.store.get('lastMetadataSyncAt');
  }

  setLastMetadataSyncAt(syncedAt: string): void {
    this.store.set('lastMetadataSyncAt', syncedAt);
  }

  getLastCleanupAt(): string | null {
    return this.store.get('lastCleanupAt');
  }

  setLastCleanupAt(cleanedAt: string): void {
    this.store.set('lastCleanupAt', cleanedAt);
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
