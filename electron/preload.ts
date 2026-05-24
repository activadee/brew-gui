import { contextBridge, ipcRenderer } from 'electron';

import {
  actionTemplateSchema,
  appSettingsSchema,
  appSettingsUpdateSchema,
  appUpdateStateSchema,
  batchJobResultSchema,
  batchManyRequestSchema,
  historyListRequestSchema,
  historyListResponseSchema,
  historyStatsSchema,
  recoveredJobSchema,
  templatesDeleteRequestSchema,
  templatesRunRequestSchema,
  templatesSaveRequestSchema,
  uninstallImpactRequestSchema,
  uninstallImpactResponseSchema,
  brewAvailabilitySchema,
  brewDoctorResultSchema,
  brewJobCompleteEventSchema,
  brewJobFailedEventSchema,
  brewJobProgressEventSchema,
  checkNowResultSchema,
  cleanupPreviewResultSchema,
  getServicesResponseSchema,
  installOneRequestSchema,
  getTapsResponseSchema,
  packageDetailsRequestSchema,
  packageDetailsSchema,
  pinOneRequestSchema,
  reinstallOneRequestSchema,
  serviceRequestSchema,
  tapAddRequestSchema,
  tapRemoveRequestSchema,
  unpinOneRequestSchema,
  uninstallOneRequestSchema,
  installedPackageSchema,
  outdatedPackageSchema,
  searchCatalogRequestSchema,
  searchCatalogResponseSchema,
  smartUpgradePlanSchema,
  smartUpgradeRunRequestSchema,
  syncMetadataResultSchema,
  updatesChangedEventSchema,
  upgradeOneRequestSchema,
  windowChromeChangedEventSchema,
  windowChromeStateSchema,
  windowControlActionSchema,
  type BrewGuiBridge
} from '../src/shared/contracts';
import { IPC_CHANNELS } from './ipc-channels';

const api: BrewGuiBridge = {
  async openMainWindow() {
    await ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_MAIN);
  },

  async windowControl(action) {
    const parsedAction = windowControlActionSchema.parse(action);
    await ipcRenderer.invoke(IPC_CHANNELS.APP_WINDOW_CONTROL, parsedAction);
  },

  async getWindowChromeState() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.APP_GET_WINDOW_CHROME);
    return windowChromeStateSchema.parse(payload);
  },

  async getUpdateState() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.APP_GET_UPDATE_STATE);
    return appUpdateStateSchema.parse(payload);
  },

  async checkForAppUpdate() {
    await ipcRenderer.invoke(IPC_CHANNELS.APP_CHECK_FOR_APP_UPDATE);
  },

  async quitAndInstallUpdate() {
    await ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT_AND_INSTALL_UPDATE);
  },

  async getBrewAvailability() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.GET_BREW_AVAILABILITY);
    return brewAvailabilitySchema.parse(payload);
  },

  async getInstalled() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.GET_INSTALLED);
    return installedPackageSchema.array().parse(payload);
  },

  async getOutdated() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.GET_OUTDATED);
    return outdatedPackageSchema.array().parse(payload);
  },

  async getTaps() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.GET_TAPS);
    return getTapsResponseSchema.parse(payload);
  },

  async getServices() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.GET_SERVICES);
    return getServicesResponseSchema.parse(payload);
  },

  async getCleanupPreview() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_PREVIEW);
    return cleanupPreviewResultSchema.parse(payload);
  },

  async runDoctor() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_RUN);
    return brewDoctorResultSchema.parse(payload);
  },

  async getPackageDetails(request) {
    const parsedRequest = packageDetailsRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.GET_PACKAGE_DETAILS, parsedRequest);
    return packageDetailsSchema.parse(payload);
  },

  async searchCatalog(request) {
    const parsedRequest = searchCatalogRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.SEARCH_CATALOG, parsedRequest);
    return searchCatalogResponseSchema.parse(payload);
  },

  async installOne(request) {
    const parsedRequest = installOneRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.INSTALL_ONE, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async reinstallOne(request) {
    const parsedRequest = reinstallOneRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.REINSTALL_ONE, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async uninstallOne(request) {
    const parsedRequest = uninstallOneRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.UNINSTALL_ONE, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async pinOne(request) {
    const parsedRequest = pinOneRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.PIN_ONE, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async unpinOne(request) {
    const parsedRequest = unpinOneRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.UNPIN_ONE, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async tapAdd(request) {
    const parsedRequest = tapAddRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.TAP_ADD, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async tapRemove(request) {
    const parsedRequest = tapRemoveRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.TAP_REMOVE, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async serviceStart(request) {
    const parsedRequest = serviceRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.SERVICE_START, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async serviceStop(request) {
    const parsedRequest = serviceRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.SERVICE_STOP, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async serviceRestart(request) {
    const parsedRequest = serviceRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.SERVICE_RESTART, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async runCleanup() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.CLEANUP_RUN);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async upgradeOne(request) {
    const parsedRequest = upgradeOneRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.UPGRADE_ONE, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async upgradeAll() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.UPGRADE_ALL);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async getSmartUpgradePlan() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.GET_SMART_UPGRADE_PLAN);
    return smartUpgradePlanSchema.parse(payload);
  },

  async upgradeSmart(request) {
    const parsedRequest = smartUpgradeRunRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.UPGRADE_SMART, parsedRequest);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async checkNow() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.CHECK_NOW);
    return checkNowResultSchema.parse(payload);
  },

  async syncMetadata() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.SYNC_METADATA);
    return syncMetadataResultSchema.parse(payload);
  },

  async getUninstallImpact(request) {
    const parsed = uninstallImpactRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.GET_UNINSTALL_IMPACT, parsed);
    return uninstallImpactResponseSchema.parse(payload);
  },

  async upgradeMany(request) {
    const parsed = batchManyRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.UPGRADE_MANY, parsed);
    return batchJobResultSchema.parse(payload);
  },

  async uninstallMany(request) {
    const parsed = batchManyRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.UNINSTALL_MANY, parsed);
    return batchJobResultSchema.parse(payload);
  },

  async pinMany(request) {
    const parsed = batchManyRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.PIN_MANY, parsed);
    return batchJobResultSchema.parse(payload);
  },

  async listTemplates() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_LIST);
    return actionTemplateSchema.array().parse(payload);
  },

  async saveTemplate(request) {
    const parsed = templatesSaveRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_SAVE, parsed);
    return actionTemplateSchema.parse(payload);
  },

  async deleteTemplate(request) {
    const parsed = templatesDeleteRequestSchema.parse(request);
    await ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_DELETE, parsed);
  },

  async runTemplate(request) {
    const parsed = templatesRunRequestSchema.parse(request);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_RUN, parsed);
    return brewJobCompleteEventSchema.parse(payload);
  },

  async listHistory(request) {
    const parsed = historyListRequestSchema.parse(request ?? {});
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.HISTORY_LIST, parsed);
    return historyListResponseSchema.parse(payload);
  },

  async getHistoryStats() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.HISTORY_STATS);
    return historyStatsSchema.parse(payload);
  },

  async recoverJobs() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.JOBS_RECOVER);
    return recoveredJobSchema.array().parse(payload);
  },

  async getSettings() {
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS);
    return appSettingsSchema.parse(payload);
  },

  async updateSettings(update) {
    const parsedUpdate = appSettingsUpdateSchema.parse(update);
    const payload = await ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SETTINGS, parsedUpdate);
    return appSettingsSchema.parse(payload);
  },

  onUpdatesChanged(handler) {
    const listener = (_event: unknown, payload: unknown) => {
      handler(updatesChangedEventSchema.parse(payload));
    };

    ipcRenderer.on(IPC_CHANNELS.EVENTS_UPDATES_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENTS_UPDATES_CHANGED, listener);
  },

  onWindowChromeChanged(handler) {
    const listener = (_event: unknown, payload: unknown) => {
      handler(windowChromeChangedEventSchema.parse(payload));
    };

    ipcRenderer.on(IPC_CHANNELS.EVENTS_WINDOW_CHROME_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENTS_WINDOW_CHROME_CHANGED, listener);
  },

  onJobProgress(handler) {
    const listener = (_event: unknown, payload: unknown) => {
      handler(brewJobProgressEventSchema.parse(payload));
    };

    ipcRenderer.on(IPC_CHANNELS.EVENTS_JOB_PROGRESS, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENTS_JOB_PROGRESS, listener);
  },

  onJobComplete(handler) {
    const listener = (_event: unknown, payload: unknown) => {
      handler(brewJobCompleteEventSchema.parse(payload));
    };

    ipcRenderer.on(IPC_CHANNELS.EVENTS_JOB_COMPLETE, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENTS_JOB_COMPLETE, listener);
  },

  onJobFailed(handler) {
    const listener = (_event: unknown, payload: unknown) => {
      handler(brewJobFailedEventSchema.parse(payload));
    };

    ipcRenderer.on(IPC_CHANNELS.EVENTS_JOB_FAILED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENTS_JOB_FAILED, listener);
  },

  onUpdateStateChanged(handler) {
    const listener = (_event: unknown, payload: unknown) => {
      handler(appUpdateStateSchema.parse(payload));
    };

    ipcRenderer.on(IPC_CHANNELS.EVENTS_UPDATE_STATE_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC_CHANNELS.EVENTS_UPDATE_STATE_CHANGED, listener);
  }
};

contextBridge.exposeInMainWorld('brewGui', api);
