import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import type { PackageKind } from '../../../shared/contracts';
import { PackageActionButtonComponent } from './package-action-button.component';
import { PackageMetaComponent } from './package-meta.component';

@Component({
  selector: 'app-package-row',
  imports: [PackageMetaComponent, PackageActionButtonComponent],
  template: `
    <article class="fade-up hover-lift rounded-xl border border-[var(--stroke)] bg-white/95 p-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h4 class="truncate text-sm font-semibold text-[var(--text-main)]">{{ name() }}</h4>
          @if (desc()) {
            <p class="mt-1 text-xs text-[var(--text-muted)]">{{ desc() }}</p>
          }
          <app-package-meta
            [kind]="kind()"
            [installedVersion]="installedVersion()"
            [currentVersion]="currentVersion()"
            [tap]="tap()"
          />
        </div>

        @if (actionLabel(); as label) {
          <app-package-action-button
            [label]="label"
            [disabled]="actionDisabled()"
            [variant]="actionVariant()"
            (pressed)="action.emit()"
          />
        }
      </div>
    </article>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PackageRowComponent {
  readonly name = input.required<string>();
  readonly kind = input<PackageKind>('formula');
  readonly desc = input<string | null>(null);
  readonly installedVersion = input<string | null>(null);
  readonly currentVersion = input<string | null>(null);
  readonly tap = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);
  readonly actionDisabled = input(false);
  readonly actionVariant = input<'primary' | 'secondary'>('secondary');

  readonly action = output<void>();
}
