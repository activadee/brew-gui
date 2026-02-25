import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardCardComponent } from '@/shared/components/card';
import { ConnectionStatusPillComponent } from '../../polish/connection-status-pill/connection-status-pill.component';

@Component({
  selector: 'app-top-status-bar',
  imports: [ZardCardComponent, ZardBadgeComponent, ConnectionStatusPillComponent],
  templateUrl: './top-status-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './top-status-bar.component.css',
})
export class TopStatusBarComponent {
  readonly updateCount = input(0);
  readonly lastCheckedAt = input<string | null>(null);
  readonly brewAvailable = input(false);
  readonly brewVersion = input<string | null>(null);

  readonly checkedLabel = computed(() => {
    const checkedAt = this.lastCheckedAt();
    if (!checkedAt) {
      return 'No check recorded';
    }

    const date = new Date(checkedAt);
    return `Last check ${date.toLocaleTimeString()}`;
  });
}
