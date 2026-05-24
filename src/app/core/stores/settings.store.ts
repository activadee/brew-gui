import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { DEFAULT_SETTINGS, type AppSettings, type AppSettingsUpdate } from '../../../shared/contracts';
import { BrewFacadeService } from '../services/brew-facade.service';

const SAVE_DEBOUNCE_MS = 300;

export type SettingsSaveOutcome = 'success' | 'error';

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  saving: boolean;
  savingKey: keyof AppSettings | null;
  lastSavedAt: number | null;
  error: string | null;
  saveOutcome: SettingsSaveOutcome | null;
  saveOutcomeAt: number | null;
}

interface PersistOptions {
  immediate?: boolean;
  rollback?: AppSettings;
  key?: keyof AppSettings | null;
}

const initialState: SettingsState = {
  settings: DEFAULT_SETTINGS,
  loading: false,
  saving: false,
  savingKey: null,
  lastSavedAt: null,
  error: null,
  saveOutcome: null,
  saveOutcomeAt: null
};

export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, facade = inject(BrewFacadeService)) => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingUpdate: AppSettingsUpdate = {};
    let rollbackSnapshot: AppSettings | null = null;
    let saveInFlight: Promise<boolean> | null = null;
    let deferredUpdate: AppSettingsUpdate = {};
    let deferredRollback: AppSettings | null = null;

    const clearDebounce = (): void => {
      if (debounceTimer !== null) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
    };

    const drainPending = (): { update: AppSettingsUpdate; rollback: AppSettings | null } => {
      const update = pendingUpdate;
      const rollback = rollbackSnapshot;
      pendingUpdate = {};
      rollbackSnapshot = null;
      return { update, rollback };
    };

    const applyOptimistic = (update: AppSettingsUpdate, key?: keyof AppSettings | null): void => {
      const current = store.settings();
      if (!rollbackSnapshot) {
        rollbackSnapshot = current;
      }

      patchState(store, {
        settings: { ...current, ...update },
        savingKey: key ?? store.savingKey(),
        error: null
      });
    };

    const enqueueDuringSave = (update: AppSettingsUpdate, rollback: AppSettings | null): void => {
      deferredUpdate = { ...deferredUpdate, ...update };
      if (!deferredRollback && rollback) {
        deferredRollback = rollback;
      }
    };

    const runSave = async (update: AppSettingsUpdate, rollback: AppSettings | null): Promise<boolean> => {
      if (Object.keys(update).length === 0) {
        return true;
      }

      patchState(store, { saving: true, error: null });

      try {
        const settings = await facade.updateSettings(update);
        patchState(store, {
          settings,
          saving: false,
          savingKey: null,
          lastSavedAt: Date.now(),
          error: null,
          saveOutcome: 'success',
          saveOutcomeAt: Date.now()
        });
        return true;
      } catch (error) {
        const message = (error as Error).message;
        if (rollback) {
          patchState(store, {
            settings: rollback,
            saving: false,
            savingKey: null,
            error: message,
            saveOutcome: 'error',
            saveOutcomeAt: Date.now()
          });
        } else {
          patchState(store, {
            saving: false,
            savingKey: null,
            error: message,
            saveOutcome: 'error',
            saveOutcomeAt: Date.now()
          });
        }
        return false;
      }
    };

    const startSave = async (update: AppSettingsUpdate, rollback: AppSettings | null): Promise<boolean> => {
      if (saveInFlight) {
        enqueueDuringSave(update, rollback);
        return saveInFlight;
      }

      const doSave = async (): Promise<boolean> => {
        let currentUpdate = update;
        let currentRollback = rollback;
        let lastResult = true;

        while (Object.keys(currentUpdate).length > 0) {
          lastResult = await runSave(currentUpdate, currentRollback);

          if (Object.keys(deferredUpdate).length === 0) {
            break;
          }

          currentUpdate = deferredUpdate;
          currentRollback = lastResult ? store.settings() : (deferredRollback ?? store.settings());
          deferredUpdate = {};
          deferredRollback = null;
        }

        return lastResult;
      };

      saveInFlight = doSave().finally(() => {
        saveInFlight = null;
      });
      return saveInFlight;
    };

    const flushDebounced = (): void => {
      debounceTimer = null;
      const { update, rollback } = drainPending();

      if (Object.keys(update).length === 0) {
        return;
      }

      void startSave(update, rollback);
    };

    const persist = async (update: AppSettingsUpdate, options: PersistOptions = {}): Promise<boolean> => {
      const { immediate = false, rollback, key = null } = options;

      if (immediate) {
        clearDebounce();
        const { update: debouncedUpdate, rollback: debouncedRollback } = drainPending();
        const mergedUpdate = { ...debouncedUpdate, ...update };
        const mergedRollback = debouncedRollback ?? rollback ?? store.settings();

        applyOptimistic(update, key);

        if (saveInFlight) {
          await saveInFlight;
        }

        return startSave(mergedUpdate, mergedRollback);
      }

      applyOptimistic(update, key);
      pendingUpdate = { ...pendingUpdate, ...update };
      clearDebounce();
      debounceTimer = setTimeout(flushDebounced, SAVE_DEBOUNCE_MS);
      return true;
    };

    return {
      async load(): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          const settings = await facade.getSettings();
          patchState(store, { settings, loading: false });
        } catch (error) {
          patchState(store, {
            loading: false,
            error: (error as Error).message
          });
        }
      },

      queueUpdate(update: AppSettingsUpdate, key?: keyof AppSettings): void {
        void persist(update, { key });
      },

      updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
        void persist({ [key]: value }, { key });
      },

      async update(update: AppSettingsUpdate): Promise<void> {
        const success = await persist(update, { immediate: true, rollback: store.settings() });
        if (!success) {
          throw new Error(store.error() ?? 'Failed to save settings');
        }
      },

      async resetToDefaults(): Promise<void> {
        await this.update({ ...DEFAULT_SETTINGS });
      }
    };
  })
);
