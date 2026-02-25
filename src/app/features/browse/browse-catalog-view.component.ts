import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import type { CatalogPackage } from '../../../shared/contracts';
import { EmptyStateComponent } from '../../components/foundation/empty-state.component';
import { LoadingStateComponent } from '../../components/foundation/loading-state.component';
import { PackageFilterChipsComponent } from '../../components/shared/package-filter-chips.component';
import { PackageRowComponent } from '../../components/shared/package-row.component';
import { PackageSearchInputComponent } from '../../components/shared/package-search-input.component';
import { UpgradeConfirmDialogComponent } from '../../components/ux/upgrade-confirm-dialog.component';
import { BrewFacadeService } from '../../core/services/brew-facade.service';
import { ToastService } from '../../core/services/toast.service';
import { CatalogStore } from '../../core/stores/catalog.store';
import { InstalledStore } from '../../core/stores/installed.store';
import { UpdatesStore } from '../../core/stores/updates.store';

@Component({
  selector: 'app-browse-catalog-view',
  imports: [
    ZardButtonComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    PackageFilterChipsComponent,
    PackageRowComponent,
    PackageSearchInputComponent,
    UpgradeConfirmDialogComponent
  ],
  template: `
    <section class="ui-shell-enter space-y-2">
      <header class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">Browse Homebrew Catalog</h2>
        <button
          type="button"
          z-button
          zType="outline"
          zSize="sm"
          (click)="catalogStore.refresh(true)"
        >
          Refresh Catalog
        </button>
      </header>

      <app-package-search-input
        [value]="catalogStore.query()"
        placeholder="Search formulae and casks"
        (valueChange)="onQueryChange($event)"
      />

      <app-package-filter-chips
        [selected]="catalogStore.kindFilter()"
        [options]="filterOptions"
        (selectedChange)="onKindChange($event)"
      />

      <div class="flex items-center justify-between text-xs text-muted-foreground mono">
        <span>Total {{ catalogStore.total() }}</span>
        <span>
          Source {{ catalogStore.source() }}
          @if (catalogStore.stale()) {
            <strong class="text-destructive">(stale cache)</strong>
          }
        </span>
      </div>

      @if (catalogStore.loading()) {
        <app-loading-state label="Loading catalog…" />
      } @else if (catalogStore.error()) {
        <app-empty-state label="Catalog unavailable" [description]="catalogStore.error() ?? ''" />
      } @else if (catalogStore.items().length === 0) {
        <app-empty-state label="No catalog results" description="Try a broader query." />
      } @else {
        <div class="stagger-list space-y-1.5">
          @for (item of catalogStore.items(); track item.id) {
            <app-package-row
              [name]="item.name"
              [kind]="item.kind"
              [desc]="packageDescription(item)"
              [currentVersion]="item.version"
              [tap]="item.tap"
              [actionLabel]="installActionLabel(item)"
              [actionDisabled]="installActionDisabled(item) || installBusy()"
              [actionVariant]="installActionVariant(item)"
              (action)="openInstallDialog(item)"
            />
          }
        </div>
      }

      <footer class="flex items-center justify-end gap-2">
        <button
          type="button"
          z-button
          zType="outline"
          zSize="sm"
          [zDisabled]="!catalogStore.hasPreviousPage()"
          (click)="catalogStore.previousPage()"
        >
          Previous
        </button>
        <button
          type="button"
          z-button
          zType="outline"
          zSize="sm"
          [zDisabled]="!catalogStore.hasNextPage()"
          (click)="catalogStore.nextPage()"
        >
          Next
        </button>
      </footer>
    </section>

    <app-upgrade-confirm-dialog
      [open]="installConfirmOpen()"
      [title]="installDialogTitle()"
      [message]="installDialogMessage()"
      [commandPreview]="installCommandPreview()"
      [confirmLabel]="'Install package'"
      [busy]="installBusy()"
      (cancel)="closeInstallDialog()"
      (confirm)="confirmInstall()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrowseCatalogViewComponent {
  protected readonly catalogStore = inject(CatalogStore);
  protected readonly installedStore = inject(InstalledStore);
  protected readonly updatesStore = inject(UpdatesStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly facade = inject(BrewFacadeService);
  private readonly toast = inject(ToastService);

  protected readonly filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'formula', label: 'Formulae' },
    { value: 'cask', label: 'Casks' }
  ];

  private readonly installTarget = signal<CatalogPackage | null>(null);
  protected readonly installBusy = signal(false);
  protected readonly installConfirmOpen = computed(() => Boolean(this.installTarget()));
  protected readonly installDialogTitle = computed(() =>
    this.installTarget() ? `Install ${this.installTarget()!.name}?` : 'Install package?'
  );
  protected readonly installDialogMessage = computed(() =>
    this.installTarget()
      ? 'This will run Homebrew install for the selected package.'
      : 'This will run Homebrew install.'
  );
  protected readonly installCommandPreview = computed(() => {
    const target = this.installTarget();
    if (!target) {
      return null;
    }

    return target.kind === 'formula'
      ? `brew install --formula ${target.name}`
      : `brew install --cask ${target.name}`;
  });

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }
    });
  }

  protected onQueryChange(query: string): void {
    this.catalogStore.setQuery(query);

    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }

    this.searchTimeout = setTimeout(() => {
      void this.catalogStore.refresh();
    }, 220);
  }

  protected onKindChange(kind: string): void {
    this.catalogStore.setKindFilter(kind as 'all' | 'formula' | 'cask');
    void this.catalogStore.refresh();
  }

  protected packageDescription(item: CatalogPackage): string | null {
    const badges: string[] = [];
    if (item.deprecated) {
      badges.push('Deprecated');
    }
    if (item.disabled) {
      badges.push('Disabled');
    }

    const prefix = badges.length > 0 ? `[${badges.join(' • ')}] ` : '';
    const desc = item.desc ?? '';
    const combined = `${prefix}${desc}`.trim();
    return combined || null;
  }

  protected installActionLabel(item: CatalogPackage): string {
    if (this.isInstalled(item)) {
      return 'Installed';
    }
    if (item.disabled) {
      return 'Disabled';
    }
    return 'Install';
  }

  protected installActionVariant(item: CatalogPackage): 'primary' | 'secondary' {
    return this.canInstall(item) ? 'primary' : 'secondary';
  }

  protected installActionDisabled(item: CatalogPackage): boolean {
    return !this.canInstall(item);
  }

  protected openInstallDialog(item: CatalogPackage): void {
    if (!this.canInstall(item) || this.installBusy()) {
      return;
    }

    this.installTarget.set(item);
  }

  protected closeInstallDialog(): void {
    if (this.installBusy()) {
      return;
    }

    this.installTarget.set(null);
  }

  protected async confirmInstall(): Promise<void> {
    const target = this.installTarget();
    if (!target) {
      return;
    }

    this.installBusy.set(true);
    try {
      await this.facade.installOne({ kind: target.kind, name: target.name });
      await Promise.all([
        this.installedStore.refresh(),
        this.updatesStore.refresh(),
        this.catalogStore.refresh()
      ]);
      this.toast.push(`Installed ${target.name}.`, 'success');
      this.installTarget.set(null);
    } catch {
      // Error toasts are handled by the global job-failed event bridge.
    } finally {
      this.installBusy.set(false);
    }
  }

  private isInstalled(item: CatalogPackage): boolean {
    return this.installedStore.installedIdSet().has(item.id);
  }

  private canInstall(item: CatalogPackage): boolean {
    if (item.disabled) {
      return false;
    }

    return !this.isInstalled(item);
  }
}
