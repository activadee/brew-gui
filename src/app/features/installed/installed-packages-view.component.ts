import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { EmptyStateComponent } from '../../components/foundation/empty-state.component';
import { LoadingStateComponent } from '../../components/foundation/loading-state.component';
import { PackageFilterChipsComponent } from '../../components/shared/package-filter-chips.component';
import { PackageRowComponent } from '../../components/shared/package-row.component';
import { PackageSearchInputComponent } from '../../components/shared/package-search-input.component';
import { InstalledStore } from '../../core/stores/installed.store';

@Component({
  selector: 'app-installed-packages-view',
  imports: [
    EmptyStateComponent,
    LoadingStateComponent,
    PackageFilterChipsComponent,
    PackageRowComponent,
    PackageSearchInputComponent
  ],
  template: `
    <section class="ui-shell-enter space-y-3">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">Installed Packages</h2>
        <button
          type="button"
          class="btn-ui btn-ui-ghost"
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
        <div class="stagger-list space-y-2">
          @for (item of installedStore.filteredItems(); track item.id) {
            <app-package-row
              [name]="item.name"
              [kind]="item.kind"
              [desc]="item.desc"
              [installedVersion]="item.installedVersion"
              [currentVersion]="item.currentVersion"
              [tap]="item.tap"
            />
          }
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InstalledPackagesViewComponent {
  protected readonly installedStore = inject(InstalledStore);

  protected readonly filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'formula', label: 'Formulae' },
    { value: 'cask', label: 'Casks' }
  ];

  protected onFilterChange(value: string): void {
    this.installedStore.setKindFilter(value as 'all' | 'formula' | 'cask');
  }
}
