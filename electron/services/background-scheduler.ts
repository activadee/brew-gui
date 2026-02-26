import type { AppSettings, CheckNowResult } from '../../src/shared/contracts';
import type { JobEventSink } from './homebrew-service';
import { log } from '../utils/logger';

const METADATA_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export type UpdateCheckTrigger = 'manual' | 'scheduled' | 'startup';

interface BackgroundSchedulerHomebrew {
  checkNow: () => Promise<CheckNowResult>;
  syncMetadata: (sink: JobEventSink) => Promise<{ syncedAt: string }>;
  runCleanup: (sink: JobEventSink) => Promise<{ timestamp: string }>;
}

interface BackgroundSchedulerSettingsStore {
  setLastCheck: (count: number, checkedAt: string) => void;
  getLastMetadataSyncAt: () => string | null;
  setLastMetadataSyncAt: (syncedAt: string) => void;
  getLastCleanupAt: () => string | null;
  setLastCleanupAt: (cleanedAt: string) => void;
}

interface BackgroundSchedulerOptions {
  homebrew: BackgroundSchedulerHomebrew;
  settingsStore: BackgroundSchedulerSettingsStore;
  jobSink: JobEventSink;
  onUpdateCheckResult: (result: CheckNowResult, trigger: UpdateCheckTrigger) => void;
}

export class BackgroundScheduler {
  private settings: AppSettings | null = null;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  private readonly homebrew: BackgroundSchedulerHomebrew;
  private readonly settingsStore: BackgroundSchedulerSettingsStore;
  private readonly jobSink: JobEventSink;
  private readonly onUpdateCheckResult: (result: CheckNowResult, trigger: UpdateCheckTrigger) => void;

  constructor(options: BackgroundSchedulerOptions) {
    this.homebrew = options.homebrew;
    this.settingsStore = options.settingsStore;
    this.jobSink = options.jobSink;
    this.onUpdateCheckResult = options.onUpdateCheckResult;
  }

  start(settings: AppSettings): void {
    this.settings = settings;
    this.refreshInterval();
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  onSettingsChanged(settings: AppSettings): void {
    this.settings = settings;
    this.refreshInterval();
  }

  async runStartupCatchup(): Promise<void> {
    if (!this.settings || this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      if (this.settings.autoCheckOnLaunch) {
        await this.performUpdateCheck('startup', true);
      }

      await this.runDueMaintenanceJobs();
    } finally {
      this.isRunning = false;
    }
  }

  async runManualUpdateCheck(): Promise<CheckNowResult> {
    const result = await this.performUpdateCheck('manual', false);
    if (!result) {
      throw new Error('Manual update check did not return a result.');
    }
    return result;
  }

  async runManualMetadataSync(): Promise<{ syncedAt: string }> {
    const result = await this.homebrew.syncMetadata(this.jobSink);
    this.settingsStore.setLastMetadataSyncAt(result.syncedAt);
    return result;
  }

  async runManualCleanup(): Promise<{ timestamp: string }> {
    const result = await this.homebrew.runCleanup(this.jobSink);
    this.settingsStore.setLastCleanupAt(result.timestamp);
    return result;
  }

  private refreshInterval(): void {
    this.stop();

    if (!this.settings) {
      return;
    }

    this.intervalHandle = setInterval(() => {
      void this.runScheduledCycle();
    }, this.settings.checkIntervalMinutes * 60 * 1000);
  }

  private async runScheduledCycle(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      await this.performUpdateCheck('scheduled', true);
      await this.runDueMaintenanceJobs();
    } finally {
      this.isRunning = false;
    }
  }

  private async performUpdateCheck(
    trigger: UpdateCheckTrigger,
    suppressErrors: boolean
  ): Promise<CheckNowResult | null> {
    try {
      const result = await this.homebrew.checkNow();
      this.settingsStore.setLastCheck(result.count, result.checkedAt);
      this.onUpdateCheckResult(result, trigger);
      return result;
    } catch (error) {
      log.warn(`Update check failed (${trigger})`, error);
      if (suppressErrors) {
        return null;
      }
      throw error;
    }
  }

  private async runDueMaintenanceJobs(): Promise<void> {
    if (!this.settings) {
      return;
    }

    const now = Date.now();

    if (
      this.settings.scheduledMetadataSyncEnabled
      && isTimestampDue(this.settingsStore.getLastMetadataSyncAt(), METADATA_SYNC_INTERVAL_MS, now)
    ) {
      try {
        const result = await this.homebrew.syncMetadata(this.jobSink);
        this.settingsStore.setLastMetadataSyncAt(result.syncedAt);
      } catch (error) {
        log.warn('Scheduled metadata sync failed', error);
      }
    }

    if (
      this.settings.scheduledCleanupEnabled
      && isTimestampDue(this.settingsStore.getLastCleanupAt(), CLEANUP_INTERVAL_MS, now)
    ) {
      try {
        const result = await this.homebrew.runCleanup(this.jobSink);
        this.settingsStore.setLastCleanupAt(result.timestamp);
      } catch (error) {
        log.warn('Scheduled cleanup failed', error);
      }
    }
  }
}

function isTimestampDue(timestamp: string | null, intervalMs: number, nowMs: number): boolean {
  if (!timestamp) {
    return true;
  }

  const parsedMs = new Date(timestamp).getTime();
  if (!Number.isFinite(parsedMs)) {
    return true;
  }

  return nowMs - parsedMs >= intervalMs;
}
