import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type {
  BrewJobAction,
  BrewJobCompleteEvent,
  BrewJobFailedEvent,
  BrewJobKind,
  BrewJobProgressEvent,
  BrewJobStream
} from '../../../shared/contracts';

const MAX_JOBS = 200;
const MAX_OUTPUT_LINES = 400;

export type JobLogStatus = 'running' | 'succeeded' | 'failed';
export type JobStatusFilter = 'all' | JobLogStatus;
export type JobKindFilter = 'all' | BrewJobKind;
export type JobActionFilter = 'all' | BrewJobAction;

export interface JobOutputLine {
  text: string;
  stream: BrewJobStream;
  timestamp: string;
}

export interface JobLogEntry {
  jobId: string;
  action: BrewJobAction;
  command: string;
  packageName: string | null;
  kind: BrewJobKind;
  status: JobLogStatus;
  queuedAt: string | null;
  runningAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  exitCode: number | null;
  error: string | null;
  outputLines: JobOutputLine[];
}

interface JobsState {
  jobsById: Record<string, JobLogEntry>;
  jobIds: string[];
  drawerOpen: boolean;
  statusFilter: JobStatusFilter;
  actionFilter: JobActionFilter;
  kindFilter: JobKindFilter;
  query: string;
}

const initialState: JobsState = {
  jobsById: {},
  jobIds: [],
  drawerOpen: false,
  statusFilter: 'all',
  actionFilter: 'all',
  kindFilter: 'all',
  query: ''
};

export const JobsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    recentJobs: computed(() =>
      [...store.jobIds()]
        .reverse()
        .map((jobId) => store.jobsById()[jobId])
        .filter((job): job is JobLogEntry => Boolean(job))
    ),
    runningCount: computed(() =>
      store.jobIds().reduce(
        (total, jobId) => total + (store.jobsById()[jobId]?.status === 'running' ? 1 : 0),
        0
      )
    ),
    succeededCount: computed(() =>
      store.jobIds().reduce(
        (total, jobId) => total + (store.jobsById()[jobId]?.status === 'succeeded' ? 1 : 0),
        0
      )
    ),
    failedCount: computed(() =>
      store.jobIds().reduce(
        (total, jobId) => total + (store.jobsById()[jobId]?.status === 'failed' ? 1 : 0),
        0
      )
    ),
    filteredJobs: computed(() => {
      const statusFilter = store.statusFilter();
      const actionFilter = store.actionFilter();
      const kindFilter = store.kindFilter();
      const query = store.query().trim().toLocaleLowerCase();

      return [...store.jobIds()]
        .reverse()
        .map((jobId) => store.jobsById()[jobId])
        .filter((job): job is JobLogEntry => Boolean(job))
        .filter((job) => {
          if (statusFilter !== 'all' && job.status !== statusFilter) {
            return false;
          }

          if (actionFilter !== 'all' && job.action !== actionFilter) {
            return false;
          }

          if (kindFilter !== 'all' && job.kind !== kindFilter) {
            return false;
          }

          if (!query) {
            return true;
          }

          const haystack = [
            job.command,
            job.packageName ?? '',
            job.error ?? '',
            job.outputLines.map((line) => line.text).join(' ')
          ]
            .join(' ')
            .toLocaleLowerCase();

          return haystack.includes(query);
        });
    })
  })),
  withMethods((store) => ({
    pushProgress(event: BrewJobProgressEvent): void {
      const currentJobs = { ...store.jobsById() };
      let jobIds = [...store.jobIds()];
      const existing = currentJobs[event.jobId];
      const job = existing
        ? { ...existing, outputLines: [...existing.outputLines] }
        : createJobFromProgressEvent(event);

      if (!existing) {
        jobIds.push(event.jobId);
      }

      if (event.stage === 'queued') {
        job.queuedAt = event.timestamp;
        job.status = 'running';
      } else if (event.stage === 'running') {
        job.runningAt = event.timestamp;
        job.status = 'running';
      } else if (event.stage === 'output') {
        const outputLines = parseOutputLines(event.message, event.stream, event.timestamp);
        job.outputLines = trimOutputLines([...job.outputLines, ...outputLines]);
      }

      currentJobs[event.jobId] = job;
      const retentionApplied = applyRetention(currentJobs, jobIds);

      patchState(store, {
        jobsById: retentionApplied.jobsById,
        jobIds: retentionApplied.jobIds,
        drawerOpen: event.stage === 'queued' || event.stage === 'running' ? true : store.drawerOpen()
      });
    },

    markComplete(event: BrewJobCompleteEvent): void {
      const currentJobs = { ...store.jobsById() };
      let jobIds = [...store.jobIds()];
      const existing = currentJobs[event.jobId];
      const job = existing
        ? { ...existing, outputLines: [...existing.outputLines] }
        : createJobFromTerminalEvent(event);

      job.status = 'succeeded';
      job.completedAt = event.timestamp;
      job.durationMs = event.durationMs;
      job.exitCode = event.exitCode;
      job.error = null;
      if (job.outputLines.length === 0 && event.output.trim().length > 0) {
        const lines = parseOutputLines(event.output, 'system', event.timestamp);
        job.outputLines = trimOutputLines([...job.outputLines, ...lines]);
      }

      if (!existing) {
        jobIds.push(event.jobId);
      }

      currentJobs[event.jobId] = job;
      const retentionApplied = applyRetention(currentJobs, jobIds);

      patchState(store, {
        jobsById: retentionApplied.jobsById,
        jobIds: retentionApplied.jobIds
      });
    },

    markFailed(event: BrewJobFailedEvent): void {
      const currentJobs = { ...store.jobsById() };
      let jobIds = [...store.jobIds()];
      const existing = currentJobs[event.jobId];
      const job = existing
        ? { ...existing, outputLines: [...existing.outputLines] }
        : createJobFromTerminalEvent(event);

      job.status = 'failed';
      job.completedAt = event.timestamp;
      job.durationMs = event.durationMs;
      job.exitCode = event.exitCode;
      job.error = event.error;
      if (event.output.trim().length > 0) {
        const lines = parseOutputLines(event.output, 'stderr', event.timestamp);
        job.outputLines = trimOutputLines([...job.outputLines, ...lines]);
      }

      if (!existing) {
        jobIds.push(event.jobId);
      }

      currentJobs[event.jobId] = job;
      const retentionApplied = applyRetention(currentJobs, jobIds);

      patchState(store, {
        jobsById: retentionApplied.jobsById,
        jobIds: retentionApplied.jobIds,
        drawerOpen: true
      });
    },

    setStatusFilter(statusFilter: JobStatusFilter): void {
      patchState(store, { statusFilter });
    },

    setActionFilter(actionFilter: JobActionFilter): void {
      patchState(store, { actionFilter });
    },

    setKindFilter(kindFilter: JobKindFilter): void {
      patchState(store, { kindFilter });
    },

    setQuery(query: string): void {
      patchState(store, { query });
    },

    resetFilters(): void {
      patchState(store, {
        statusFilter: 'all',
        actionFilter: 'all',
        kindFilter: 'all',
        query: ''
      });
    },

    closeDrawer(): void {
      patchState(store, { drawerOpen: false });
    },

    openDrawer(): void {
      patchState(store, { drawerOpen: true });
    },

    clearHistory(): void {
      patchState(store, {
        jobsById: {},
        jobIds: [],
        drawerOpen: false,
        statusFilter: 'all',
        actionFilter: 'all',
        kindFilter: 'all',
        query: ''
      });
    }
  }))
);

function createJobFromProgressEvent(event: BrewJobProgressEvent): JobLogEntry {
  return {
    jobId: event.jobId,
    action: event.action,
    command: event.command,
    packageName: event.packageName,
    kind: event.kind,
    status: 'running',
    queuedAt: event.stage === 'queued' ? event.timestamp : null,
    runningAt: event.stage === 'running' ? event.timestamp : null,
    completedAt: null,
    durationMs: null,
    exitCode: null,
    error: null,
    outputLines: event.stage === 'output' ? parseOutputLines(event.message, event.stream, event.timestamp) : []
  };
}

function createJobFromTerminalEvent(event: BrewJobCompleteEvent | BrewJobFailedEvent): JobLogEntry {
  return {
    jobId: event.jobId,
    action: event.action,
    command: event.command,
    packageName: event.packageName,
    kind: event.kind,
    status: 'running',
    queuedAt: null,
    runningAt: null,
    completedAt: null,
    durationMs: null,
    exitCode: null,
    error: null,
    outputLines: []
  };
}

function parseOutputLines(message: string, stream: BrewJobStream, timestamp: string): JobOutputLine[] {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  return lines.map((text) => ({ text, stream, timestamp }));
}

function trimOutputLines(lines: JobOutputLine[]): JobOutputLine[] {
  if (lines.length <= MAX_OUTPUT_LINES) {
    return lines;
  }

  return lines.slice(lines.length - MAX_OUTPUT_LINES);
}

function applyRetention(
  jobsById: Record<string, JobLogEntry>,
  jobIds: string[]
): {
  jobsById: Record<string, JobLogEntry>;
  jobIds: string[];
} {
  if (jobIds.length <= MAX_JOBS) {
    return { jobsById, jobIds };
  }

  const removeCount = jobIds.length - MAX_JOBS;
  const removedIds = jobIds.slice(0, removeCount);
  const retainedIds = jobIds.slice(removeCount);
  const retainedJobs = { ...jobsById };

  for (const removedId of removedIds) {
    delete retainedJobs[removedId];
  }

  return {
    jobsById: retainedJobs,
    jobIds: retainedIds
  };
}
