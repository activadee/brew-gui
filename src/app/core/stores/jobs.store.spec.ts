import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type {
  BrewJobCompleteEvent,
  BrewJobFailedEvent,
  BrewJobProgressEvent
} from '../../../shared/contracts';
import { JobsStore } from './jobs.store';

function createProgressEvent(overrides: Partial<BrewJobProgressEvent> = {}): BrewJobProgressEvent {
  return {
    jobId: 'job-1',
    action: 'install',
    command: 'brew install --formula ripgrep',
    stage: 'queued',
    stream: 'system',
    message: 'Queued install for ripgrep',
    packageName: 'ripgrep',
    kind: 'formula',
    timestamp: '2026-02-25T00:00:00.000Z',
    ...overrides
  };
}

function createCompleteEvent(overrides: Partial<BrewJobCompleteEvent> = {}): BrewJobCompleteEvent {
  return {
    jobId: 'job-1',
    action: 'install',
    command: 'brew install --formula ripgrep',
    kind: 'formula',
    packageName: 'ripgrep',
    success: true,
    exitCode: 0,
    durationMs: 900,
    output: 'Done',
    timestamp: '2026-02-25T00:00:01.000Z',
    ...overrides
  };
}

function createFailedEvent(overrides: Partial<BrewJobFailedEvent> = {}): BrewJobFailedEvent {
  return {
    jobId: 'job-2',
    action: 'uninstall',
    command: 'brew uninstall --cask bad-app',
    kind: 'cask',
    packageName: 'bad-app',
    exitCode: 1,
    durationMs: 550,
    error: 'Uninstall failed',
    output: 'Error: uninstall failed',
    timestamp: '2026-02-25T00:00:02.000Z',
    ...overrides
  };
}

describe('JobsStore', () => {
  function createStore() {
    TestBed.configureTestingModule({});
    return TestBed.inject(JobsStore);
  }

  it('merges progress and completion into a single structured job record', () => {
    const store = createStore();

    store.pushProgress(createProgressEvent());
    store.pushProgress(
      createProgressEvent({
        stage: 'running',
        message: 'Installing ripgrep',
        timestamp: '2026-02-25T00:00:00.100Z'
      })
    );
    store.pushProgress(
      createProgressEvent({
        stage: 'output',
        stream: 'stdout',
        message: 'Downloading\nPouring',
        timestamp: '2026-02-25T00:00:00.200Z'
      })
    );
    store.markComplete(createCompleteEvent());

    const job = store.recentJobs()[0];
    expect(job?.jobId).toBe('job-1');
    expect(job?.status).toBe('succeeded');
    expect(job?.queuedAt).toBe('2026-02-25T00:00:00.000Z');
    expect(job?.runningAt).toBe('2026-02-25T00:00:00.100Z');
    expect(job?.completedAt).toBe('2026-02-25T00:00:01.000Z');
    expect(job?.outputLines.length).toBe(2);
    expect(store.runningCount()).toBe(0);
    expect(store.succeededCount()).toBe(1);
  });

  it('filters by status, action, kind, and query', () => {
    const store = createStore();

    store.pushProgress(createProgressEvent());
    store.markComplete(createCompleteEvent());

    store.pushProgress(
      createProgressEvent({
        jobId: 'job-2',
        action: 'uninstall',
        command: 'brew uninstall --cask bad-app',
        stage: 'queued',
        message: 'Queued uninstall for bad-app',
        packageName: 'bad-app',
        kind: 'cask',
        timestamp: '2026-02-25T00:00:01.500Z'
      })
    );
    store.markFailed(createFailedEvent());

    expect(store.filteredJobs().length).toBe(2);

    store.setStatusFilter('failed');
    expect(store.filteredJobs().length).toBe(1);
    expect(store.filteredJobs()[0]?.jobId).toBe('job-2');

    store.setStatusFilter('all');
    store.setActionFilter('install');
    expect(store.filteredJobs().length).toBe(1);
    expect(store.filteredJobs()[0]?.jobId).toBe('job-1');

    store.setActionFilter('all');
    store.setKindFilter('cask');
    expect(store.filteredJobs().length).toBe(1);
    expect(store.filteredJobs()[0]?.jobId).toBe('job-2');

    store.setKindFilter('all');
    store.setQuery('bad-app');
    expect(store.filteredJobs().length).toBe(1);
    expect(store.filteredJobs()[0]?.jobId).toBe('job-2');
  });

  it('enforces job and output retention limits', () => {
    const store = createStore();

    for (let index = 0; index < 206; index += 1) {
      store.pushProgress(
        createProgressEvent({
          jobId: `job-${index}`,
          command: `brew install --formula pkg-${index}`,
          message: `Queued install for pkg-${index}`,
          packageName: `pkg-${index}`,
          timestamp: `2026-02-25T00:00:${String(index).padStart(2, '0')}.000Z`
        })
      );
    }

    expect(store.recentJobs().length).toBe(200);
    expect(store.recentJobs().at(-1)?.jobId).toBe('job-6');

    store.pushProgress(createProgressEvent({ jobId: 'output-job', packageName: 'output-job', command: 'brew install output-job' }));
    for (let index = 0; index < 450; index += 1) {
      store.pushProgress(
        createProgressEvent({
          jobId: 'output-job',
          stage: 'output',
          stream: 'stdout',
          message: `line-${index}`,
          packageName: 'output-job',
          command: 'brew install output-job',
          timestamp: `2026-02-25T00:01:${String(index % 60).padStart(2, '0')}.000Z`
        })
      );
    }

    const outputJob = store.recentJobs().find((job) => job.jobId === 'output-job');
    expect(outputJob?.outputLines.length).toBe(400);
    expect(outputJob?.outputLines.at(0)?.text).toBe('line-50');
  });
});
