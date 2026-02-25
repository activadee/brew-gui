import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardSegmentedComponent, type SegmentedOption } from '@/shared/components/segmented';
import { BrewFacadeService } from '../../core/services/brew-facade.service';
import { SettingsStore } from '../../core/stores/settings.store';
import { UpdatesStore } from '../../core/stores/updates.store';

@Component({
  selector: 'app-tray-popover',
  imports: [FormsModule, ZardCardComponent, ZardBadgeComponent, ZardButtonComponent, ZardSegmentedComponent],
  template: `
    <main class="h-full p-2">
      <z-card class="flex h-full flex-col gap-3 border-border/70 bg-card/95 shadow-xl">
        <header class="flex items-center justify-between">
          <h2 class="text-base font-semibold">Brew Sidebar</h2>
          <z-badge zType="secondary" zShape="pill">{{ updatesStore.updateCount() }}</z-badge>
        </header>

        <p class="text-sm text-muted-foreground">
          @if (updatesStore.updateCount() > 0) {
            {{ updatesStore.updateCount() }} updates are available.
          } @else {
            No updates currently pending.
          }
        </p>

        <section class="space-y-1.5">
          <p class="text-sm font-medium">Check interval</p>
          <z-segmented
            zSize="sm"
            [zOptions]="intervalOptions"
            [ngModel]="selectedInterval()"
            (ngModelChange)="onIntervalChange($event)"
            zAriaLabel="Tray check interval"
          />
        </section>

        <div class="mt-auto flex gap-1.5">
          <button type="button" z-button zType="outline" zSize="sm" (click)="updatesStore.checkNow()">
            Check now
          </button>
          <button type="button" z-button zSize="sm" (click)="openMain()">Open app</button>
        </div>
      </z-card>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TrayPopoverComponent {
  protected readonly updatesStore = inject(UpdatesStore);
  protected readonly settingsStore = inject(SettingsStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly facade = inject(BrewFacadeService);

  protected readonly intervalOptions: SegmentedOption[] = [
    { value: '60', label: '1h' },
    { value: '360', label: '6h' },
    { value: '1440', label: '24h' }
  ];

  constructor() {
    void this.settingsStore.load();
    void this.updatesStore.refresh();

    const unsubscribe = this.facade.onUpdatesChanged((event) => {
      this.updatesStore.setExternalUpdate(event);
      void this.updatesStore.refresh();
    });

    this.destroyRef.onDestroy(() => unsubscribe());
  }

  protected selectedInterval(): '60' | '360' | '1440' {
    return String(this.settingsStore.settings().checkIntervalMinutes) as '60' | '360' | '1440';
  }

  protected async onIntervalChange(value: string): Promise<void> {
    const parsed = Number(value) as 60 | 360 | 1440;
    if (Number.isNaN(parsed)) {
      return;
    }

    await this.settingsStore.update({ checkIntervalMinutes: parsed });
  }

  protected async openMain(): Promise<void> {
    await this.facade.openMainWindow();
  }
}
