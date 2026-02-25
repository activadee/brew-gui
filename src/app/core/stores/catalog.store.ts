import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { CatalogPackage, PackageKind } from '../../../shared/contracts';
import { BrewFacadeService } from '../services/brew-facade.service';

type KindFilter = 'all' | PackageKind;

interface CatalogState {
  items: CatalogPackage[];
  loading: boolean;
  error: string | null;
  query: string;
  kindFilter: KindFilter;
  page: number;
  pageSize: number;
  total: number;
  stale: boolean;
  source: 'network' | 'cache';
  lastUpdatedAt: string | null;
}

const initialState: CatalogState = {
  items: [],
  loading: false,
  error: null,
  query: '',
  kindFilter: 'all',
  page: 1,
  pageSize: 50,
  total: 0,
  stale: false,
  source: 'cache',
  lastUpdatedAt: null
};

const kindFilterToKinds = (kindFilter: KindFilter): PackageKind[] =>
  kindFilter === 'all' ? ['formula', 'cask'] : [kindFilter];

export const CatalogStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    hasNextPage: computed(() => store.page() * store.pageSize() < store.total()),
    hasPreviousPage: computed(() => store.page() > 1)
  })),
  withMethods((store, facade = inject(BrewFacadeService)) => ({
    setQuery(query: string): void {
      patchState(store, { query, page: 1 });
    },

    setKindFilter(kindFilter: KindFilter): void {
      patchState(store, { kindFilter, page: 1 });
    },

    async refresh(refreshRemote = false): Promise<void> {
      patchState(store, { loading: true, error: null });

      try {
        const response = await facade.searchCatalog({
          query: store.query(),
          kinds: kindFilterToKinds(store.kindFilter()),
          page: store.page(),
          pageSize: store.pageSize(),
          refresh: refreshRemote
        });

        patchState(store, {
          items: response.items,
          total: response.total,
          stale: response.stale,
          source: response.source,
          lastUpdatedAt: response.lastUpdatedAt,
          loading: false
        });
      } catch (error) {
        patchState(store, {
          loading: false,
          error: (error as Error).message
        });
      }
    },

    async nextPage(): Promise<void> {
      if (store.page() * store.pageSize() >= store.total()) {
        return;
      }

      patchState(store, { page: store.page() + 1 });
      await this.refresh();
    },

    async previousPage(): Promise<void> {
      if (store.page() <= 1) {
        return;
      }

      patchState(store, { page: store.page() - 1 });
      await this.refresh();
    }
  }))
);
