import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardCardComponent } from '@/shared/components/card';
import { ConnectionStatusPillComponent } from '../polish/connection-status-pill.component';

@Component({
  selector: 'app-top-status-bar',
  imports: [ZardCardComponent, ZardBadgeComponent, ConnectionStatusPillComponent],
  template: `
    <z-card class="mx-0 mt-0 border-border/60 bg-card/90 shadow-sm">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
          <app-connection-status-pill [available]="brewAvailable()" [version]="brewVersion()" />
          <p class="mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{{ checkedLabel() }}</p>
        </div>

        <z-badge zType="outline" zShape="pill" class="font-medium">Updates {{ updateCount() }}</z-badge>
      </div>
    </z-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
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
