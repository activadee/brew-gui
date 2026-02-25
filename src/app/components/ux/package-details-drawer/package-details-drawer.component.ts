import { ChangeDetectionStrategy, Component, HostListener, computed, inject } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';
import { ZardSkeletonComponent } from '@/shared/components/skeleton';
import type { PackageDependencyGroup } from '../../../../shared/contracts';
import { PackageDetailsStore } from '../../../core/stores/package-details.store';

@Component({
  selector: 'app-package-details-drawer',
  imports: [
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardDividerComponent,
    ZardSkeletonComponent
  ],
  templateUrl: './package-details-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './package-details-drawer.component.css',
})
export class PackageDetailsDrawerComponent {
  protected readonly packageDetailsStore = inject(PackageDetailsStore);

  protected readonly detailsName = computed(
    () => this.packageDetailsStore.details()?.name ?? this.packageDetailsStore.target()?.name ?? 'Package'
  );
  protected readonly detailsFullName = computed(() => this.packageDetailsStore.details()?.fullName ?? null);
  protected readonly detailsKind = computed(() => this.packageDetailsStore.details()?.kind ?? null);
  protected readonly detailsPinned = computed(() => this.packageDetailsStore.details()?.pinned ?? false);
  protected readonly detailsDeprecated = computed(() => this.packageDetailsStore.details()?.deprecated ?? false);
  protected readonly detailsDisabled = computed(() => this.packageDetailsStore.details()?.disabled ?? false);
  protected readonly detailsSource = computed(() => this.packageDetailsStore.details()?.source ?? null);

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.packageDetailsStore.open()) {
      this.packageDetailsStore.close();
    }
  }

  protected reload(): void {
    void this.packageDetailsStore.reload();
  }

  protected formatInstalled(installedVersions: string[]): string {
    if (installedVersions.length === 0) {
      return 'Not installed';
    }
    return installedVersions.join(', ');
  }

  protected formatDependencyItems(group: PackageDependencyGroup): string {
    return group.items.join(', ');
  }
}
