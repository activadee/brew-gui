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
  appUpdateStateSchema,
  batchManyRequestSchema,
  brewDoctorResultSchema,
  checkNowResultSchema,
  cleanupPreviewResultSchema,
  historyListRequestSchema,
  historyListResponseSchema,
  historyStatsSchema,
  searchCatalogRequestSchema,
  smartUpgradePlanSchema,
  smartUpgradeRunRequestSchema,
  syncMetadataResultSchema,
  templatesDeleteRequestSchema,
  templatesRunRequestSchema,
  templatesSaveRequestSchema,
  uninstallImpactRequestSchema,
  uninstallImpactResponseSchema,
  upgradeOneRequestSchema,
  windowChromeStateSchema,
  windowControlActionSchema,
  type AppSettings,
  type BrewJobCompleteEvent,
  type BrewJobFailedEvent,
  type BrewJobProgressEvent,
  type CheckNowResult,
  type JobEventSink,
  type SyncMetadataResult,
  type WindowControlAction,
  type WindowChromeState
} from '../src/shared/contracts';
import { IPC_CHANNELS } from './ipc-channels';
import { checkForAppUpdate, getUpdateState, quitAndInstallUpdate } from './services/auto-update';
import { ActionTemplateRunner } from './services/action-template-runner';
import { ActionTemplatesStore } from './services/action-templates-store';
import { ActiveJobsStore } from './services/active-jobs-store';
import { HomebrewService } from './services/homebrew-service';
import { JobHistoryStore } from './services/job-history-store';
import { SettingsStore } from './services/settings-store';
import { TelemetryStore } from './services/telemetry-store';
import { log } from './utils/logger';

interface RegisterIpcOptions {
  homebrew: HomebrewService;
  settingsStore: SettingsStore;
  templatesStore: ActionTemplatesStore;
  templateRunner: ActionTemplateRunner;
  historyStore: JobHistoryStore;
  activeJobsStore: ActiveJobsStore;
  telemetryStore: TelemetryStore;
  jobSink: JobEventSink;
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
    templatesStore,
    templateRunner,
    historyStore,
    activeJobsStore,
    telemetryStore,
    jobSink,
    onSettingsChanged,
    runManualUpdateCheck,
    runManualMetadataSync,
    runManualCleanup,
    onOpenMainWindow,
    onWindowControl,
    getWindowChromeState
  } = options;

  const emitJobProgress = (event: BrewJobProgressEvent): void => {
    jobSink.onProgress(event);
  };

  const emitJobComplete = (event: BrewJobCompleteEvent): void => {
    jobSink.onComplete(event);
  };

  const emitJobFailed = (event: BrewJobFailedEvent): void => {
    jobSink.onFailed(event);
  };

  const brewJobSink: JobEventSink = {
    onProgress: emitJobProgress,
    onComplete: emitJobComplete,
    onFailed: emitJobFailed
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
  ipcMain.handle(IPC_CHANNELS.APP_GET_UPDATE_STATE, () =>
    appUpdateStateSchema.parse(getUpdateState())
  );
  ipcMain.handle(IPC_CHANNELS.APP_CHECK_FOR_APP_UPDATE, async () => {
    await checkForAppUpdate();
  });
  ipcMain.handle(IPC_CHANNELS.APP_QUIT_AND_INSTALL_UPDATE, async () => {
    await quitAndInstallUpdate();
  });

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
      await homebrew.runDoctor(    brewJobSink)
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

    return homebrew.installOne(parsed, brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.REINSTALL_ONE, async (_event, payload) => {
    const parsed = reinstallOneRequestSchema.parse(payload);

    return homebrew.reinstallOne(parsed,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.UNINSTALL_ONE, async (_event, payload) => {
    const parsed = uninstallOneRequestSchema.parse(payload);

    return homebrew.uninstallOne(parsed,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.PIN_ONE, async (_event, payload) => {
    const parsed = pinOneRequestSchema.parse(payload);

    return homebrew.pinOne(parsed,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.UNPIN_ONE, async (_event, payload) => {
    const parsed = unpinOneRequestSchema.parse(payload);

    return homebrew.unpinOne(parsed,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.TAP_ADD, async (_event, payload) => {
    const parsed = tapAddRequestSchema.parse(payload);

    return homebrew.tapAdd(parsed,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.TAP_REMOVE, async (_event, payload) => {
    const parsed = tapRemoveRequestSchema.parse(payload);

    return homebrew.tapRemove(parsed,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.SERVICE_START, async (_event, payload) => {
    const parsed = serviceRequestSchema.parse(payload);

    return homebrew.serviceStart(parsed,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.SERVICE_STOP, async (_event, payload) => {
    const parsed = serviceRequestSchema.parse(payload);

    return homebrew.serviceStop(parsed,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.SERVICE_RESTART, async (_event, payload) => {
    const parsed = serviceRequestSchema.parse(payload);

    return homebrew.serviceRestart(parsed,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.CLEANUP_RUN, async () => runManualCleanup());

  ipcMain.handle(IPC_CHANNELS.UPGRADE_ONE, async (_event, payload) => {
    const parsed = upgradeOneRequestSchema.parse(payload);

    return homebrew.upgradeOne(parsed,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.UPGRADE_ALL, async () =>
    homebrew.upgradeAll(    brewJobSink)
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

    return homebrew.upgradeSmart(parsed, blockedPackages,     brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.CHECK_NOW, async (): Promise<CheckNowResult> => {
    return checkNowResultSchema.parse(await runManualUpdateCheck());
  });

  ipcMain.handle(IPC_CHANNELS.SYNC_METADATA, async () =>
    syncMetadataResultSchema.parse(await runManualMetadataSync())
  );

  ipcMain.handle(IPC_CHANNELS.UPGRADE_MANY, async (_event, payload) => {
    const parsed = batchManyRequestSchema.parse(payload);
    return homebrew.upgradeMany(parsed, brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.UNINSTALL_MANY, async (_event, payload) => {
    const parsed = batchManyRequestSchema.parse(payload);
    return homebrew.uninstallMany(parsed, brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.PIN_MANY, async (_event, payload) => {
    const parsed = batchManyRequestSchema.parse(payload);
    return homebrew.pinMany(parsed, brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.GET_UNINSTALL_IMPACT, async (_event, payload) => {
    const parsed = uninstallImpactRequestSchema.parse(payload);
    return uninstallImpactResponseSchema.parse(await homebrew.getUninstallImpact(parsed));
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATES_LIST, () => templatesStore.list());

  ipcMain.handle(IPC_CHANNELS.TEMPLATES_SAVE, (_event, payload) => {
    const parsed = templatesSaveRequestSchema.parse(payload);
    return templatesStore.save(parsed);
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATES_DELETE, (_event, payload) => {
    const parsed = templatesDeleteRequestSchema.parse(payload);
    templatesStore.delete(parsed.id);
  });

  ipcMain.handle(IPC_CHANNELS.TEMPLATES_RUN, async (_event, payload) => {
    const parsed = templatesRunRequestSchema.parse(payload);
    return templateRunner.run(parsed, brewJobSink);
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_LIST, (_event, payload) => {
    const parsed = historyListRequestSchema.parse(payload ?? {});
    return historyListResponseSchema.parse(historyStore.list(parsed));
  });

  ipcMain.handle(IPC_CHANNELS.HISTORY_STATS, () => historyStatsSchema.parse(historyStore.getStats()));

  ipcMain.handle(IPC_CHANNELS.JOBS_RECOVER, () => activeJobsStore.listRecovered());

  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, () => settingsStore.getSettings());

  ipcMain.handle(IPC_CHANNELS.UPDATE_SETTINGS, (_event, payload) => {
    const parsedUpdate = appSettingsUpdateSchema.parse(payload);
    const settings = settingsStore.updateSettings(parsedUpdate);
    telemetryStore.setEnabled(settings.telemetryEnabled);
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
