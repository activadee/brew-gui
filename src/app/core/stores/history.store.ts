import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type {
  HistoryListResponse,
  HistoryStats,
  JobHistoryRecord
} from '../../../shared/contracts';
import { BrewFacadeService } from '../services/brew-facade.service';

interface HistoryState {
  items: JobHistoryRecord[];
  total: number;
  page: number;
  pageSize: number;
  stats: HistoryStats | null;
  loading: boolean;
  error: string | null;
}

const initialState: HistoryState = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 50,
  stats: null,
  loading: false,
  error: null
};

export const HistoryStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    successRatePercent: computed(() => Math.round((store.stats()?.successRate ?? 0) * 100))
  })),
  withMethods((store, facade = inject(BrewFacadeService)) => ({
    async load(page = 1): Promise<void> {
      patchState(store, { loading: true, error: null, page });

      try {
        const [list, stats] = await Promise.all([
          facade.listHistory({ page, pageSize: store.pageSize() }),
          facade.getHistoryStats()
        ]);

        patchState(store, {
          items: list.items,
          total: list.total,
          stats,
          loading: false
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

export type HistoryStoreInstance = InstanceType<typeof HistoryStore>;
