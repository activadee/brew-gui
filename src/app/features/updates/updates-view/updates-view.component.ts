import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import type {
  InstalledPackage,
  OutdatedPackage,
  SmartUpgradePlan,
  SmartUpgradeRiskLevel
} from '../../../../shared/contracts';
import { EmptyStateComponent } from '../../../components/foundation/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../components/foundation/loading-state/loading-state.component';
import { PackageFilterChipsComponent } from '../../../components/shared/package-filter-chips/package-filter-chips.component';
import type { PackageRowOverflowAction } from '../../../components/shared/package-row-overflow-menu/package-row-overflow-menu.component';
import { PackageRowComponent } from '../../../components/shared/package-row/package-row.component';
import { PackageSearchInputComponent } from '../../../components/shared/package-search-input/package-search-input.component';
import { SmartUpgradeDialogComponent } from '../../../components/ux/smart-upgrade-dialog/smart-upgrade-dialog.component';
import { UpdateSummaryCardComponent } from '../../../components/ux/update-summary-card/update-summary-card.component';
import { UpgradeConfirmDialogComponent } from '../../../components/ux/upgrade-confirm-dialog/upgrade-confirm-dialog.component';
import { ToastService } from '../../../core/services/toast.service';
import { InstalledStore } from '../../../core/stores/installed.store';
import { PackageDetailsStore } from '../../../core/stores/package-details.store';
import { UpdatesStore } from '../../../core/stores/updates.store';
import {
  buildUpdateChannelCounts,
  buildUpdateChannelMap,
  type UpdateChannel,
  type UpdateChannelFilter
} from '../update-channel-classifier';

@Component({
  selector: 'app-updates-view',
  imports: [
    ZardButtonComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    PackageFilterChipsComponent,
    PackageRowComponent,
    PackageSearchInputComponent,
    SmartUpgradeDialogComponent,
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

  protected readonly channelFilter = signal<UpdateChannelFilter>('all');
  protected readonly installedById = computed(() => {
    const byId = new Map<string, InstalledPackage>();

    for (const item of this.installedStore.items()) {
      byId.set(item.id, item);
    }

    return byId;
  });
  protected readonly updateChannelMap = computed(() =>
    buildUpdateChannelMap(this.updatesStore.items(), this.installedById())
  );
  protected readonly channelCounts = computed(() =>
    buildUpdateChannelCounts(this.updatesStore.items(), this.updateChannelMap())
  );
  protected readonly channelFilterOptions = computed(() => {
    const counts = this.channelCounts();

    return [
      { value: 'all', label: 'All', count: this.updatesStore.updateCount() },
      { value: 'critical', label: 'Critical', count: counts.critical },
      { value: 'security', label: 'Security', count: counts.security },
      { value: 'normal', label: 'Normal', count: counts.normal }
    ];
  });
  protected readonly channelFilteredItems = computed(() => {
    const selected = this.channelFilter();
    const filtered = this.updatesStore.filteredItems();

    if (selected === 'all') {
      return filtered;
    }

    const channels = this.updateChannelMap();
    return filtered.filter((item) => (channels.get(item.id) ?? 'normal') === selected);
  });
  protected readonly emptyStateLabel = computed(() => {
    const channel = this.channelFilter();
    if (channel === 'all') {
      return 'No updates';
    }

    return `No ${channel} updates`;
  });
  protected readonly emptyStateDescription = computed(() => {
    const channel = this.channelFilter();
    if (channel === 'all') {
      return 'Everything looks up to date for the selected package type.';
    }

    return `No ${channel} channel updates match the current filters.`;
  });

  protected readonly actionBusy = computed(
    () =>
      this.updatesStore.upgrading()
      || this.updatesStore.pinning()
      || this.updatesStore.smartPlanning()
      || this.updatesStore.smartRunning()
  );
  protected readonly smartRiskOptions: SmartUpgradeRiskLevel[] = ['low', 'medium', 'high'];

  protected onFilterChange(value: string): void {
    this.updatesStore.setKindFilter(value as 'all' | 'formula' | 'cask');
  }

  protected onPinFilterChange(value: string): void {
    this.updatesStore.setPinFilter(value as 'all' | 'pinned' | 'unpinned');
  }

  protected onChannelFilterChange(value: string): void {
    this.channelFilter.set(value as UpdateChannelFilter);
  }

  private readonly selectedPackage = signal<OutdatedPackage | null>(null);
  private readonly upgradeAllSelected = signal(false);
  private readonly smartDialogOpen = signal(false);
  protected readonly selectedSmartRisks = signal<SmartUpgradeRiskLevel[]>([]);

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

  protected updateChannelFor(item: OutdatedPackage): UpdateChannel {
    return this.updateChannelMap().get(item.id) ?? 'normal';
  }

  protected overflowActionsFor(item: OutdatedPackage): PackageRowOverflowAction[] {
    const busy = this.actionBusy();
    const blocked = this.smartUpgradeBlocked(item);
    const smartToggleAction: PackageRowOverflowAction = {
      id: 'toggle-smart-upgrade',
      label: blocked ? 'Allow smart upgrade' : 'Exclude from smart upgrade',
      disabled: busy
    };
    if (item.kind === 'cask') {
      return [
        {
          id: 'view-details',
          label: 'View details'
        },
        smartToggleAction,
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
          smartToggleAction,
          { id: 'unpin', label: 'Unpin formula', disabled: busy }
        ]
      : [
          { id: 'view-details', label: 'View details' },
          smartToggleAction,
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

  protected async openSmartUpgrade(): Promise<void> {
    if (this.actionBusy()) {
      return;
    }

    this.smartDialogOpen.set(true);
    const plan = await this.updatesStore.loadSmartUpgradePlan();
    if (!plan) {
      this.selectedSmartRisks.set([]);
      return;
    }

    this.selectedSmartRisks.set(this.defaultSelectedRisks(plan));
  }

  protected closeDialog(): void {
    this.selectedPackage.set(null);
    this.upgradeAllSelected.set(false);
  }

  protected closeSmartUpgradeDialog(): void {
    if (this.updatesStore.smartRunning()) {
      return;
    }

    this.smartDialogOpen.set(false);
    this.selectedSmartRisks.set([]);
  }

  protected onSmartRisksChange(risks: SmartUpgradeRiskLevel[]): void {
    this.selectedSmartRisks.set(risks);
  }

  protected async confirmSmartUpgrade(): Promise<void> {
    if (this.selectedSmartRisks().length === 0) {
      return;
    }

    const started = await this.updatesStore.upgradeSmart(this.selectedSmartRisks());
    if (started) {
      this.toast.push('Smart upgrade completed.', 'success');
      this.closeSmartUpgradeDialog();
    }
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

    if (this.actionBusy()) {
      return;
    }

    if (action === 'toggle-smart-upgrade') {
      const currentlyBlocked = this.updatesStore.isSmartUpgradeBlocked(item.kind, item.name);
      const updated = await this.updatesStore.toggleSmartUpgradeBlocked({
        kind: item.kind,
        name: item.name
      });
      if (updated) {
        this.toast.push(
          currentlyBlocked
            ? `Allowed ${item.name} for smart upgrades.`
            : `Excluded ${item.name} from smart upgrades.`,
          'success'
        );
      }
      return;
    }

    if (item.kind !== 'formula') {
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

  protected smartUpgradeBlocked(item: OutdatedPackage): boolean {
    return this.updatesStore.isSmartUpgradeBlocked(item.kind, item.name);
  }

  protected smartDialogIsOpen(): boolean {
    return this.smartDialogOpen();
  }

  private defaultSelectedRisks(plan: SmartUpgradePlan): SmartUpgradeRiskLevel[] {
    return this.smartRiskOptions.filter((risk) => plan.totals[risk] > 0);
  }
}
