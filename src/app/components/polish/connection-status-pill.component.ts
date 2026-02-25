import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardIconComponent } from '@/shared/components/icon';

@Component({
  selector: 'app-connection-status-pill',
  imports: [ZardBadgeComponent, ZardIconComponent],
  template: `
    <z-badge [zType]="available() ? 'secondary' : 'outline'" zShape="pill" class="gap-1.5 mono text-[10px] uppercase tracking-[0.08em]">
      <z-icon [zType]="available() ? 'circle-check' : 'circle-alert'" zSize="sm" />
      <span>{{ label() }}</span>
    </z-badge>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionStatusPillComponent {
  readonly available = input(false);
  readonly version = input<string | null>(null);

  readonly label = computed(() =>
    this.available() ? `brew detected${this.version() ? ` · ${this.version()}` : ''}` : 'brew missing'
  );
}
