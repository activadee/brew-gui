import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardCardComponent } from '@/shared/components/card';

@Component({
  selector: 'app-update-summary-card',
  imports: [ZardCardComponent, ZardBadgeComponent],
  template: `
    <z-card class="mb-3 border-border/70 bg-card/95 shadow-sm">
      <div class="flex items-center justify-between gap-2">
        <div>
          <p class="mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Update Summary</p>
          <p class="mt-1 text-sm">{{ summaryLine() }}</p>
        </div>
        <z-badge zType="outline" zShape="pill" class="mono">{{ count() }}</z-badge>
      </div>
    </z-card>
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
