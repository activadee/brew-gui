import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardCardComponent } from '@/shared/components/card';

@Component({
  selector: 'app-update-summary-card',
  imports: [ZardCardComponent, ZardBadgeComponent],
  templateUrl: './update-summary-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './update-summary-card.component.css',
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
