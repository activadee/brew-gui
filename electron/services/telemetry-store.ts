import Store from 'electron-store';

import type { BrewJobAction } from '../../src/shared/contracts';

interface TelemetryAggregate {
  actionCounts: Record<string, number>;
  totalDurationMs: number;
  jobCount: number;
  failureCount: number;
}

interface PersistedTelemetry {
  aggregate: TelemetryAggregate;
}

export class TelemetryStore {
  private readonly store: Store<PersistedTelemetry>;
  private enabled = false;

  constructor() {
    this.store = new Store<PersistedTelemetry>({
      name: 'brew-gui-telemetry',
      defaults: {
        aggregate: {
          actionCounts: {},
          totalDurationMs: 0,
          jobCount: 0,
          failureCount: 0
        }
      }
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  recordJobComplete(action: BrewJobAction, durationMs: number, success: boolean): void {
    if (!this.enabled) {
      return;
    }

    const aggregate = this.store.get('aggregate');
    const actionCounts = { ...aggregate.actionCounts };
    actionCounts[action] = (actionCounts[action] ?? 0) + 1;

    this.store.set('aggregate', {
      actionCounts,
      totalDurationMs: aggregate.totalDurationMs + durationMs,
      jobCount: aggregate.jobCount + 1,
      failureCount: aggregate.failureCount + (success ? 0 : 1)
    });
  }

  getAggregate(): TelemetryAggregate {
    return this.store.get('aggregate');
  }
}
