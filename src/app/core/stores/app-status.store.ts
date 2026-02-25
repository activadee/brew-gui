import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

import type { BrewAvailability, UpdatesChangedEvent } from '../../../shared/contracts';
import { BrewFacadeService } from '../services/brew-facade.service';

interface AppStatusState {
  availability: BrewAvailability | null;
  updatesCount: number;
  lastCheckedAt: string | null;
  initializing: boolean;
  error: string | null;
}

const initialState: AppStatusState = {
  availability: null,
  updatesCount: 0,
  lastCheckedAt: null,
  initializing: false,
  error: null
};

export const AppStatusStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, facade = inject(BrewFacadeService)) => ({
    async initialize(): Promise<void> {
      patchState(store, { initializing: true, error: null });

      try {
        const availability = await facade.getAvailability();
        patchState(store, {
          availability,
          initializing: false
        });
      } catch (error) {
        patchState(store, {
          initializing: false,
          error: (error as Error).message
        });
      }
    },

    applyUpdatesChanged(event: UpdatesChangedEvent): void {
      patchState(store, {
        updatesCount: event.count,
        lastCheckedAt: event.checkedAt
      });
    }
  }))
);
