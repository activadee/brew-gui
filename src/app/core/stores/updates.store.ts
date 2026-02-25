import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type {
  OutdatedPackage,
  PackageKind,
  PinOneRequest,
  UnpinOneRequest,
  UpdatesChangedEvent,
  UpgradeOneRequest
} from '../../../shared/contracts';
import { BrewFacadeService } from '../services/brew-facade.service';

type KindFilter = 'all' | PackageKind;
type PinFilter = 'all' | 'pinned' | 'unpinned';

interface UpdatesState {
  items: OutdatedPackage[];
  loading: boolean;
  error: string | null;
  query: string;
  kindFilter: KindFilter;
  pinFilter: PinFilter;
  lastCheckedAt: string | null;
  upgrading: boolean;
  pinning: boolean;
}

const initialState: UpdatesState = {
  items: [],
  loading: false,
  error: null,
  query: '',
  kindFilter: 'all',
  pinFilter: 'all',
  lastCheckedAt: null,
  upgrading: false,
  pinning: false
};

export const UpdatesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    updateCount: computed(() => store.items().length),
    pinnedCount: computed(() => store.items().filter((item) => item.pinned).length),
    unpinnedCount: computed(() => store.items().filter((item) => !item.pinned).length),
    filteredItems: computed(() => {
      const query = store.query().trim().toLocaleLowerCase();
      const kindFilter = store.kindFilter();
      const pinFilter = store.pinFilter();

      return store.items().filter((item) => {
        if (kindFilter !== 'all' && item.kind !== kindFilter) {
          return false;
        }

        if (pinFilter === 'pinned' && !item.pinned) {
          return false;
        }

        if (pinFilter === 'unpinned' && item.pinned) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [item.name, item.currentVersion, item.installedVersions.join(' ')].some((field) =>
          field.toLocaleLowerCase().includes(query)
        );
      });
    })
  })),
  withMethods(
    (store, facade = inject(BrewFacadeService)) => ({
      setQuery(query: string): void {
        patchState(store, { query });
      },

      setKindFilter(kindFilter: KindFilter): void {
        patchState(store, { kindFilter });
      },

      setPinFilter(pinFilter: PinFilter): void {
        patchState(store, { pinFilter });
      },

      setExternalUpdate(event: UpdatesChangedEvent): void {
        patchState(store, { lastCheckedAt: event.checkedAt });
      },

      async refresh(): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          const items = await facade.getOutdated();
          patchState(store, {
            items,
            loading: false,
            lastCheckedAt: new Date().toISOString()
          });
        } catch (error) {
          patchState(store, {
            loading: false,
            error: (error as Error).message
          });
        }
      },

      async checkNow(): Promise<void> {
        patchState(store, { loading: true, error: null });

        try {
          const result = await facade.checkNow();
          const items = await facade.getOutdated();

          patchState(store, {
            items,
            loading: false,
            lastCheckedAt: result.checkedAt
          });
        } catch (error) {
          patchState(store, {
            loading: false,
            error: (error as Error).message
          });
        }
      },

      async upgradeOne(payload: UpgradeOneRequest): Promise<boolean> {
        patchState(store, { upgrading: true, error: null });

        try {
          await facade.upgradeOne(payload);
          await this.refresh();
          return true;
        } catch (error) {
          patchState(store, { error: (error as Error).message });
          return false;
        } finally {
          patchState(store, { upgrading: false });
        }
      },

      async upgradeAll(): Promise<boolean> {
        patchState(store, { upgrading: true, error: null });

        try {
          await facade.upgradeAll();
          await this.refresh();
          return true;
        } catch (error) {
          patchState(store, { error: (error as Error).message });
          return false;
        } finally {
          patchState(store, { upgrading: false });
        }
      },

      async pinOne(payload: PinOneRequest): Promise<boolean> {
        patchState(store, { pinning: true, error: null });

        try {
          const result = await facade.pinOne(payload);
          if (!result.success) {
            patchState(store, { error: result.output || 'Pin command failed' });
            return false;
          }

          await this.refresh();
          return true;
        } catch (error) {
          patchState(store, { error: (error as Error).message });
          return false;
        } finally {
          patchState(store, { pinning: false });
        }
      },

      async unpinOne(payload: UnpinOneRequest): Promise<boolean> {
        patchState(store, { pinning: true, error: null });

        try {
          const result = await facade.unpinOne(payload);
          if (!result.success) {
            patchState(store, { error: result.output || 'Unpin command failed' });
            return false;
          }

          await this.refresh();
          return true;
        } catch (error) {
          patchState(store, { error: (error as Error).message });
          return false;
        } finally {
          patchState(store, { pinning: false });
        }
      }
    })
  )
);
