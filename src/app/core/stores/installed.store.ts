import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { InstalledPackage, PackageKind } from '../../../shared/contracts';
import { BrewFacadeService } from '../services/brew-facade.service';

type KindFilter = 'all' | PackageKind;

interface InstalledState {
  items: InstalledPackage[];
  loading: boolean;
  error: string | null;
  query: string;
  kindFilter: KindFilter;
  lastRefreshedAt: string | null;
}

const initialState: InstalledState = {
  items: [],
  loading: false,
  error: null,
  query: '',
  kindFilter: 'all',
  lastRefreshedAt: null
};

export const InstalledStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    totalCount: computed(() => store.items().length),
    formulaCount: computed(() => store.items().filter((item) => item.kind === 'formula').length),
    caskCount: computed(() => store.items().filter((item) => item.kind === 'cask').length),
    filteredItems: computed(() => {
      const query = store.query().trim().toLocaleLowerCase();
      const kindFilter = store.kindFilter();

      return store.items().filter((item) => {
        if (kindFilter !== 'all' && item.kind !== kindFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [item.name, item.desc ?? '', item.installedVersion].some((field) =>
          field.toLocaleLowerCase().includes(query)
        );
      });
    })
  })),
  withMethods((store, facade = inject(BrewFacadeService)) => ({
    setQuery(query: string): void {
      patchState(store, { query });
    },

    setKindFilter(kindFilter: KindFilter): void {
      patchState(store, { kindFilter });
    },

    async refresh(): Promise<void> {
      patchState(store, { loading: true, error: null });

      try {
        const items = await facade.getInstalled();
        patchState(store, {
          items,
          loading: false,
          lastRefreshedAt: new Date().toISOString()
        });
      } catch (error) {
        patchState(store, {
          loading: false,
          error: (error as Error).message
        });
      }
    }
  }))
);
