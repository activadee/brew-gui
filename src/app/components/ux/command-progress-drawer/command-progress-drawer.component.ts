import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';
import { PackageFilterChipsComponent } from '../../shared/package-filter-chips/package-filter-chips.component';
import { PackageSearchInputComponent } from '../../shared/package-search-input/package-search-input.component';
import { DiagnosticPanelComponent } from '../diagnostic-panel/diagnostic-panel.component';
import { JobsStore, type JobActionFilter, type JobKindFilter, type JobStatusFilter } from '../../../core/stores/jobs.store';

@Component({
  selector: 'app-command-progress-drawer',
  imports: [
    ZardBadgeComponent,
    ZardCardComponent,
    ZardButtonComponent,
    ZardDividerComponent,
    PackageFilterChipsComponent,
    PackageSearchInputComponent,
    DiagnosticPanelComponent
  ],
  templateUrl: './command-progress-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './command-progress-drawer.component.css',
})
export class CommandProgressDrawerComponent {
  protected readonly jobsStore = inject(JobsStore);

  protected readonly statusFilterOptions = computed(() => [
    { value: 'all', label: 'All' },
    { value: 'running', label: 'Running', count: this.jobsStore.runningCount() },
    { value: 'succeeded', label: 'Succeeded', count: this.jobsStore.succeededCount() },
    { value: 'failed', label: 'Failed', count: this.jobsStore.failedCount() }
  ]);

  protected readonly actionFilterOptions = [
    { value: 'all', label: 'All actions' },
    { value: 'install', label: 'Install' },
    { value: 'uninstall', label: 'Uninstall' },
    { value: 'reinstall', label: 'Reinstall' },
    { value: 'upgradeOne', label: 'Upgrade one' },
    { value: 'upgradeAll', label: 'Upgrade all' },
    { value: 'upgradeSmart', label: 'Smart upgrade' },
    { value: 'cleanup', label: 'Cleanup' },
    { value: 'doctor', label: 'Doctor' },
    { value: 'pin', label: 'Pin' },
    { value: 'unpin', label: 'Unpin' },
    { value: 'tapAdd', label: 'Tap add' },
    { value: 'tapRemove', label: 'Tap remove' },
    { value: 'serviceStart', label: 'Service start' },
    { value: 'serviceStop', label: 'Service stop' },
    { value: 'serviceRestart', label: 'Service restart' },
    { value: 'syncMetadata', label: 'Sync metadata' }
  ];

  protected readonly kindFilterOptions = [
    { value: 'all', label: 'All kinds' },
    { value: 'formula', label: 'Formula' },
    { value: 'cask', label: 'Cask' },
    { value: 'system', label: 'System' }
  ];

  protected onStatusFilterChange(value: string): void {
    this.jobsStore.setStatusFilter(value as JobStatusFilter);
  }

  protected onActionFilterChange(value: string): void {
    this.jobsStore.setActionFilter(value as JobActionFilter);
  }

  protected onKindFilterChange(value: string): void {
    this.jobsStore.setKindFilter(value as JobKindFilter);
  }

  protected actionLabel(action: JobActionFilter): string {
    switch (action) {
      case 'install':
        return 'Install';
      case 'uninstall':
        return 'Uninstall';
      case 'reinstall':
        return 'Reinstall';
      case 'upgradeOne':
        return 'Upgrade package';
      case 'upgradeAll':
        return 'Upgrade all';
      case 'upgradeSmart':
        return 'Smart upgrade';
      case 'cleanup':
        return 'Cleanup';
      case 'doctor':
        return 'Doctor diagnostics';
      case 'pin':
        return 'Pin formula';
      case 'unpin':
        return 'Unpin formula';
      case 'tapAdd':
        return 'Add tap';
      case 'tapRemove':
        return 'Remove tap';
      case 'serviceStart':
        return 'Start service';
      case 'serviceStop':
        return 'Stop service';
      case 'serviceRestart':
        return 'Restart service';
      case 'syncMetadata':
        return 'Sync metadata';
      default:
        return 'Action';
    }
  }

  protected statusBadgeType(status: JobStatusFilter): 'default' | 'secondary' | 'outline' | 'destructive' {
    switch (status) {
      case 'running':
        return 'default';
      case 'succeeded':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  protected formatTimestamp(value: string | null): string {
    if (!value) {
      return '—';
    }

    try {
      return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return value;
    }
  }

  protected stderrSnippet(job: { outputLines: { stream: string; text: string }[]; error: string | null }): string {
    const stderrLines = job.outputLines
      .filter((line) => line.stream === 'stderr')
      .map((line) => line.text)
      .join('\n')
      .trim();

    return stderrLines || job.error || 'No stderr output captured.';
  }

  protected formatDuration(durationMs: number | null): string {
    if (durationMs === null) {
      return '—';
    }

    if (durationMs < 1_000) {
      return `${durationMs}ms`;
    }

    return `${(durationMs / 1_000).toFixed(1)}s`;
  }
}
