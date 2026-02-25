import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';

import { EmptyStateComponent } from '../../components/foundation/empty-state.component';
import { LoadingStateComponent } from '../../components/foundation/loading-state.component';
import { PackageFilterChipsComponent } from '../../components/shared/package-filter-chips.component';
import { PackageRowComponent } from '../../components/shared/package-row.component';
import { PackageSearchInputComponent } from '../../components/shared/package-search-input.component';
import { CatalogStore } from '../../core/stores/catalog.store';

@Component({
  selector: 'app-browse-catalog-view',
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
        <h2 class="text-lg font-semibold">Browse Homebrew Catalog</h2>
        <button
          type="button"
          class="btn-ui btn-ui-ghost"
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

      <div class="flex items-center justify-between text-xs text-[var(--text-muted)] mono">
        <span>Total {{ catalogStore.total() }}</span>
        <span>
          Source {{ catalogStore.source() }}
          @if (catalogStore.stale()) {
            <strong class="text-[var(--danger)]">(stale cache)</strong>
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
        <div class="stagger-list space-y-2">
          @for (item of catalogStore.items(); track item.id) {
            <app-package-row
              [name]="item.name"
              [kind]="item.kind"
              [desc]="item.desc"
              [currentVersion]="item.version"
              [tap]="item.tap"
            />
          }
        </div>
      }

      <footer class="flex items-center justify-end gap-2">
        <button
          type="button"
          class="btn-ui btn-ui-ghost"
          [disabled]="!catalogStore.hasPreviousPage()"
          (click)="catalogStore.previousPage()"
        >
          Previous
        </button>
        <button
          type="button"
          class="btn-ui btn-ui-ghost"
          [disabled]="!catalogStore.hasNextPage()"
          (click)="catalogStore.nextPage()"
        >
          Next
        </button>
      </footer>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BrowseCatalogViewComponent {
  protected readonly catalogStore = inject(CatalogStore);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'formula', label: 'Formulae' },
    { value: 'cask', label: 'Casks' }
  ];

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
}
