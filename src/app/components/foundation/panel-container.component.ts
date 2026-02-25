import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ZardCardComponent } from '@/shared/components/card';

@Component({
  selector: 'app-panel-container',
  imports: [ZardCardComponent],
  template: `
    <z-card
      class="h-full overflow-hidden border-border/70 bg-card/90 shadow-sm
        [&>[data-slot=card-content]]:flex-1
        [&>[data-slot=card-content]]:min-h-0
        [&>[data-slot=card-content]]:overflow-hidden
        [&>[data-slot=card-content]]:px-0
        [&>[data-slot=card-content]]:py-0"
    >
      <div class="h-full overflow-y-auto p-2">
        <ng-content />
      </div>
    </z-card>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelContainerComponent {}
