import { Injectable } from '@angular/core';

import {
  DEFAULT_SETTINGS,
  type AppSettings,
  type AppSettingsUpdate,
  type BrewGuiBridge,
  type BrewJobCompleteEvent,
  type BrewJobFailedEvent,
  type BrewJobProgressEvent,
  type CheckNowResult,
  type InstallOneRequest,
  type SearchCatalogRequest,
  type SearchCatalogResponse,
  type UpdatesChangedEvent,
  type UpgradeOneRequest
} from '../../../shared/contracts';

const createFallbackBridge = (): BrewGuiBridge => ({
  async openMainWindow() {
    return undefined;
  },
  async getBrewAvailability() {
    return {
      available: false,
      path: null,
      version: null,
      checkedAt: new Date().toISOString()
    };
  },
  async getInstalled() {
    return [];
  },
  async getOutdated() {
    return [];
  },
  async searchCatalog(request: SearchCatalogRequest): Promise<SearchCatalogResponse> {
    return {
      items: [],
      total: 0,
      page: request.page,
      pageSize: request.pageSize,
      stale: true,
      source: 'cache',
      lastUpdatedAt: null
    };
  },
  async installOne(_request: InstallOneRequest): Promise<BrewJobCompleteEvent> {
    return {
      jobId: crypto.randomUUID(),
      success: false,
      output: 'Electron bridge unavailable',
      timestamp: new Date().toISOString()
    };
  },
  async upgradeOne(_request: UpgradeOneRequest): Promise<BrewJobCompleteEvent> {
    return {
      jobId: crypto.randomUUID(),
      success: false,
      output: 'Electron bridge unavailable',
      timestamp: new Date().toISOString()
    };
  },
  async upgradeAll(): Promise<BrewJobCompleteEvent> {
    return {
      jobId: crypto.randomUUID(),
      success: false,
      output: 'Electron bridge unavailable',
      timestamp: new Date().toISOString()
    };
  },
  async checkNow(): Promise<CheckNowResult> {
    return {
      count: 0,
      checkedAt: new Date().toISOString()
    };
  },
  async syncMetadata() {
    return {
      success: false,
      output: 'Electron bridge unavailable',
      syncedAt: new Date().toISOString()
    };
  },
  async getSettings() {
    return DEFAULT_SETTINGS;
  },
  async updateSettings(update: AppSettingsUpdate): Promise<AppSettings> {
    return { ...DEFAULT_SETTINGS, ...update };
  },
  onUpdatesChanged(_handler: (event: UpdatesChangedEvent) => void) {
    return () => undefined;
  },
  onJobProgress(_handler: (event: BrewJobProgressEvent) => void) {
    return () => undefined;
  },
  onJobComplete(_handler: (event: BrewJobCompleteEvent) => void) {
    return () => undefined;
  },
  onJobFailed(_handler: (event: BrewJobFailedEvent) => void) {
    return () => undefined;
  }
});

@Injectable({ providedIn: 'root' })
export class BrewBridgeService {
  readonly isElectron = typeof window !== 'undefined' && Boolean(window.brewGui);

  private readonly bridge: BrewGuiBridge =
    typeof window !== 'undefined' && window.brewGui ? window.brewGui : createFallbackBridge();

  get api(): BrewGuiBridge {
    return this.bridge;
  }
}
