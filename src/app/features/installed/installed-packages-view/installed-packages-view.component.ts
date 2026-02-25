import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import type { InstalledPackage, ReinstallOneRequest } from '../../../../shared/contracts';
import { EmptyStateComponent } from '../../../components/foundation/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../components/foundation/loading-state/loading-state.component';
import { PackageFilterChipsComponent } from '../../../components/shared/package-filter-chips/package-filter-chips.component';
import type { PackageRowOverflowAction } from '../../../components/shared/package-row-overflow-menu/package-row-overflow-menu.component';
import { PackageRowComponent } from '../../../components/shared/package-row/package-row.component';
import { PackageSearchInputComponent } from '../../../components/shared/package-search-input/package-search-input.component';
import { ReinstallConfirmDialogComponent } from '../../../components/ux/reinstall-confirm-dialog/reinstall-confirm-dialog.component';
import { UninstallConfirmDialogComponent } from '../../../components/ux/uninstall-confirm-dialog/uninstall-confirm-dialog.component';
import { BrewFacadeService } from '../../../core/services/brew-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { InstalledStore } from '../../../core/stores/installed.store';
import { PackageDetailsStore } from '../../../core/stores/package-details.store';
import { UpdatesStore } from '../../../core/stores/updates.store';

@Component({
  selector: 'app-installed-packages-view',
  imports: [
    ZardButtonComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    PackageFilterChipsComponent,
    PackageRowComponent,
    PackageSearchInputComponent,
    ReinstallConfirmDialogComponent,
    UninstallConfirmDialogComponent
  ],
  templateUrl: './installed-packages-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './installed-packages-view.component.css',
})
export class InstalledPackagesViewComponent {
  protected readonly installedStore = inject(InstalledStore);
  protected readonly updatesStore = inject(UpdatesStore);
  protected readonly catalogStore = inject(CatalogStore);
  protected readonly packageDetailsStore = inject(PackageDetailsStore);
  private readonly facade = inject(BrewFacadeService);
  private readonly toast = inject(ToastService);

  protected readonly filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'formula', label: 'Formulae' },
    { value: 'cask', label: 'Casks' }
  ];

  protected readonly selectedPackage = signal<InstalledPackage | null>(null);
  protected readonly zapSelected = signal(false);
  protected readonly uninstallBusy = signal(false);
  protected readonly reinstallTarget = signal<InstalledPackage | null>(null);
  protected readonly reinstallZapSelected = signal(false);
  protected readonly reinstallBusy = signal(false);
  protected readonly actionBusy = computed(
    () => this.uninstallBusy() || this.reinstallBusy() || this.installedStore.pinning()
  );
  protected readonly uninstallConfirmOpen = computed(() => Boolean(this.selectedPackage()));
  protected readonly reinstallConfirmOpen = computed(() => Boolean(this.reinstallTarget()));
  protected readonly pinFilterOptions = computed(() => [
    { value: 'all', label: 'All', count: this.installedStore.totalCount() },
    { value: 'pinned', label: 'Pinned', count: this.installedStore.pinnedCount() },
    { value: 'unpinned', label: 'Unpinned', count: this.installedStore.unpinnedCount() }
  ]);
  protected readonly uninstallDialogTitle = computed(() =>
    this.selectedPackage() ? `Uninstall ${this.selectedPackage()!.name}?` : 'Uninstall package?'
  );
  protected readonly uninstallDialogMessage = computed(() =>
    this.selectedPackage()?.kind === 'cask'
      ? 'This removes the selected cask from Homebrew. You can optionally remove related files with --zap.'
      : 'This removes the selected formula from Homebrew.'
  );
  protected readonly uninstallCommandPreview = computed(() => {
    const target = this.selectedPackage();
    if (!target) {
      return null;
    }

    if (target.kind === 'formula') {
      return `brew uninstall --formula ${target.name}`;
    }

    return this.zapSelected()
      ? `brew uninstall --cask --zap ${target.name}`
      : `brew uninstall --cask ${target.name}`;
  });
  protected readonly reinstallDialogTitle = computed(() =>
    this.reinstallTarget() ? `Reinstall ${this.reinstallTarget()!.name}?` : 'Reinstall package?'
  );
  protected readonly reinstallDialogMessage = computed(() =>
    this.reinstallTarget()?.kind === 'cask'
      ? 'This reinstalls the selected cask. You can optionally remove related files with --zap first.'
      : 'This reinstalls the selected formula using Homebrew.'
  );
  protected readonly reinstallCommandPreview = computed(() => {
    const target = this.reinstallTarget();
    if (!target) {
      return null;
    }

    if (target.kind === 'formula') {
      return `brew reinstall --formula ${target.name}`;
    }

    return this.reinstallZapSelected()
      ? `brew reinstall --cask --zap ${target.name}`
      : `brew reinstall --cask ${target.name}`;
  });

  protected onFilterChange(value: string): void {
    this.installedStore.setKindFilter(value as 'all' | 'formula' | 'cask');
  }

  protected onPinFilterChange(value: string): void {
    this.installedStore.setPinFilter(value as 'all' | 'pinned' | 'unpinned');
  }

  protected openUninstallDialog(item: InstalledPackage): void {
    if (this.actionBusy()) {
      return;
    }

    this.reinstallTarget.set(null);
    this.reinstallZapSelected.set(false);
    this.selectedPackage.set(item);
    this.zapSelected.set(false);
  }

  protected closeUninstallDialog(): void {
    if (this.uninstallBusy()) {
      return;
    }

    this.selectedPackage.set(null);
    this.zapSelected.set(false);
  }

  protected onZapSelectedChange(selected: boolean): void {
    this.zapSelected.set(selected);
  }

  protected overflowActionsFor(item: InstalledPackage): PackageRowOverflowAction[] {
    const busy = this.actionBusy();
    if (item.kind === 'cask') {
      return [
        {
          id: 'view-details',
          label: 'View details'
        },
        {
          id: 'reinstall',
          label: 'Reinstall package',
          disabled: busy
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
          { id: 'reinstall', label: 'Reinstall package', disabled: busy },
          { id: 'unpin', label: 'Unpin formula', disabled: busy }
        ]
      : [
          { id: 'view-details', label: 'View details' },
          { id: 'reinstall', label: 'Reinstall package', disabled: busy },
          { id: 'pin', label: 'Pin formula', disabled: busy }
        ];
  }

  protected async onOverflowAction(item: InstalledPackage, action: string): Promise<void> {
    if (action === 'view-details') {
      await this.packageDetailsStore.openFor({ kind: item.kind, name: item.name });
      return;
    }

    if (this.actionBusy()) {
      return;
    }

    if (action === 'reinstall') {
      this.openReinstallDialog(item);
      return;
    }

    if (item.kind !== 'formula') {
      return;
    }

    if (action === 'pin') {
      const started = await this.installedStore.pinOne({ kind: 'formula', name: item.name });
      if (started) {
        await this.updatesStore.refresh();
        this.toast.push(`Pinned ${item.name}.`, 'success');
      }
      return;
    }

    if (action === 'unpin') {
      const started = await this.installedStore.unpinOne({ kind: 'formula', name: item.name });
      if (started) {
        await this.updatesStore.refresh();
        this.toast.push(`Unpinned ${item.name}.`, 'success');
      }
    }
  }

  protected openReinstallDialog(item: InstalledPackage): void {
    if (this.actionBusy()) {
      return;
    }

    this.selectedPackage.set(null);
    this.zapSelected.set(false);
    this.reinstallTarget.set(item);
    this.reinstallZapSelected.set(false);
  }

  protected closeReinstallDialog(): void {
    if (this.reinstallBusy()) {
      return;
    }

    this.reinstallTarget.set(null);
    this.reinstallZapSelected.set(false);
  }

  protected onReinstallZapSelectedChange(selected: boolean): void {
    this.reinstallZapSelected.set(selected);
  }

  protected async confirmUninstall(): Promise<void> {
    const target = this.selectedPackage();
    if (!target) {
      return;
    }

    const request =
      target.kind === 'cask'
        ? {
            kind: target.kind,
            name: target.name,
            zap: this.zapSelected()
          }
        : {
            kind: target.kind,
            name: target.name
          };

    this.uninstallBusy.set(true);
    this.selectedPackage.set(null);
    this.zapSelected.set(false);

    try {
      const result = await this.facade.uninstallOne(request);
      if (!result.success) {
        return;
      }

      await Promise.all([
        this.installedStore.refresh(),
        this.updatesStore.refresh(),
        this.catalogStore.refresh()
      ]);
      this.toast.push(`Uninstalled ${target.name}.`, 'success');
    } catch {
      // Error toasts are handled by the global job-failed event bridge.
    } finally {
      this.uninstallBusy.set(false);
    }
  }

  protected async confirmReinstall(): Promise<void> {
    const target = this.reinstallTarget();
    if (!target) {
      return;
    }

    const request: ReinstallOneRequest =
      target.kind === 'cask'
        ? {
            kind: target.kind,
            name: target.name,
            zap: this.reinstallZapSelected()
          }
        : {
            kind: target.kind,
            name: target.name
          };

    this.reinstallBusy.set(true);
    this.reinstallTarget.set(null);
    this.reinstallZapSelected.set(false);

    try {
      const result = await this.facade.reinstallOne(request);
      if (!result.success) {
        return;
      }

      await Promise.all([
        this.installedStore.refresh(),
        this.updatesStore.refresh(),
        this.catalogStore.refresh()
      ]);
      this.toast.push(`Reinstalled ${target.name}.`, 'success');
    } catch {
      // Error toasts are handled by the global job-failed event bridge.
    } finally {
      this.reinstallBusy.set(false);
    }
  }
}
