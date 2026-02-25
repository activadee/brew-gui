import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type {
  BrewJobCompleteEvent,
  BrewJobFailedEvent,
  BrewJobProgressEvent
} from '../../../shared/contracts';

interface JobsState {
  events: BrewJobProgressEvent[];
  currentJobId: string | null;
  latestComplete: BrewJobCompleteEvent | null;
  latestFailed: BrewJobFailedEvent | null;
  drawerOpen: boolean;
}

const initialState: JobsState = {
  events: [],
  currentJobId: null,
  latestComplete: null,
  latestFailed: null,
  drawerOpen: false
};

export const JobsStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    latestEvents: computed(() => store.events().slice(-200)),
    running: computed(() => Boolean(store.currentJobId()))
  })),
  withMethods((store) => ({
    pushProgress(event: BrewJobProgressEvent): void {
      patchState(store, {
        events: [...store.events(), event],
        currentJobId: event.jobId,
        drawerOpen: true,
        latestFailed: null
      });
    },

    markComplete(event: BrewJobCompleteEvent): void {
      patchState(store, {
        latestComplete: event,
        currentJobId: null,
        drawerOpen: true
      });
    },

    markFailed(event: BrewJobFailedEvent): void {
      patchState(store, {
        latestFailed: event,
        currentJobId: null,
        drawerOpen: true
      });
    },

    closeDrawer(): void {
      patchState(store, { drawerOpen: false });
    },

    clearHistory(): void {
      patchState(store, {
        events: [],
        latestComplete: null,
        latestFailed: null,
        drawerOpen: false,
        currentJobId: null
      });
    }
  }))
);
