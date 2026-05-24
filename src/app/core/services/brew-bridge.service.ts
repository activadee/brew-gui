import { Injectable } from '@angular/core';

import packageJson from '../../../../package.json';

import {
  DEFAULT_WINDOW_CHROME_STATE,
  DEFAULT_SETTINGS,
  type AppSettings,
  type AppSettingsUpdate,
  type AppUpdateState,
  type BrewGuiBridge,
  type BrewDoctorResult,
  type BrewJobAction,
  type BrewJobCompleteEvent,
  type BrewJobFailedEvent,
  type BrewJobKind,
  type BrewJobProgressEvent,
  type BrewService,
  type BrewTap,
  type CleanupPreviewResult,
  type CheckNowResult,
  type InstallOneRequest,
  type PackageDetails,
  type PackageDetailsRequest,
  type PinOneRequest,
  type ReinstallOneRequest,
  type ServiceRequest,
  type SearchCatalogRequest,
  type SearchCatalogResponse,
  type SmartUpgradePlan,
  type SmartUpgradeRunRequest,
  type TapAddRequest,
  type TapRemoveRequest,
  type UnpinOneRequest,
  type UninstallOneRequest,
  type UpdatesChangedEvent,
  type UpgradeOneRequest,
  type WindowChromeChangedEvent,
  type WindowChromeState,
  type WindowControlAction
} from '../../../shared/contracts';

function createFallbackJobCompleteEvent(options: {
  action: BrewJobAction;
  command: string;
  kind: BrewJobKind;
  packageName: string | null;
}): BrewJobCompleteEvent {
  return {
    jobId: crypto.randomUUID(),
    action: options.action,
    command: options.command,
    kind: options.kind,
    packageName: options.packageName,
    success: false,
    exitCode: -1,
    durationMs: 0,
    output: 'Electron bridge unavailable',
    timestamp: new Date().toISOString()
  };
}

const createFallbackBridge = (): BrewGuiBridge => ({
  async openMainWindow() {
    return undefined;
  },
  async windowControl(_action: WindowControlAction) {
    return undefined;
  },
  async getWindowChromeState(): Promise<WindowChromeState> {
    return DEFAULT_WINDOW_CHROME_STATE;
  },
  async getUpdateState(): Promise<AppUpdateState> {
    return {
      status: 'disabled',
      currentVersion: packageJson.version
    };
  },
  async checkForAppUpdate(): Promise<void> {
    return undefined;
  },
  async quitAndInstallUpdate(): Promise<void> {
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
  async getTaps(): Promise<BrewTap[]> {
    return [];
  },
  async getServices(): Promise<BrewService[]> {
    return [];
  },
  async getCleanupPreview(): Promise<CleanupPreviewResult> {
    return {
      command: 'brew cleanup --dry-run',
      items: [],
      totalBytes: null,
      rawOutput: 'Electron bridge unavailable',
      generatedAt: new Date().toISOString()
    };
  },
  async runDoctor(): Promise<BrewDoctorResult> {
    return {
      command: 'brew doctor',
      exitCode: -1,
      findings: [],
      counts: {
        error: 0,
        warning: 0,
        info: 0
      },
      rawOutput: 'Electron bridge unavailable',
      generatedAt: new Date().toISOString()
    };
  },
  async getPackageDetails(_request: PackageDetailsRequest): Promise<PackageDetails> {
    return {
      id: 'formula:unknown',
      kind: 'formula',
      name: 'unknown',
      fullName: 'unknown',
      desc: null,
      homepage: null,
      tap: null,
      license: null,
      dependencies: [],
      caveats: null,
      versionSnapshot: {
        installedVersions: [],
        currentVersion: null,
        stableVersion: null,
        headVersion: null
      },
      deprecated: false,
      disabled: false,
      deprecationReason: null,
      disableReason: null,
      replacement: null,
      pinned: false,
      warnings: ['Electron bridge unavailable'],
      source: 'cache',
      fetchedAt: new Date().toISOString()
    };
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
    return createFallbackJobCompleteEvent({
      action: 'install',
      command: `brew install --${_request.kind} ${_request.name}`,
      kind: _request.kind,
      packageName: _request.name
    });
  },
  async reinstallOne(_request: ReinstallOneRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'reinstall',
      command: _request.kind === 'cask' && _request.zap
        ? `brew reinstall --cask --zap ${_request.name}`
        : `brew reinstall --${_request.kind} ${_request.name}`,
      kind: _request.kind,
      packageName: _request.name
    });
  },
  async uninstallOne(_request: UninstallOneRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'uninstall',
      command: _request.kind === 'cask' && _request.zap
        ? `brew uninstall --cask --zap ${_request.name}`
        : `brew uninstall --${_request.kind} ${_request.name}`,
      kind: _request.kind,
      packageName: _request.name
    });
  },
  async pinOne(_request: PinOneRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'pin',
      command: `brew pin ${_request.name}`,
      kind: 'formula',
      packageName: _request.name
    });
  },
  async unpinOne(_request: UnpinOneRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'unpin',
      command: `brew unpin ${_request.name}`,
      kind: 'formula',
      packageName: _request.name
    });
  },
  async tapAdd(_request: TapAddRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'tapAdd',
      command: `brew tap ${_request.name}`,
      kind: 'system',
      packageName: _request.name
    });
  },
  async tapRemove(_request: TapRemoveRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'tapRemove',
      command: `brew untap ${_request.name}`,
      kind: 'system',
      packageName: _request.name
    });
  },
  async serviceStart(_request: ServiceRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'serviceStart',
      command: `brew services start ${_request.name}`,
      kind: 'system',
      packageName: _request.name
    });
  },
  async serviceStop(_request: ServiceRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'serviceStop',
      command: `brew services stop ${_request.name}`,
      kind: 'system',
      packageName: _request.name
    });
  },
  async serviceRestart(_request: ServiceRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'serviceRestart',
      command: `brew services restart ${_request.name}`,
      kind: 'system',
      packageName: _request.name
    });
  },
  async runCleanup(): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'cleanup',
      command: 'brew cleanup',
      kind: 'system',
      packageName: null
    });
  },
  async upgradeOne(_request: UpgradeOneRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'upgradeOne',
      command: `brew upgrade --${_request.kind} ${_request.name}`,
      kind: _request.kind,
      packageName: _request.name
    });
  },
  async upgradeAll(): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'upgradeAll',
      command: 'brew upgrade --formula && brew upgrade --cask',
      kind: 'system',
      packageName: null
    });
  },
  async getSmartUpgradePlan(): Promise<SmartUpgradePlan> {
    return {
      generatedAt: new Date().toISOString(),
      low: [],
      medium: [],
      high: [],
      excludedPinned: [],
      excludedBlocked: [],
      totals: {
        outdated: 0,
        eligible: 0,
        low: 0,
        medium: 0,
        high: 0,
        excludedPinned: 0,
        excludedBlocked: 0
      }
    };
  },
  async upgradeSmart(request: SmartUpgradeRunRequest): Promise<BrewJobCompleteEvent> {
    return createFallbackJobCompleteEvent({
      action: 'upgradeSmart',
      command: `brew smart-upgrade --risks ${request.risks.join(',')}`,
      kind: 'system',
      packageName: null
    });
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
  async getUninstallImpact() {
    return { dependents: [], note: null };
  },
  async upgradeMany() {
    return { results: [], succeeded: 0, failed: 0 };
  },
  async uninstallMany() {
    return { results: [], succeeded: 0, failed: 0 };
  },
  async pinMany() {
    return { results: [], succeeded: 0, failed: 0 };
  },
  async listTemplates() {
    return [];
  },
  async saveTemplate(request) {
    return {
      id: request.id ?? crypto.randomUUID(),
      name: request.name,
      steps: request.steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  },
  async deleteTemplate() {
    return undefined;
  },
  async runTemplate(request) {
    return createFallbackJobCompleteEvent({
      action: 'install',
      command: `template ${request.templateId}`,
      kind: request.kind,
      packageName: request.name
    });
  },
  async listHistory() {
    return { items: [], total: 0, page: 1, pageSize: 50 };
  },
  async getHistoryStats() {
    return {
      totalJobs: 0,
      successRate: 1,
      medianDurationMs: 0,
      last7Days: { total: 0, succeeded: 0, failed: 0 },
      failureRateByAction: []
    };
  },
  async recoverJobs() {
    return [];
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
  onWindowChromeChanged(_handler: (event: WindowChromeChangedEvent) => void) {
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
  },
  onUpdateStateChanged() {
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
