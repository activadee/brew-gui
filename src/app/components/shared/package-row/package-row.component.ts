import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardCardComponent } from '@/shared/components/card';
import type { PackageKind } from '../../../../shared/contracts';
import { PackageActionButtonComponent } from '../package-action-button/package-action-button.component';
import { PackageMetaComponent } from '../package-meta/package-meta.component';
import {
  PackageRowOverflowMenuComponent,
  type PackageRowOverflowAction
} from '../package-row-overflow-menu/package-row-overflow-menu.component';

@Component({
  selector: 'app-package-row',
  imports: [
    ZardCardComponent,
    PackageMetaComponent,
    PackageActionButtonComponent,
    PackageRowOverflowMenuComponent
  ],
  templateUrl: './package-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './package-row.component.css',
})
export class PackageRowComponent {
  readonly name = input.required<string>();
  readonly kind = input<PackageKind>('formula');
  readonly desc = input<string | null>(null);
  readonly pinned = input(false);
  readonly installedVersion = input<string | null>(null);
  readonly currentVersion = input<string | null>(null);
  readonly tap = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);
  readonly actionDisabled = input(false);
  readonly actionVariant = input<'primary' | 'secondary'>('secondary');
  readonly overflowActions = input<PackageRowOverflowAction[]>([]);

  readonly action = output<void>();
  readonly overflowAction = output<string>();
}
