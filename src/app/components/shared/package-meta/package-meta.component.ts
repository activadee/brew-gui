import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import type { PackageKind, PackageReplacement } from '../../../../shared/contracts';

@Component({
  selector: 'app-package-meta',
  imports: [ZardBadgeComponent],
  templateUrl: './package-meta.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './package-meta.component.css',
})
export class PackageMetaComponent {
  readonly kind = input<PackageKind>('formula');
  readonly pinned = input(false);
  readonly smartUpgradeBlocked = input(false);
  readonly installedVersion = input<string | null>(null);
  readonly currentVersion = input<string | null>(null);
  readonly tap = input<string | null>(null);
  readonly deprecated = input(false);
  readonly disabled = input(false);
  readonly replacement = input<PackageReplacement | null>(null);
}
