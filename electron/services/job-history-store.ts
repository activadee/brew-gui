import Store from 'electron-store';

import {
  historyListRequestSchema,
  jobHistoryRecordSchema,
  type BrewJobAction,
  type BrewJobCompleteEvent,
  type BrewJobFailedEvent,
  type HistoryListRequest,
  type HistoryListResponse,
  type HistoryStats,
  type JobHistoryRecord,
  type JobHistoryStatus,
  type JobSource
} from '../../src/shared/contracts';

const MAX_RECORDS = 500;
const OUTPUT_TAIL_MAX = 2048;

interface PersistedHistory {
  records: JobHistoryRecord[];
}

export class JobHistoryStore {
  private readonly store: Store<PersistedHistory>;

  constructor() {
    this.store = new Store<PersistedHistory>({
      name: 'brew-gui-job-history',
      defaults: { records: [] }
    });
  }

  appendFromComplete(event: BrewJobCompleteEvent, source: JobSource, startedAt: string): void {
    const status: JobHistoryStatus = event.success ? 'succeeded' : 'failed';
    this.appendRecord({
      jobId: event.jobId,
      action: event.action,
      packageName: event.packageName,
      kind: event.kind,
      status,
      command: event.command,
      exitCode: event.exitCode,
      durationMs: event.durationMs,
      error: status === 'failed' ? 'Job failed' : null,
      source,
      startedAt,
      completedAt: event.timestamp,
      outputTail: truncateOutput(event.output)
    });
  }

  appendFromFailed(event: BrewJobFailedEvent, source: JobSource, startedAt: string): void {
    this.appendRecord({
      jobId: event.jobId,
      action: event.action,
      packageName: event.packageName,
      kind: event.kind,
      status: 'failed',
      command: event.command,
      exitCode: event.exitCode,
      durationMs: event.durationMs,
      error: event.error,
      source,
      startedAt,
      completedAt: event.timestamp,
      outputTail: truncateOutput(event.output)
    });
  }

  list(request: HistoryListRequest): HistoryListResponse {
    const parsed = historyListRequestSchema.parse(request);
    let filtered = [...this.getRecords()];

    if (parsed.action) {
      filtered = filtered.filter((record) => record.action === parsed.action);
    }

    if (parsed.status) {
      filtered = filtered.filter((record) => record.status === parsed.status);
    }

    if (parsed.since) {
      const sinceMs = Date.parse(parsed.since);
      if (!Number.isNaN(sinceMs)) {
        filtered = filtered.filter((record) => Date.parse(record.completedAt) >= sinceMs);
      }
    }

    filtered.sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));

    const total = filtered.length;
    const start = (parsed.page - 1) * parsed.pageSize;
    const items = filtered.slice(start, start + parsed.pageSize).map((record) =>
      jobHistoryRecordSchema.parse(record)
    );

    return { items, total, page: parsed.page, pageSize: parsed.pageSize };
  }

  getStats(): HistoryStats {
    const records = this.getRecords();
    const succeeded = records.filter((record) => record.status === 'succeeded');
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7 = records.filter((record) => Date.parse(record.completedAt) >= sevenDaysAgo);
    const last7Succeeded = last7.filter((record) => record.status === 'succeeded');

    const durations = succeeded.map((record) => record.durationMs).sort((a, b) => a - b);
    const medianDurationMs =
      durations.length === 0
        ? 0
        : durations.length % 2 === 1
          ? durations[Math.floor(durations.length / 2)]!
          : Math.round(
              (durations[durations.length / 2 - 1]! + durations[durations.length / 2]!) / 2
            );

    const byAction = new Map<BrewJobAction, { total: number; failed: number }>();
    for (const record of records) {
      const current = byAction.get(record.action) ?? { total: 0, failed: 0 };
      current.total += 1;
      if (record.status === 'failed') {
        current.failed += 1;
      }
      byAction.set(record.action, current);
    }

    return {
      totalJobs: records.length,
      successRate: records.length === 0 ? 1 : succeeded.length / records.length,
      medianDurationMs,
      last7Days: {
        total: last7.length,
        succeeded: last7Succeeded.length,
        failed: last7.length - last7Succeeded.length
      },
      failureRateByAction: [...byAction.entries()].map(([action, counts]) => ({
        action,
        total: counts.total,
        failed: counts.failed,
        failureRate: counts.total === 0 ? 0 : counts.failed / counts.total
      }))
    };
  }

  private appendRecord(record: JobHistoryRecord): void {
    const records = this.getRecords();
    records.push(jobHistoryRecordSchema.parse(record));
    const trimmed =
      records.length > MAX_RECORDS ? records.slice(records.length - MAX_RECORDS) : records;
    this.store.set('records', trimmed);
  }

  private getRecords(): JobHistoryRecord[] {
    const raw = this.store.get('records');
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((entry) => {
        const parsed = jobHistoryRecordSchema.safeParse(entry);
        return parsed.success ? parsed.data : null;
      })
      .filter((entry): entry is JobHistoryRecord => entry !== null);
  }
}

function truncateOutput(output: string): string | null {
  if (!output.trim()) {
    return null;
  }

  if (output.length <= OUTPUT_TAIL_MAX) {
    return output;
  }

  return output.slice(-OUTPUT_TAIL_MAX);
}
