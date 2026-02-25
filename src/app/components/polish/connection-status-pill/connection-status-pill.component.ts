import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardIconComponent } from '@/shared/components/icon';

@Component({
  selector: 'app-connection-status-pill',
  imports: [ZardBadgeComponent, ZardIconComponent],
  templateUrl: './connection-status-pill.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './connection-status-pill.component.css',
})
export class ConnectionStatusPillComponent {
  readonly available = input(false);
  readonly version = input<string | null>(null);

  readonly label = computed(() =>
    this.available() ? `brew detected${this.version() ? ` · ${this.version()}` : ''}` : 'brew missing'
  );
}
