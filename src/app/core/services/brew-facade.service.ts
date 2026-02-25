import { Injectable, inject } from '@angular/core';

import type {
  AppSettings,
  AppSettingsUpdate,
  BrewAvailability,
  BrewJobCompleteEvent,
  BrewJobFailedEvent,
  BrewJobProgressEvent,
  CheckNowResult,
  InstallOneRequest,
  InstalledPackage,
  OutdatedPackage,
  PinOneRequest,
  ReinstallOneRequest,
  SearchCatalogRequest,
  SearchCatalogResponse,
  SyncMetadataResult,
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

  getAvailability(): Promise<BrewAvailability> {
    return this.bridge.api.getBrewAvailability();
  }

  getInstalled(): Promise<InstalledPackage[]> {
    return this.bridge.api.getInstalled();
  }

  getOutdated(): Promise<OutdatedPackage[]> {
    return this.bridge.api.getOutdated();
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

  pinOne(request: PinOneRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.pinOne(request);
  }

  unpinOne(request: UnpinOneRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.unpinOne(request);
  }

  upgradeOne(request: UpgradeOneRequest): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.upgradeOne(request);
  }

  upgradeAll(): Promise<BrewJobCompleteEvent> {
    return this.bridge.api.upgradeAll();
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
}
