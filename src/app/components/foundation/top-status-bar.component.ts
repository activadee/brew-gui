import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ConnectionStatusPillComponent } from '../polish/connection-status-pill.component';

@Component({
  selector: 'app-top-status-bar',
  imports: [ConnectionStatusPillComponent],
  template: `
    <header class="panel-reveal flex flex-wrap items-center justify-between gap-3 border-b border-[var(--stroke)] bg-[var(--bg-elevated)] px-4 py-3">
      <div class="flex items-center gap-3">
        <app-connection-status-pill [available]="brewAvailable()" [version]="brewVersion()" />
        <p class="mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{{ checkedLabel() }}</p>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="btn-ui btn-ui-ghost"
          (click)="paletteRequested.emit()"
        >
          Palette
        </button>
        <button
          type="button"
          class="btn-ui btn-ui-ghost"
          (click)="syncRequested.emit()"
        >
          Sync metadata
        </button>
        <button
          type="button"
          class="btn-ui btn-ui-primary"
          (click)="checkRequested.emit()"
        >
          Check now @if (updateCount() > 0) {<span class="mono">({{ updateCount() }})</span>}
        </button>
      </div>
    </header>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopStatusBarComponent {
  readonly updateCount = input(0);
  readonly lastCheckedAt = input<string | null>(null);
  readonly brewAvailable = input(false);
  readonly brewVersion = input<string | null>(null);

  readonly checkRequested = output<void>();
  readonly syncRequested = output<void>();
  readonly paletteRequested = output<void>();

  readonly checkedLabel = computed(() => {
    const checkedAt = this.lastCheckedAt();
    if (!checkedAt) {
      return 'No check recorded';
    }

    const date = new Date(checkedAt);
    return `Last check ${date.toLocaleTimeString()}`;
  });
}
