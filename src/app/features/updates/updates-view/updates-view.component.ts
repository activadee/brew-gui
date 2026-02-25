import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import type { OutdatedPackage } from '../../../../shared/contracts';
import { EmptyStateComponent } from '../../../components/foundation/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../components/foundation/loading-state/loading-state.component';
import { PackageFilterChipsComponent } from '../../../components/shared/package-filter-chips/package-filter-chips.component';
import type { PackageRowOverflowAction } from '../../../components/shared/package-row-overflow-menu/package-row-overflow-menu.component';
import { PackageRowComponent } from '../../../components/shared/package-row/package-row.component';
import { PackageSearchInputComponent } from '../../../components/shared/package-search-input/package-search-input.component';
import { UpdateSummaryCardComponent } from '../../../components/ux/update-summary-card/update-summary-card.component';
import { UpgradeConfirmDialogComponent } from '../../../components/ux/upgrade-confirm-dialog/upgrade-confirm-dialog.component';
import { ToastService } from '../../../core/services/toast.service';
import { InstalledStore } from '../../../core/stores/installed.store';
import { PackageDetailsStore } from '../../../core/stores/package-details.store';
import { UpdatesStore } from '../../../core/stores/updates.store';

@Component({
  selector: 'app-updates-view',
  imports: [
    ZardButtonComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    PackageFilterChipsComponent,
    PackageRowComponent,
    PackageSearchInputComponent,
    UpdateSummaryCardComponent,
    UpgradeConfirmDialogComponent
  ],
  templateUrl: './updates-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './updates-view.component.css',
})
export class UpdatesViewComponent {
  protected readonly updatesStore = inject(UpdatesStore);
  protected readonly installedStore = inject(InstalledStore);
  protected readonly packageDetailsStore = inject(PackageDetailsStore);
  private readonly toast = inject(ToastService);

  protected readonly filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'formula', label: 'Formulae' },
    { value: 'cask', label: 'Casks' }
  ];
  protected readonly pinFilterOptions = computed(() => [
    { value: 'all', label: 'All', count: this.updatesStore.updateCount() },
    { value: 'pinned', label: 'Pinned', count: this.updatesStore.pinnedCount() },
    { value: 'unpinned', label: 'Unpinned', count: this.updatesStore.unpinnedCount() }
  ]);
  protected readonly actionBusy = computed(() => this.updatesStore.upgrading() || this.updatesStore.pinning());

  protected onFilterChange(value: string): void {
    this.updatesStore.setKindFilter(value as 'all' | 'formula' | 'cask');
  }

  protected onPinFilterChange(value: string): void {
    this.updatesStore.setPinFilter(value as 'all' | 'pinned' | 'unpinned');
  }

  private readonly selectedPackage = signal<OutdatedPackage | null>(null);
  private readonly upgradeAllSelected = signal(false);

  protected readonly confirmOpen = computed(
    () => Boolean(this.selectedPackage()) || this.upgradeAllSelected()
  );

  protected readonly dialogTitle = computed(() =>
    this.upgradeAllSelected() ? 'Upgrade all outdated packages?' : `Upgrade ${this.selectedPackage()?.name}?`
  );

  protected readonly dialogMessage = computed(() =>
    this.upgradeAllSelected()
      ? 'This runs brew upgrade for formulae and casks. This can take several minutes.'
      : 'This runs brew upgrade for the selected package.'
  );

  protected readonly dialogConfirmLabel = computed(() =>
    this.upgradeAllSelected() ? 'Upgrade all' : 'Upgrade package'
  );

  protected versionLabel(item: OutdatedPackage): string {
    const installed = item.installedVersions.join(', ');
    return `Installed ${installed} → Latest ${item.currentVersion}`;
  }

  protected upgradeActionLabel(item: OutdatedPackage): string {
    return this.canUpgrade(item) ? 'Upgrade' : 'Pinned';
  }

  protected upgradeActionVariant(item: OutdatedPackage): 'primary' | 'secondary' {
    return this.canUpgrade(item) ? 'primary' : 'secondary';
  }

  protected upgradeActionDisabled(item: OutdatedPackage): boolean {
    return this.actionBusy() || !this.canUpgrade(item);
  }

  protected overflowActionsFor(item: OutdatedPackage): PackageRowOverflowAction[] {
    const busy = this.actionBusy();
    if (item.kind === 'cask') {
      return [
        {
          id: 'view-details',
          label: 'View details'
        },
        {
          id: 'pin-not-supported',
          label: 'Pin not supported for casks',
          disabled: true
        }
      ];
    }

    return item.pinned
      ? [
          { id: 'view-details', label: 'View details' },
          { id: 'unpin', label: 'Unpin formula', disabled: busy }
        ]
      : [
          { id: 'view-details', label: 'View details' },
          { id: 'pin', label: 'Pin formula', disabled: busy }
        ];
  }

  protected openUpgradeOne(item: OutdatedPackage): void {
    if (!this.canUpgrade(item) || this.actionBusy()) {
      return;
    }

    this.selectedPackage.set(item);
    this.upgradeAllSelected.set(false);
  }

  protected openUpgradeAll(): void {
    if (this.actionBusy()) {
      return;
    }

    this.selectedPackage.set(null);
    this.upgradeAllSelected.set(true);
  }

  protected closeDialog(): void {
    this.selectedPackage.set(null);
    this.upgradeAllSelected.set(false);
  }

  protected async confirmUpgrade(): Promise<void> {
    if (this.upgradeAllSelected()) {
      const started = await this.updatesStore.upgradeAll();
      if (started) {
        this.toast.push('Upgrade-all command started.', 'success');
        this.closeDialog();
      }
      return;
    }

    const selected = this.selectedPackage();
    if (!selected) {
      return;
    }

    const started = await this.updatesStore.upgradeOne({ kind: selected.kind, name: selected.name });
    if (started) {
      this.toast.push(`Upgrade command started for ${selected.name}.`, 'success');
      this.closeDialog();
    }
  }

  protected async onOverflowAction(item: OutdatedPackage, action: string): Promise<void> {
    if (action === 'view-details') {
      await this.packageDetailsStore.openFor({ kind: item.kind, name: item.name });
      return;
    }

    if (this.actionBusy() || item.kind !== 'formula') {
      return;
    }

    if (action === 'pin') {
      const started = await this.updatesStore.pinOne({ kind: 'formula', name: item.name });
      if (started) {
        await this.installedStore.refresh();
        this.toast.push(`Pinned ${item.name}.`, 'success');
      }
      return;
    }

    if (action === 'unpin') {
      const started = await this.updatesStore.unpinOne({ kind: 'formula', name: item.name });
      if (started) {
        await this.installedStore.refresh();
        this.toast.push(`Unpinned ${item.name}.`, 'success');
      }
    }
  }

  private canUpgrade(item: OutdatedPackage): boolean {
    return !(item.kind === 'formula' && item.pinned);
  }
}
