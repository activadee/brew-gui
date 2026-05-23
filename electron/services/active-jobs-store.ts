import Store from 'electron-store';

import type {
  BrewJobProgressEvent,
  RecoveredJob
} from '../../src/shared/contracts';

interface ActiveJobRecord {
  jobId: string;
  action: BrewJobProgressEvent['action'];
  command: string;
  packageName: string | null;
  kind: BrewJobProgressEvent['kind'];
  stage: 'queued' | 'running';
  startedAt: string;
}

interface PersistedActiveJobs {
  jobs: ActiveJobRecord[];
}

export class ActiveJobsStore {
  private readonly store: Store<PersistedActiveJobs>;

  constructor() {
    this.store = new Store<PersistedActiveJobs>({
      name: 'brew-gui-active-jobs',
      defaults: { jobs: [] }
    });
  }

  upsertFromProgress(event: BrewJobProgressEvent): void {
    if (event.stage !== 'queued' && event.stage !== 'running') {
      return;
    }

    const jobs = this.getJobs().filter((job) => job.jobId !== event.jobId);
    jobs.push({
      jobId: event.jobId,
      action: event.action,
      command: event.command,
      packageName: event.packageName,
      kind: event.kind,
      stage: event.stage,
      startedAt: event.timestamp
    });
    this.store.set('jobs', jobs);
  }

  remove(jobId: string): void {
    const jobs = this.getJobs().filter((job) => job.jobId !== jobId);
    this.store.set('jobs', jobs);
  }

  listRecovered(): RecoveredJob[] {
    return this.getJobs();
  }

  clear(): void {
    this.store.set('jobs', []);
  }

  private getJobs(): ActiveJobRecord[] {
    const raw = this.store.get('jobs');
    return Array.isArray(raw) ? raw : [];
  }
}
