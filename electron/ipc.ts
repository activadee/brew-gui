import { BrowserWindow, ipcMain } from 'electron';

import {
  installOneRequestSchema,
  uninstallOneRequestSchema,
  appSettingsUpdateSchema,
  checkNowResultSchema,
  searchCatalogRequestSchema,
  syncMetadataResultSchema,
  upgradeOneRequestSchema,
  windowChromeStateSchema,
  windowControlActionSchema,
  type AppSettings,
  type BrewJobCompleteEvent,
  type BrewJobFailedEvent,
  type BrewJobProgressEvent,
  type CheckNowResult,
  type UpdatesChangedEvent,
  type WindowControlAction,
  type WindowChromeState
} from '../src/shared/contracts';
import { IPC_CHANNELS } from './ipc-channels';
import { HomebrewService } from './services/homebrew-service';
import { SettingsStore } from './services/settings-store';
import { log } from './utils/logger';

interface RegisterIpcOptions {
  homebrew: HomebrewService;
  settingsStore: SettingsStore;
  emitUpdatesChanged: (payload: UpdatesChangedEvent) => void;
  onIntervalChanged: (settings: AppSettings) => void;
  onOpenMainWindow: () => void;
  onWindowControl: (action: WindowControlAction) => void;
  getWindowChromeState: () => WindowChromeState;
}

export function registerIpcHandlers(options: RegisterIpcOptions): void {
  const {
    homebrew,
    settingsStore,
    emitUpdatesChanged,
    onIntervalChanged,
    onOpenMainWindow,
    onWindowControl,
    getWindowChromeState
  } = options;

  const emitJobProgress = (event: BrewJobProgressEvent): void => {
    emitRendererEvent(IPC_CHANNELS.EVENTS_JOB_PROGRESS, event);
  };

  const emitJobComplete = (event: BrewJobCompleteEvent): void => {
    emitRendererEvent(IPC_CHANNELS.EVENTS_JOB_COMPLETE, event);
  };

  const emitJobFailed = (event: BrewJobFailedEvent): void => {
    emitRendererEvent(IPC_CHANNELS.EVENTS_JOB_FAILED, event);
  };

  ipcMain.handle(IPC_CHANNELS.APP_OPEN_MAIN, async () => {
    onOpenMainWindow();
  });
  ipcMain.handle(IPC_CHANNELS.APP_WINDOW_CONTROL, async (_event, payload) => {
    const action = windowControlActionSchema.parse(payload);
    onWindowControl(action);
  });
  ipcMain.handle(IPC_CHANNELS.APP_GET_WINDOW_CHROME, () =>
    windowChromeStateSchema.parse(getWindowChromeState())
  );

  ipcMain.handle(IPC_CHANNELS.GET_BREW_AVAILABILITY, async () => homebrew.getBrewAvailability());
  ipcMain.handle(IPC_CHANNELS.GET_INSTALLED, async () => homebrew.getInstalled());
  ipcMain.handle(IPC_CHANNELS.GET_OUTDATED, async () => homebrew.getOutdated());

  ipcMain.handle(IPC_CHANNELS.SEARCH_CATALOG, async (_event, payload) => {
    const parsed = searchCatalogRequestSchema.parse(payload);
    return homebrew.searchCatalog(parsed);
  });

  ipcMain.handle(IPC_CHANNELS.INSTALL_ONE, async (_event, payload) => {
    const parsed = installOneRequestSchema.parse(payload);

    return homebrew.installOne(parsed, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.UNINSTALL_ONE, async (_event, payload) => {
    const parsed = uninstallOneRequestSchema.parse(payload);

    return homebrew.uninstallOne(parsed, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.UPGRADE_ONE, async (_event, payload) => {
    const parsed = upgradeOneRequestSchema.parse(payload);

    return homebrew.upgradeOne(parsed, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.UPGRADE_ALL, async () =>
    homebrew.upgradeAll({
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    })
  );

  ipcMain.handle(IPC_CHANNELS.CHECK_NOW, async (): Promise<CheckNowResult> => {
    const result = checkNowResultSchema.parse(await homebrew.checkNow());
    settingsStore.setLastCheck(result.count, result.checkedAt);
    emitUpdatesChanged({ count: result.count, checkedAt: result.checkedAt });
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_METADATA, async () => {
    const result = syncMetadataResultSchema.parse(await homebrew.syncMetadata());
    return result;
  });

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => settingsStore.getSettings());

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, (_event, payload) => {
    const parsedUpdate = appSettingsUpdateSchema.parse(payload);
    const settings = settingsStore.updateSettings(parsedUpdate);
    onIntervalChanged(settings);
    return settings;
  });

  log.info('IPC handlers registered');
}

export function clearIpcHandlers(): void {
  Object.values(IPC_CHANNELS).forEach((channel) => {
    ipcMain.removeHandler(channel);
  });
}

function emitRendererEvent(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  }
}
