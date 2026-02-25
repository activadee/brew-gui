import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import type { PackageKind } from '../../../shared/contracts';

@Component({
  selector: 'app-package-meta',
  template: `
    <div class="mt-2 flex flex-wrap items-center gap-2">
      <span class="mono rounded-full border border-[var(--stroke)] px-2 py-0.5 text-[10px] uppercase text-[var(--text-muted)]">
        {{ kind() }}
      </span>
      @if (installedVersion()) {
        <span class="mono rounded-full border border-[var(--stroke)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
          installed {{ installedVersion() }}
        </span>
      }
      @if (currentVersion()) {
        <span class="mono rounded-full border border-[var(--stroke)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">
          latest {{ currentVersion() }}
        </span>
      }
      @if (tap()) {
        <span class="mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">{{ tap() }}</span>
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
