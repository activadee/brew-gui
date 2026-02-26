import { BrowserWindow, ipcMain } from 'electron';

import {
  installOneRequestSchema,
  packageDetailsRequestSchema,
  pinOneRequestSchema,
  reinstallOneRequestSchema,
  serviceRequestSchema,
  tapAddRequestSchema,
  tapRemoveRequestSchema,
  unpinOneRequestSchema,
  uninstallOneRequestSchema,
  appSettingsUpdateSchema,
  brewDoctorResultSchema,
  checkNowResultSchema,
  cleanupPreviewResultSchema,
  searchCatalogRequestSchema,
  smartUpgradePlanSchema,
  smartUpgradeRunRequestSchema,
  syncMetadataResultSchema,
  upgradeOneRequestSchema,
  windowChromeStateSchema,
  windowControlActionSchema,
  type AppSettings,
  type BrewJobCompleteEvent,
  type BrewJobFailedEvent,
  type BrewJobProgressEvent,
  type CheckNowResult,
  type SyncMetadataResult,
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
  onSettingsChanged: (settings: AppSettings) => void;
  runManualUpdateCheck: () => Promise<CheckNowResult>;
  runManualMetadataSync: () => Promise<SyncMetadataResult>;
  runManualCleanup: () => Promise<BrewJobCompleteEvent>;
  onOpenMainWindow: () => void;
  onWindowControl: (action: WindowControlAction) => void;
  getWindowChromeState: () => WindowChromeState;
}

export function registerIpcHandlers(options: RegisterIpcOptions): void {
  const {
    homebrew,
    settingsStore,
    onSettingsChanged,
    runManualUpdateCheck,
    runManualMetadataSync,
    runManualCleanup,
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
  ipcMain.handle(IPC_CHANNELS.GET_TAPS, async () => homebrew.getTaps());
  ipcMain.handle(IPC_CHANNELS.GET_SERVICES, async () => homebrew.getServices());
  ipcMain.handle(IPC_CHANNELS.CLEANUP_PREVIEW, async () =>
    cleanupPreviewResultSchema.parse(await homebrew.getCleanupPreview())
  );
  ipcMain.handle(IPC_CHANNELS.DOCTOR_RUN, async () =>
    brewDoctorResultSchema.parse(
      await homebrew.runDoctor({
        onProgress: emitJobProgress,
        onComplete: emitJobComplete,
        onFailed: emitJobFailed
      })
    )
  );
  ipcMain.handle(IPC_CHANNELS.GET_PACKAGE_DETAILS, async (_event, payload) => {
    const parsed = packageDetailsRequestSchema.parse(payload);
    return homebrew.getPackageDetails(parsed);
  });

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

  ipcMain.handle(IPC_CHANNELS.REINSTALL_ONE, async (_event, payload) => {
    const parsed = reinstallOneRequestSchema.parse(payload);

    return homebrew.reinstallOne(parsed, {
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

  ipcMain.handle(IPC_CHANNELS.PIN_ONE, async (_event, payload) => {
    const parsed = pinOneRequestSchema.parse(payload);

    return homebrew.pinOne(parsed, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.UNPIN_ONE, async (_event, payload) => {
    const parsed = unpinOneRequestSchema.parse(payload);

    return homebrew.unpinOne(parsed, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.TAP_ADD, async (_event, payload) => {
    const parsed = tapAddRequestSchema.parse(payload);

    return homebrew.tapAdd(parsed, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.TAP_REMOVE, async (_event, payload) => {
    const parsed = tapRemoveRequestSchema.parse(payload);

    return homebrew.tapRemove(parsed, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.SERVICE_START, async (_event, payload) => {
    const parsed = serviceRequestSchema.parse(payload);

    return homebrew.serviceStart(parsed, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.SERVICE_STOP, async (_event, payload) => {
    const parsed = serviceRequestSchema.parse(payload);

    return homebrew.serviceStop(parsed, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.SERVICE_RESTART, async (_event, payload) => {
    const parsed = serviceRequestSchema.parse(payload);

    return homebrew.serviceRestart(parsed, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.CLEANUP_RUN, async () => runManualCleanup());

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

  ipcMain.handle(IPC_CHANNELS.GET_SMART_UPGRADE_PLAN, async () => {
    const blockedPackages = settingsStore.getSettings().smartUpgradeBlockedPackages;
    return smartUpgradePlanSchema.parse(
      await homebrew.getSmartUpgradePlan(blockedPackages)
    );
  });

  ipcMain.handle(IPC_CHANNELS.UPGRADE_SMART, async (_event, payload) => {
    const parsed = smartUpgradeRunRequestSchema.parse(payload);
    const blockedPackages = settingsStore.getSettings().smartUpgradeBlockedPackages;

    return homebrew.upgradeSmart(parsed, blockedPackages, {
      onProgress: emitJobProgress,
      onComplete: emitJobComplete,
      onFailed: emitJobFailed
    });
  });

  ipcMain.handle(IPC_CHANNELS.CHECK_NOW, async (): Promise<CheckNowResult> => {
    return checkNowResultSchema.parse(await runManualUpdateCheck());
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_METADATA, async () =>
    syncMetadataResultSchema.parse(await runManualMetadataSync())
  );

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => settingsStore.getSettings());

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, (_event, payload) => {
    const parsedUpdate = appSettingsUpdateSchema.parse(payload);
    const settings = settingsStore.updateSettings(parsedUpdate);
    onSettingsChanged(settings);
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
