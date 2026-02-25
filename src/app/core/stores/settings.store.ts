import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import { DEFAULT_SETTINGS, type AppSettings, type AppSettingsUpdate } from '../../../shared/contracts';
import { BrewFacadeService } from '../services/brew-facade.service';

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  settings: DEFAULT_SETTINGS,
  loading: false,
  saving: false,
  error: null
};

export const SettingsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, facade = inject(BrewFacadeService)) => ({
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

    async update(update: AppSettingsUpdate): Promise<void> {
      patchState(store, { saving: true, error: null });

      try {
        const settings = await facade.updateSettings(update);
        patchState(store, { settings, saving: false });
      } catch (error) {
        patchState(store, {
          saving: false,
          error: (error as Error).message
        });
      }
    }
  }))
);
