import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';
import { JobsStore } from '../../core/stores/jobs.store';

@Component({
  selector: 'app-command-progress-drawer',
  imports: [ZardCardComponent, ZardButtonComponent, ZardDividerComponent],
  template: `
    @if (jobsStore.drawerOpen()) {
      <section class="fixed bottom-3 left-3 right-3 z-50">
        <z-card class="border-border/70 bg-card/95 shadow-2xl backdrop-blur">
          <header class="flex items-center justify-between gap-2 px-1">
            <p class="mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Brew Job Output</p>
            <div class="flex gap-2">
              <button type="button" z-button zType="ghost" zSize="sm" (click)="jobsStore.clearHistory()">Clear</button>
              <button type="button" z-button zType="ghost" zSize="sm" (click)="jobsStore.closeDrawer()">Hide</button>
            </div>
          </header>

          <z-divider zSpacing="sm" />

          <div class="max-h-56 overflow-y-auto px-1 pb-1">
            @for (event of jobsStore.latestEvents(); track $index) {
              <p class="mono text-[11px] text-muted-foreground">{{ event.timestamp }} · {{ event.message.trim() }}</p>
            }

            @if (jobsStore.latestFailed()) {
              <p class="mt-2 text-xs text-destructive">{{ jobsStore.latestFailed()!.error }}</p>
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
}
