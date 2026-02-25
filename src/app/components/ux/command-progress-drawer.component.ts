import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { JobsStore } from '../../core/stores/jobs.store';

@Component({
  selector: 'app-command-progress-drawer',
  template: `
    @if (jobsStore.drawerOpen()) {
      <section class="ui-shell-enter fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--stroke)] bg-[var(--bg-elevated)]">
        <header class="flex items-center justify-between border-b border-[var(--stroke)] px-4 py-2">
          <p class="mono text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Brew Job Output</p>
          <div class="flex gap-2">
            <button type="button" class="btn-ui btn-ui-ghost" (click)="jobsStore.clearHistory()">Clear</button>
            <button type="button" class="btn-ui btn-ui-ghost" (click)="jobsStore.closeDrawer()">Hide</button>
          </div>
        </header>

        <div class="subtle-scroll max-h-56 overflow-y-auto px-4 py-3">
          @for (event of jobsStore.latestEvents(); track $index) {
            <p class="mono text-[11px] text-[var(--text-muted)]">{{ event.timestamp }} · {{ event.message.trim() }}</p>
          }

          @if (jobsStore.latestFailed()) {
            <p class="mt-2 text-xs text-[var(--danger)]">{{ jobsStore.latestFailed()!.error }}</p>
          }
        </div>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CommandProgressDrawerComponent {
  protected readonly jobsStore = inject(JobsStore);
}
