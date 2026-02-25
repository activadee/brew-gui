import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-panel-container',
  template: `
    <section class="panel-reveal glass-edge h-full overflow-hidden rounded-[18px] border border-[var(--stroke)] bg-[var(--bg-panel)]">
      <div class="h-full overflow-y-auto subtle-scroll p-4">
        <ng-content />
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PanelContainerComponent {}
