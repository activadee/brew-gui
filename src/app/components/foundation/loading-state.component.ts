import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ZardCardComponent } from '@/shared/components/card';
import { ZardLoaderComponent } from '@/shared/components/loader';

@Component({
  selector: 'app-loading-state',
  imports: [ZardCardComponent, ZardLoaderComponent],
  template: `
    <z-card class="rounded-lg border-border/70 bg-card/90 shadow-sm">
      <div class="flex items-center gap-3 py-1">
        <z-loader zSize="sm" />
        <span class="text-sm text-muted-foreground">{{ label() }}</span>
      </div>
    </z-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingStateComponent {
  readonly label = input('Loading…');
}
