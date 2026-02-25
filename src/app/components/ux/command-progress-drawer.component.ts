import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';
import { PackageFilterChipsComponent } from '../shared/package-filter-chips.component';
import { PackageSearchInputComponent } from '../shared/package-search-input.component';
import { JobsStore, type JobActionFilter, type JobKindFilter, type JobStatusFilter } from '../../core/stores/jobs.store';

@Component({
  selector: 'app-command-progress-drawer',
  imports: [
    ZardBadgeComponent,
    ZardCardComponent,
    ZardButtonComponent,
    ZardDividerComponent,
    PackageFilterChipsComponent,
    PackageSearchInputComponent
  ],
  template: `
    @if (jobsStore.drawerOpen()) {
      <section class="fixed bottom-3 left-3 right-3 z-50">
        <z-card class="border-border/70 bg-card/95 shadow-2xl backdrop-blur ui-shell-enter">
          <header class="space-y-2 px-1">
            <div class="flex items-center justify-between gap-2">
              <div class="space-y-1">
                <p class="mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Brew Activity Log</p>
                <div class="flex flex-wrap items-center gap-1.5">
                  <z-badge zType="outline" zShape="pill" class="mono text-[10px] uppercase">
                    running {{ jobsStore.runningCount() }}
                  </z-badge>
                  <z-badge zType="secondary" zShape="pill" class="mono text-[10px] uppercase">
                    succeeded {{ jobsStore.succeededCount() }}
                  </z-badge>
                  <z-badge zType="outline" zShape="pill" class="mono text-[10px] uppercase text-destructive border-destructive/40">
                    failed {{ jobsStore.failedCount() }}
                  </z-badge>
                </div>
              </div>

              <div class="flex gap-2">
                <button type="button" z-button zType="ghost" zSize="sm" (click)="jobsStore.clearHistory()">Clear</button>
                <button type="button" z-button zType="ghost" zSize="sm" (click)="jobsStore.closeDrawer()">Hide</button>
              </div>
            </div>

            <div class="grid gap-1.5 lg:grid-cols-3">
              <app-package-filter-chips
                [selected]="jobsStore.statusFilter()"
                [options]="statusFilterOptions()"
                (selectedChange)="onStatusFilterChange($event)"
              />
              <app-package-filter-chips
                [selected]="jobsStore.actionFilter()"
                [options]="actionFilterOptions"
                (selectedChange)="onActionFilterChange($event)"
              />
              <app-package-filter-chips
                [selected]="jobsStore.kindFilter()"
                [options]="kindFilterOptions"
                (selectedChange)="onKindFilterChange($event)"
              />
            </div>

            <app-package-search-input
              [value]="jobsStore.query()"
              placeholder="Search command, package, or output"
              (valueChange)="jobsStore.setQuery($event)"
            />
          </header>

          <z-divider zSpacing="sm" />

          <div class="max-h-[22rem] overflow-y-auto px-1 pb-1">
            @if (jobsStore.filteredJobs().length === 0) {
              <p class="py-6 text-center text-xs text-muted-foreground">No jobs match the current filters.</p>
            } @else {
              <div class="stagger-list space-y-1.5">
                @for (job of jobsStore.filteredJobs(); track job.jobId) {
                  <article class="fade-up rounded-md border border-border/70 bg-muted/15 p-2 transition-colors duration-150 hover:bg-muted/25">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-xs font-semibold">
                          {{ actionLabel(job.action) }}
                          @if (job.packageName) {
                            <span class="text-muted-foreground">· {{ job.packageName }}</span>
                          }
                        </p>
                        <p class="mono truncate text-[10px] text-muted-foreground">{{ job.command }}</p>
                      </div>

                      <div class="flex items-center gap-1.5">
                        <z-badge zType="outline" zShape="pill" class="mono text-[10px] uppercase">{{ job.kind }}</z-badge>
                        <z-badge [zType]="statusBadgeType(job.status)" zShape="pill" class="mono text-[10px] uppercase">
                          {{ job.status }}
                        </z-badge>
                      </div>
                    </div>

                    <div class="mt-2 grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-3">
                      <p>Queued: {{ formatTimestamp(job.queuedAt) }}</p>
                      <p>Running: {{ formatTimestamp(job.runningAt) }}</p>
                      <p>Completed: {{ formatTimestamp(job.completedAt) }}</p>
                    </div>

                    <div class="mt-1.5 flex flex-wrap items-center gap-3 mono text-[10px] text-muted-foreground">
                      <span>exit {{ job.exitCode ?? '—' }}</span>
                      <span>duration {{ formatDuration(job.durationMs) }}</span>
                      <span>lines {{ job.outputLines.length }}</span>
                    </div>

                    @if (job.error) {
                      <p class="mt-1.5 text-xs text-destructive">{{ job.error }}</p>
                    }

                    @if (job.outputLines.length > 0) {
                      <details class="mt-1.5 rounded-md border border-border/70 bg-card/80">
                        <summary class="cursor-pointer px-2 py-1 text-xs font-medium text-muted-foreground">
                          Output ({{ job.outputLines.length }})
                        </summary>
                        <div class="max-h-40 space-y-0.5 overflow-y-auto px-2 pb-2">
                          @for (line of job.outputLines; track $index) {
                            <p class="mono text-[11px]" [class.text-destructive]="line.stream === 'stderr'" [class.text-muted-foreground]="line.stream !== 'stderr'">
                              <span class="text-[10px] uppercase opacity-70">{{ line.stream }}</span>
                              · {{ line.text }}
                            </p>
                          }
                        </div>
                      </details>
                    }
                  </article>
                }
              </div>
            }
          </div>
        </z-card>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
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
    { value: 'pin', label: 'Pin' },
    { value: 'unpin', label: 'Unpin' },
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
      case 'pin':
        return 'Pin formula';
      case 'unpin':
        return 'Unpin formula';
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
