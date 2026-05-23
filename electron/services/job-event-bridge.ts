import type {
  BrewJobCompleteEvent,
  BrewJobFailedEvent,
  BrewJobProgressEvent,
  JobEventSink,
  JobSource
} from '../../src/shared/contracts';
import type { ActiveJobsStore } from './active-jobs-store';
import type { JobHistoryStore } from './job-history-store';
import type { TelemetryStore } from './telemetry-store';

interface JobEventBridgeOptions {
  inner: JobEventSink;
  historyStore: JobHistoryStore;
  activeJobsStore: ActiveJobsStore;
  telemetryStore: TelemetryStore;
  resolveSource?: (jobId: string) => JobSource;
}

interface TrackedJobMeta {
  source: JobSource;
  startedAt: string;
}

export class JobEventBridge implements JobEventSink {
  private readonly inner: JobEventSink;
  private readonly historyStore: JobHistoryStore;
  private readonly activeJobsStore: ActiveJobsStore;
  private readonly telemetryStore: TelemetryStore;
  private readonly resolveSource: (jobId: string) => JobSource;
  private readonly jobMeta = new Map<string, TrackedJobMeta>();

  constructor(options: JobEventBridgeOptions) {
    this.inner = options.inner;
    this.historyStore = options.historyStore;
    this.activeJobsStore = options.activeJobsStore;
    this.telemetryStore = options.telemetryStore;
    this.resolveSource = options.resolveSource ?? (() => 'manual');
  }

  registerJob(jobId: string, source: JobSource): void {
    this.jobMeta.set(jobId, { source, startedAt: new Date().toISOString() });
  }

  onProgress(event: BrewJobProgressEvent): void {
    if (event.stage === 'queued' || event.stage === 'running') {
      this.activeJobsStore.upsertFromProgress(event);
    }

    this.inner.onProgress(event);
  }

  onComplete(event: BrewJobCompleteEvent): void {
    const source = event.source ?? this.sourceFor(event.jobId);
    const meta = this.jobMeta.get(event.jobId);
    const startedAt = meta?.startedAt ?? new Date(Date.now() - event.durationMs).toISOString();

    this.historyStore.appendFromComplete({ ...event, source }, source, startedAt);
    this.telemetryStore.recordJobComplete(event.action, event.durationMs, event.success);
    this.activeJobsStore.remove(event.jobId);
    this.jobMeta.delete(event.jobId);
    this.inner.onComplete({ ...event, source });
  }

  onFailed(event: BrewJobFailedEvent): void {
    const source = event.source ?? this.sourceFor(event.jobId);
    const meta = this.jobMeta.get(event.jobId);
    const startedAt = meta?.startedAt ?? new Date(Date.now() - event.durationMs).toISOString();

    this.historyStore.appendFromFailed({ ...event, source }, source, startedAt);
    this.telemetryStore.recordJobComplete(event.action, event.durationMs, false);
    this.activeJobsStore.remove(event.jobId);
    this.jobMeta.delete(event.jobId);
    this.inner.onFailed({ ...event, source });
  }

  private sourceFor(jobId: string): JobSource {
    return this.jobMeta.get(jobId)?.source ?? this.resolveSource(jobId);
  }
}
