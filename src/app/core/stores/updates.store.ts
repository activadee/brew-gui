import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type {
  OutdatedPackage,
  PackageKind,
  UpdatesChangedEvent,
  UpgradeOneRequest
} from '../../../shared/contracts';
import { BrewFacadeService } from '../services/brew-facade.service';
import { JobsStore } from './jobs.store';

type KindFilter = 'all' | PackageKind;

interface UpdatesState {
  items: OutdatedPackage[];
  loading: boolean;
  error: string | null;
  query: string;
  kindFilter: KindFilter;
  lastCheckedAt: string | null;
  upgrading: boolean;
}

const initialState: UpdatesState = {
  items: [],
  loading: false,
  error: null,
  query: '',
  kindFilter: 'all',
  lastCheckedAt: null,
  upgrading: false
};

export const UpdatesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    updateCount: computed(() => store.items().length),
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

        return [item.name, item.currentVersion, item.installedVersions.join(' ')].some((field) =>
          field.toLocaleLowerCase().includes(query)
        );
      });
    })
  })),
  withMethods(
    (store, facade = inject(BrewFacadeService), jobsStore = inject(JobsStore)) => ({
      setQuery(query: string): void {
        patchState(store, { query });
      },

      setKindFilter(kindFilter: KindFilter): void {
        patchState(store, { kindFilter });
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

      async upgradeOne(payload: UpgradeOneRequest): Promise<void> {
        patchState(store, { upgrading: true, error: null });

        try {
          await facade.upgradeOne(payload);
          await this.refresh();
        } catch (error) {
          jobsStore.markFailed({
            jobId: crypto.randomUUID(),
            error: (error as Error).message,
            output: '',
            timestamp: new Date().toISOString()
          });
          patchState(store, { error: (error as Error).message });
        } finally {
          patchState(store, { upgrading: false });
        }
      },

      async upgradeAll(): Promise<void> {
        patchState(store, { upgrading: true, error: null });

        try {
          await facade.upgradeAll();
          await this.refresh();
        } catch (error) {
          jobsStore.markFailed({
            jobId: crypto.randomUUID(),
            error: (error as Error).message,
            output: '',
            timestamp: new Date().toISOString()
          });
          patchState(store, { error: (error as Error).message });
        } finally {
          patchState(store, { upgrading: false });
        }
      }
    })
  )
);
