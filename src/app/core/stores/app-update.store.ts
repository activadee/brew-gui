import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { AppUpdateState } from '../../../shared/contracts';
import { BrewFacadeService } from '../services/brew-facade.service';
import { SettingsStore } from './settings.store';

interface AppUpdateStoreState {
  state: AppUpdateState | null;
  initialized: boolean;
}

const initialState: AppUpdateStoreState = {
  state: null,
  initialized: false
};

export const AppUpdateStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store, settingsStore = inject(SettingsStore)) => ({
    currentVersion: computed(() => store.state()?.currentVersion ?? ''),
    checking: computed(() => store.state()?.status === 'checking'),
    isDownloading: computed(() => store.state()?.status === 'downloading'),
    canRestart: computed(() => store.state()?.status === 'ready'),
    canCheck: computed(() => store.state()?.status !== 'disabled'),
    showUpdateBadge: computed(() => store.state()?.status === 'ready'),
    sidebarFooterLabel: computed(() =>
      store.state()?.status === 'downloading' ? 'Downloading…' : ''
    ),
    sidebarVersionLabel: computed(() => {
      const version = store.state()?.currentVersion ?? '';
      const channel = settingsStore.settings().appReleaseChannel;
      if (!version) {
        return '';
      }
      return `v${version} · ${channel}`;
    }),
    hintText: computed(() => {
      const updateState = store.state();
      if (!updateState) {
        return '';
      }

      switch (updateState.status) {
        case 'disabled':
          return 'Updates are available in packaged releases';
        case 'checking':
          return 'Checking for updates…';
        case 'downloading':
          return updateState.availableVersion
            ? `Version ${updateState.availableVersion} is downloading…`
            : 'Downloading update…';
        case 'ready':
          return updateState.availableVersion
            ? `Version ${updateState.availableVersion} is ready — restart to install`
            : 'Update is ready — restart to install';
        case 'upToDate':
          return "You're on the latest version";
        case 'error':
          return updateState.error ?? 'Update check failed';
        default:
          return '';
      }
    }),
    hintAccent: computed(() => {
      const status = store.state()?.status;
      return status === 'ready' || status === 'downloading';
    })
  })),
  withMethods((store, facade = inject(BrewFacadeService)) => {
    let unsubscribe: (() => void) | null = null;

    return {
      async initialize(): Promise<void> {
        if (store.initialized()) {
          return;
        }

        const updateState = await facade.getUpdateState();

        patchState(store, {
          state: updateState,
          initialized: true
        });

        unsubscribe?.();
        unsubscribe = facade.onUpdateStateChanged((next) => {
          patchState(store, { state: next });
        });
      },

      async checkForUpdates(): Promise<void> {
        await facade.checkForAppUpdate();
      },

      async quitAndInstall(): Promise<void> {
        await facade.quitAndInstallUpdate();
      }
    };
  })
);
