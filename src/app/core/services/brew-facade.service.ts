import { Injectable, inject } from '@angular/core';

import type {
  ActionTemplate,
  AppUpdateState,
  AppSettings,
  AppSettingsUpdate,
  BatchJobResult,
  BatchManyRequest,
  HistoryListRequest,
  HistoryListResponse,
  HistoryStats,
  RecoveredJob,
  TemplatesDeleteRequest,
  TemplatesRunRequest,
  TemplatesSaveRequest,
  UninstallImpactRequest,
  UninstallImpactResponse,
  BrewAvailability,
  BrewDoctorResult,
  BrewJobCompleteEvent,
  BrewJobFailedEvent,
  BrewJobProgressEvent,
  BrewService,
  BrewTap,
  CleanupPreviewResult,
  CheckNowResult,
  InstallOneRequest,
  InstalledPackage,
  OutdatedPackage,
  PackageDetails,
  PackageDetailsRequest,
  PinOneRequest,
  ReinstallOneRequest,
  ServiceRequest,
  SearchCatalogRequest,
  SearchCatalogResponse,
  SmartUpgradePlan,
  SmartUpgradeRunRequest,
  SyncMetadataResult,
  TapAddRequest,
  TapRemoveRequest,
  UnpinOneRequest,
  UninstallOneRequest,
  UpdatesChangedEvent,
  UpgradeOneRequest,
  WindowChromeChangedEvent,
  WindowChromeState,
  WindowControlAction
} from '../../../shared/contracts';
import { BrewBridgeService } from './brew-bridge.service';

@Injectable({ providedIn: 'root' })
export class BrewFacadeService {
  private readonly bridge = inject(BrewBridgeService);

  readonly isElectron = this.bridge.isElectron;

  openMainWindow(): Promise<void> {
    return this.bridge.api.openMainWindow();
  }

  windowControl(action: WindowControlAction): Promise<void> {
    return this.bridge.api.windowControl(action);
  }

  getWindowChromeState(): Promise<WindowChromeState> {
    return this.bridge.api.getWindowChromeState();
  }

  getUpdateState(): Promise<AppUpdateState> {
    return this.bridge.api.getUpdateState();
  }

  checkForAppUpdate(): Promise<void> {
    return this.bridge.api.checkForAppUpdate();
  }

  getAvailability(): Promise<BrewAvailability> {
    return this.bridge.api.getBrewAvailability();
  }

  getInstalled(): Promise<InstalledPackage[]> {
    return this.bridge.api.getInstalled();
  }

  getOutdated(): Promise<OutdatedPackage[]> {
    return this.bridge.api.getOutdated();
  }

  getTaps(): Promise<BrewTap[]> {
    return this.bridge.api.getTaps();
  }

  getServices(): Promise<BrewService[]> {
    return this.bridge.api.getServices();
  }

  getCleanupPreview(): Promise<CleanupPreviewResult> {
    return this.bridge.api.getCleanupPreview();
  }

  runDoctor(): Promise<BrewDoctorResult> {
    return this.bridge.api.runDoctor();
  }

  getPackageDetails(request: PackageDetailsRequest): Promise<PackageDetails> {
    return this.bridge.api.getPackageDetails(request);
  }

  searchCatalog(request: SearchCatalogRequest): Promise<SearchCatalogResponse> {
    return this.bridge.api.searchCatalog(request);
  }

  installOne(request: InstallOneRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.installOne(request);
  }

  reinstallOne(request: ReinstallOneRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.reinstallOne(request);
  }

  uninstallOne(request: UninstallOneRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.uninstallOne(request);
  }

  getUninstallImpact(request: UninstallImpactRequest): Promise<UninstallImpactResponse> {
    return this.bridge.api.getUninstallImpact(request);
  }

  upgradeMany(request: BatchManyRequest): Promise<BatchJobResult> {
    return this.bridge.api.upgradeMany(request);
  }

  uninstallMany(request: BatchManyRequest): Promise<BatchJobResult> {
    return this.bridge.api.uninstallMany(request);
  }

  pinMany(request: BatchManyRequest): Promise<BatchJobResult> {
    return this.bridge.api.pinMany(request);
  }

  listTemplates(): Promise<ActionTemplate[]> {
    return this.bridge.api.listTemplates();
  }

  saveTemplate(request: TemplatesSaveRequest): Promise<ActionTemplate> {
    return this.bridge.api.saveTemplate(request);
  }

  deleteTemplate(request: TemplatesDeleteRequest): Promise<void> {
    return this.bridge.api.deleteTemplate(request);
  }

  runTemplate(request: TemplatesRunRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.runTemplate(request);
  }

  listHistory(request: HistoryListRequest): Promise<HistoryListResponse> {
    return this.bridge.api.listHistory(request);
  }

  getHistoryStats(): Promise<HistoryStats> {
    return this.bridge.api.getHistoryStats();
  }

  recoverJobs(): Promise<RecoveredJob[]> {
    return this.bridge.api.recoverJobs();
  }

  pinOne(request: PinOneRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.pinOne(request);
  }

  unpinOne(request: UnpinOneRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.unpinOne(request);
  }

  tapAdd(request: TapAddRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.tapAdd(request);
  }

  tapRemove(request: TapRemoveRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.tapRemove(request);
  }

  serviceStart(request: ServiceRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.serviceStart(request);
  }

  serviceStop(request: ServiceRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.serviceStop(request);
  }

  serviceRestart(request: ServiceRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.serviceRestart(request);
  }

  runCleanup(): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.runCleanup();
  }

  upgradeOne(request: UpgradeOneRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.upgradeOne(request);
  }

  upgradeAll(): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.upgradeAll();
  }

  getSmartUpgradePlan(): Promise<SmartUpgradePlan> {
    return this.bridge.api.getSmartUpgradePlan();
  }

  upgradeSmart(request: SmartUpgradeRunRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.upgradeSmart(request);
  }

  checkNow(): Promise<CheckNowResult> {
    return this.bridge.api.checkNow();
  }

  syncMetadata(): Promise<SyncMetadataResult> {
    return this.bridge.api.syncMetadata();
  }

  getSettings(): Promise<AppSettings> {
    return this.bridge.api.getSettings();
  }

  updateSettings(update: AppSettingsUpdate): Promise<AppSettings> {
    return this.bridge.api.updateSettings(update);
  }

  onUpdatesChanged(handler: (event: UpdatesChangedEvent) => void): () => void {
    return this.bridge.api.onUpdatesChanged(handler);
  }

  onWindowChromeChanged(handler: (event: WindowChromeChangedEvent) => void): () => void {
    return this.bridge.api.onWindowChromeChanged(handler);
  }

  onJobProgress(handler: (event: BrewJobProgressEvent) => void): () => void {
    return this.bridge.api.onJobProgress(handler);
  }

  onJobComplete(handler: (event: BrewJobCompleteEvent) => void): () => void {
    return this.bridge.api.onJobComplete(handler);
  }

  onJobFailed(handler: (event: BrewJobFailedEvent) => void): () => void {
    return this.bridge.api.onJobFailed(handler);
  }

  onUpdateStateChanged(handler: (state: AppUpdateState) => void): () => void {
    return this.bridge.api.onUpdateStateChanged(handler);
  }

  quitAndInstallUpdate(): Promise<void> {
    return this.bridge.api.quitAndInstallUpdate();
  }
}
