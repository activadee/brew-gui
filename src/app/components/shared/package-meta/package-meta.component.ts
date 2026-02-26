import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import type { PackageKind, PackageReplacement } from '../../../../shared/contracts';
import type { UpdateChannel } from '../../../features/updates/update-channel-classifier';

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
  readonly updateChannel = input<UpdateChannel | null>(null);
  readonly installedVersion = input<string | null>(null);
  readonly currentVersion = input<string | null>(null);
  readonly tap = input<string | null>(null);
  readonly deprecated = input(false);
  readonly disabled = input(false);
  readonly replacement = input<PackageReplacement | null>(null);

  protected updateChannelBadgeType(channel: UpdateChannel): 'destructive' | 'secondary' | 'outline' {
    switch (channel) {
      case 'critical':
        return 'destructive';
      case 'security':
        return 'secondary';
      case 'normal':
      default:
        return 'outline';
    }
  }
}
