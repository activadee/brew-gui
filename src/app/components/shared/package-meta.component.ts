import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import type { PackageKind } from '../../../shared/contracts';

@Component({
  selector: 'app-package-meta',
  imports: [ZardBadgeComponent],
  template: `
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <z-badge zType="outline" zShape="pill" class="mono text-[10px] uppercase">{{ kind() }}</z-badge>
      @if (installedVersion()) {
        <z-badge zType="outline" zShape="pill" class="mono text-[10px]">installed {{ installedVersion() }}</z-badge>
      }
      @if (currentVersion()) {
        <z-badge zType="outline" zShape="pill" class="mono text-[10px]">latest {{ currentVersion() }}</z-badge>
      }
      @if (tap()) {
        <span class="mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{{ tap() }}</span>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PackageMetaComponent {
  readonly kind = input<PackageKind>('formula');
  readonly installedVersion = input<string | null>(null);
  readonly currentVersion = input<string | null>(null);
  readonly tap = input<string | null>(null);
}
