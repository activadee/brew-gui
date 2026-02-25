import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-update-summary-card',
  template: `
    <section class="card-surface panel-reveal mb-3 flex items-center justify-between px-4 py-3">
      <div>
        <p class="mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">Update Summary</p>
        <p class="mt-1 text-sm text-[var(--text-main)]">{{ summaryLine() }}</p>
      </div>
      <div class="pulse-badge mono rounded-full border border-[var(--accent)] bg-white px-3 py-1 text-xs text-[var(--accent)]">
        {{ count() }}
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpdateSummaryCardComponent {
  readonly count = input(0);
  readonly lastCheckedAt = input<string | null>(null);

  readonly summaryLine = computed(() => {
    if (this.count() === 0) {
      return 'Everything is current.';
    }

    if (!this.lastCheckedAt()) {
      return `${this.count()} updates available`;
    }

    return `${this.count()} updates available • checked ${new Date(this.lastCheckedAt()!).toLocaleTimeString()}`;
  });
}
