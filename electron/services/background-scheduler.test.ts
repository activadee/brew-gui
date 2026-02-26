import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SETTINGS, type AppSettings, type CheckNowResult } from '../../src/shared/contracts';
import { BackgroundScheduler } from './background-scheduler';

describe('BackgroundScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-26T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs update checks on the configured interval cadence', async () => {
    const checkNow = vi.fn(async (): Promise<CheckNowResult> => ({
      count: 2,
      checkedAt: new Date().toISOString()
    }));
    const settingsStore = createSettingsStore();
    const scheduler = createScheduler({
      checkNow,
      settingsStore
    });

    scheduler.start({
      ...DEFAULT_SETTINGS,
      checkIntervalMinutes: 60
    });
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(checkNow).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it('runs due metadata sync daily and due cleanup weekly when enabled', async () => {
    const syncMetadata = vi.fn(async () => ({
      syncedAt: new Date().toISOString()
    }));
    const runCleanup = vi.fn(async () => ({
      timestamp: new Date().toISOString()
    }));
    const settingsStore = createSettingsStore({
      lastMetadataSyncAt: null,
      lastCleanupAt: null
    });
    const scheduler = createScheduler({
      syncMetadata,
      runCleanup,
      settingsStore
    });

    scheduler.start({
      ...DEFAULT_SETTINGS,
      checkIntervalMinutes: 60,
      scheduledMetadataSyncEnabled: true,
      scheduledCleanupEnabled: true
    });

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(syncMetadata).toHaveBeenCalledTimes(1);
    expect(runCleanup).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('skips overlapping scheduled cycles while one is still running', async () => {
    let resolveCheck: ((value: CheckNowResult) => void) | null = null;
    const checkNow = vi.fn(
      () =>
        new Promise<CheckNowResult>((resolve) => {
          resolveCheck = resolve;
        })
    );
    const scheduler = createScheduler({ checkNow });

    scheduler.start({
      ...DEFAULT_SETTINGS,
      checkIntervalMinutes: 60
    });
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(checkNow).toHaveBeenCalledTimes(1);

    resolveCheck?.({
      count: 0,
      checkedAt: new Date().toISOString()
    });
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(checkNow).toHaveBeenCalledTimes(2);
    scheduler.stop();
  });

  it('runs startup catch-up for overdue metadata and cleanup jobs and keeps auto-check behavior', async () => {
    const checkNow = vi.fn(async (): Promise<CheckNowResult> => ({
      count: 4,
      checkedAt: new Date().toISOString()
    }));
    const syncMetadata = vi.fn(async () => ({
      syncedAt: new Date().toISOString()
    }));
    const runCleanup = vi.fn(async () => ({
      timestamp: new Date().toISOString()
    }));
    const settingsStore = createSettingsStore({
      lastMetadataSyncAt: '2026-02-24T00:00:00.000Z',
      lastCleanupAt: '2026-02-15T00:00:00.000Z'
    });
    const scheduler = createScheduler({
      checkNow,
      syncMetadata,
      runCleanup,
      settingsStore
    });
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      autoCheckOnLaunch: true,
      scheduledMetadataSyncEnabled: true,
      scheduledCleanupEnabled: true
    };

    scheduler.start(settings);
    await scheduler.runStartupCatchup();

    expect(checkNow).toHaveBeenCalledTimes(1);
    expect(syncMetadata).toHaveBeenCalledTimes(1);
    expect(runCleanup).toHaveBeenCalledTimes(1);
    scheduler.stop();
  });

  it('does not run startup cleanup when scheduled cleanup is disabled', async () => {
    const runCleanup = vi.fn(async () => ({
      timestamp: new Date().toISOString()
    }));
    const scheduler = createScheduler({
      runCleanup,
      settingsStore: createSettingsStore({
        lastCleanupAt: null
      })
    });
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      autoCheckOnLaunch: false,
      scheduledMetadataSyncEnabled: false,
      scheduledCleanupEnabled: false
    };

    scheduler.start(settings);
    await scheduler.runStartupCatchup();

    expect(runCleanup).not.toHaveBeenCalled();
    scheduler.stop();
  });

  it('routes manual checks through manual trigger callbacks', async () => {
    const onUpdateCheckResult = vi.fn();
    const checkNow = vi.fn(async (): Promise<CheckNowResult> => ({
      count: 9,
      checkedAt: new Date().toISOString()
    }));
    const settingsStore = createSettingsStore();
    const scheduler = createScheduler({
      checkNow,
      onUpdateCheckResult,
      settingsStore
    });

    scheduler.start(DEFAULT_SETTINGS);
    await scheduler.runManualUpdateCheck();

    expect(checkNow).toHaveBeenCalledTimes(1);
    expect(settingsStore.setLastCheck).toHaveBeenCalledTimes(1);
    expect(onUpdateCheckResult).toHaveBeenCalledWith(expect.objectContaining({ count: 9 }), 'manual');
    scheduler.stop();
  });

  it('persists timestamps for manual metadata sync and cleanup runs', async () => {
    const syncMetadata = vi.fn(async () => ({
      syncedAt: '2026-02-26T09:00:00.000Z'
    }));
    const runCleanup = vi.fn(async () => ({
      timestamp: '2026-02-26T09:05:00.000Z'
    }));
    const settingsStore = createSettingsStore();
    const scheduler = createScheduler({
      syncMetadata,
      runCleanup,
      settingsStore
    });

    scheduler.start(DEFAULT_SETTINGS);
    await scheduler.runManualMetadataSync();
    await scheduler.runManualCleanup();

    expect(settingsStore.setLastMetadataSyncAt).toHaveBeenCalledWith('2026-02-26T09:00:00.000Z');
    expect(settingsStore.setLastCleanupAt).toHaveBeenCalledWith('2026-02-26T09:05:00.000Z');
    scheduler.stop();
  });
});

function createScheduler(overrides: {
  checkNow?: () => Promise<CheckNowResult>;
  syncMetadata?: () => Promise<{ syncedAt: string }>;
  runCleanup?: () => Promise<{ timestamp: string }>;
  settingsStore?: ReturnType<typeof createSettingsStore>;
  onUpdateCheckResult?: (result: CheckNowResult, trigger: 'manual' | 'scheduled' | 'startup') => void;
} = {}): BackgroundScheduler {
  const settingsStore = overrides.settingsStore ?? createSettingsStore();

  return new BackgroundScheduler({
    homebrew: {
      checkNow:
        overrides.checkNow
        ?? (async () => ({
          count: 1,
          checkedAt: new Date().toISOString()
        })),
      syncMetadata:
        overrides.syncMetadata
        ?? (async () => ({
          syncedAt: new Date().toISOString()
        })),
      runCleanup:
        overrides.runCleanup
        ?? (async () => ({
          timestamp: new Date().toISOString()
        }))
    },
    settingsStore,
    jobSink: {
      onProgress: () => undefined,
      onComplete: () => undefined,
      onFailed: () => undefined
    },
    onUpdateCheckResult: overrides.onUpdateCheckResult ?? (() => undefined)
  });
}

function createSettingsStore(initial: {
  lastMetadataSyncAt?: string | null;
  lastCleanupAt?: string | null;
} = {}) {
  let lastMetadataSyncAt = initial.lastMetadataSyncAt ?? null;
  let lastCleanupAt = initial.lastCleanupAt ?? null;

  return {
    setLastCheck: vi.fn(),
    getLastMetadataSyncAt: vi.fn(() => lastMetadataSyncAt),
    setLastMetadataSyncAt: vi.fn((value: string) => {
      lastMetadataSyncAt = value;
    }),
    getLastCleanupAt: vi.fn(() => lastCleanupAt),
    setLastCleanupAt: vi.fn((value: string) => {
      lastCleanupAt = value;
    })
  };
}
