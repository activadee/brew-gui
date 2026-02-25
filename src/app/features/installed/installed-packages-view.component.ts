import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import type { InstalledPackage } from '../../../shared/contracts';
import { EmptyStateComponent } from '../../components/foundation/empty-state.component';
import { LoadingStateComponent } from '../../components/foundation/loading-state.component';
import { PackageFilterChipsComponent } from '../../components/shared/package-filter-chips.component';
import { PackageRowComponent } from '../../components/shared/package-row.component';
import { PackageSearchInputComponent } from '../../components/shared/package-search-input.component';
import { UninstallConfirmDialogComponent } from '../../components/ux/uninstall-confirm-dialog.component';
import { BrewFacadeService } from '../../core/services/brew-facade.service';
import { ToastService } from '../../core/services/toast.service';
import { CatalogStore } from '../../core/stores/catalog.store';
import { InstalledStore } from '../../core/stores/installed.store';
import { UpdatesStore } from '../../core/stores/updates.store';

@Component({
  selector: 'app-installed-packages-view',
  imports: [
    ZardButtonComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    PackageFilterChipsComponent,
    PackageRowComponent,
    PackageSearchInputComponent,
    UninstallConfirmDialogComponent
  ],
  template: `
    <section class="ui-shell-enter space-y-2">
      <header class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">Installed Packages</h2>
        <button
          type="button"
          z-button
          zType="outline"
          zSize="sm"
          (click)="installedStore.refresh()"
        >
          Refresh
        </button>
      </header>

      <app-package-search-input
        [value]="installedStore.query()"
        (valueChange)="installedStore.setQuery($event)"
      />

      <app-package-filter-chips
        [selected]="installedStore.kindFilter()"
        [options]="filterOptions"
        (selectedChange)="onFilterChange($event)"
      />

      @if (installedStore.loading()) {
        <app-loading-state label="Loading installed formulae and casks…" />
      } @else if (installedStore.error()) {
        <app-empty-state label="Load failed" [description]="installedStore.error() ?? ''" />
      } @else if (installedStore.filteredItems().length === 0) {
        <app-empty-state
          label="No installed packages"
          description="No packages match the current search and filter."
        />
      } @else {
        <div class="stagger-list space-y-1.5">
          @for (item of installedStore.filteredItems(); track item.id) {
            <app-package-row
              [name]="item.name"
              [kind]="item.kind"
              [desc]="item.desc"
              [installedVersion]="item.installedVersion"
              [currentVersion]="item.currentVersion"
              [tap]="item.tap"
              [actionLabel]="'Uninstall'"
              [actionDisabled]="uninstallBusy()"
              [actionVariant]="'secondary'"
              (action)="openUninstallDialog(item)"
            />
          }
        </div>
      }
    </section>

    <app-uninstall-confirm-dialog
      [open]="uninstallConfirmOpen()"
      [title]="uninstallDialogTitle()"
      [message]="uninstallDialogMessage()"
      [commandPreview]="uninstallCommandPreview()"
      [kind]="selectedPackage()?.kind ?? null"
      [zapSelected]="zapSelected()"
      [busy]="uninstallBusy()"
      (cancel)="closeUninstallDialog()"
      (confirm)="confirmUninstall()"
      (zapSelectedChange)="onZapSelectedChange($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstalledPackagesViewComponent {
  protected readonly installedStore = inject(InstalledStore);
  protected readonly updatesStore = inject(UpdatesStore);
  protected readonly catalogStore = inject(CatalogStore);
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
  protected readonly uninstallConfirmOpen = computed(() => Boolean(this.selectedPackage()));
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

  protected onFilterChange(value: string): void {
    this.installedStore.setKindFilter(value as 'all' | 'formula' | 'cask');
  }

  protected openUninstallDialog(item: InstalledPackage): void {
    if (this.uninstallBusy()) {
      return;
    }

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
}
