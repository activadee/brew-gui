import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';

import { BrewFacadeService } from '../../core/services/brew-facade.service';
import { SettingsStore } from '../../core/stores/settings.store';
import { UpdatesStore } from '../../core/stores/updates.store';

@Component({
  selector: 'app-tray-popover',
  template: `
    <main class="h-full bg-[var(--bg-panel)] p-3">
      <section class="card-surface panel-reveal glass-edge flex h-full flex-col gap-4 p-4">
        <header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">Brew Sidebar</h2>
          <span class="pulse-badge mono rounded-full border border-[var(--accent)] bg-white px-2 py-0.5 text-xs text-[var(--accent)]">
            {{ updatesStore.updateCount() }}
          </span>
        </header>

        <p class="text-sm text-[var(--text-muted)]">
          @if (updatesStore.updateCount() > 0) {
            {{ updatesStore.updateCount() }} updates are available.
          } @else {
            No updates currently pending.
          }
        </p>

        <label class="space-y-1 text-sm">
          <span class="text-[var(--text-main)]">Check interval</span>
          <select class="field-ui px-2 py-1" [value]="settingsStore.settings().checkIntervalMinutes" (change)="onIntervalChange($event)">
            <option value="60">Every 1 hour</option>
            <option value="360">Every 6 hours</option>
            <option value="1440">Every 24 hours</option>
          </select>
        </label>

        <div class="mt-auto flex gap-2">
          <button type="button" class="btn-ui btn-ui-ghost" (click)="updatesStore.checkNow()">Check now</button>
          <button type="button" class="btn-ui btn-ui-primary" (click)="openMain()">Open app</button>
        </div>
      </section>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrayPopoverComponent {
  protected readonly updatesStore = inject(UpdatesStore);
  protected readonly settingsStore = inject(SettingsStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly facade = inject(BrewFacadeService);

  constructor() {
    void this.settingsStore.load();
    void this.updatesStore.refresh();

    const unsubscribe = this.facade.onUpdatesChanged((event) => {
      this.updatesStore.setExternalUpdate(event);
      void this.updatesStore.refresh();
    });

    this.destroyRef.onDestroy(() => unsubscribe());
  }

  protected async onIntervalChange(event: Event): Promise<void> {
    const value = Number((event.target as HTMLSelectElement).value) as 60 | 360 | 1440;
    await this.settingsStore.update({ checkIntervalMinutes: value });
  }

  protected async openMain(): Promise<void> {
    await this.facade.openMainWindow();
  }
}
