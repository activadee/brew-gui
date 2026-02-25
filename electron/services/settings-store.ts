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
}

export class SettingsStore {
  private readonly store: Store<PersistedState>;

  constructor() {
    this.store = new Store<PersistedState>({
      name: 'brew-gui-settings',
      defaults: {
        settings: DEFAULT_SETTINGS,
        lastUpdateCount: 0,
        lastCheckedAt: null
      }
    });
  }

  getSettings(): AppSettings {
    const current = this.store.get('settings');
    return appSettingsSchema.parse(current);
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
}
