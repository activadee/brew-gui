import { describe, expect, it, vi } from 'vitest';

vi.mock('electron-store', () => ({
  default: class MockElectronStore<T extends Record<string, unknown>> {
    private readonly data: Record<string, unknown>;

    constructor(options: { defaults?: Record<string, unknown> }) {
      this.data = { ...(options.defaults ?? {}) };
    }

    get<K extends keyof T>(key: K): T[K] {
      return this.data[key as string] as T[K];
    }

    set<K extends keyof T>(key: K, value: T[K]): void {
      this.data[key as string] = value;
    }
  }
}));

import type { BrewJobCompleteEvent } from '../../src/shared/contracts';
import { JobHistoryStore } from './job-history-store';

describe('JobHistoryStore', () => {
  it('retains records and paginates newest first', () => {
    const store = new JobHistoryStore();

    for (let index = 0; index < 3; index += 1) {
      store.appendFromComplete(
        makeCompleteEvent(`job-${index}`, `2026-01-0${index + 1}T00:00:00.000Z`),
        'manual',
        `2026-01-0${index + 1}T00:00:00.000Z`
      );
    }

    const page = store.list({ page: 1, pageSize: 2 });
    expect(page.total).toBe(3);
    expect(page.items).toHaveLength(2);
    expect(page.items[0]?.jobId).toBe('job-2');
  });

  it('computes stats with failure rates', () => {
    const store = new JobHistoryStore();
    store.appendFromComplete(makeCompleteEvent('ok', new Date().toISOString()), 'scheduler', new Date().toISOString());
    store.appendFromComplete(
      { ...makeCompleteEvent('fail', new Date().toISOString()), success: false, exitCode: 1 },
      'manual',
      new Date().toISOString()
    );

    const stats = store.getStats();
    expect(stats.totalJobs).toBe(2);
    expect(stats.successRate).toBe(0.5);
    expect(stats.failureRateByAction.length).toBeGreaterThan(0);
  });
});

function makeCompleteEvent(jobId: string, timestamp: string): BrewJobCompleteEvent {
  return {
    jobId,
    action: 'install',
    command: 'brew install foo',
    kind: 'formula',
    packageName: 'foo',
    success: true,
    exitCode: 0,
    durationMs: 100,
    output: 'done',
    timestamp
  };
}
