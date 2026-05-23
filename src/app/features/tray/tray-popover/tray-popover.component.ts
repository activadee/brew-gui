import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardSegmentedComponent, type SegmentedOption } from '@/shared/components/segmented';
import { ConnectionStatusPillComponent } from '../../../components/polish/connection-status-pill/connection-status-pill.component';
import { BrewFacadeService } from '../../../core/services/brew-facade.service';
import { AppStatusStore } from '../../../core/stores/app-status.store';
import { SettingsStore } from '../../../core/stores/settings.store';
import { UpdatesStore } from '../../../core/stores/updates.store';

@Component({
  selector: 'app-tray-popover',
  imports: [FormsModule, ZardButtonComponent, ZardSegmentedComponent, ConnectionStatusPillComponent],
  templateUrl: './tray-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tray-popover.component.css',
})
export class TrayPopoverComponent {
  protected readonly updatesStore = inject(UpdatesStore);
  protected readonly settingsStore = inject(SettingsStore);
  protected readonly appStatusStore = inject(AppStatusStore);
  private readonly destroyRef = inject(DestroyRef);

  private readonly facade = inject(BrewFacadeService);

  protected readonly intervalOptions: SegmentedOption[] = [
    { value: '60', label: '1h' },
    { value: '360', label: '6h' },
    { value: '1440', label: '24h' },
  ];

  protected readonly lastCheckTime = computed(() => {
    const checkedAt = this.updatesStore.lastCheckedAt();
    if (!checkedAt) {
      return '—:—:—';
    }

    const date = new Date(checkedAt);
    if (Number.isNaN(date.getTime())) {
      return '—:—:—';
    }

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  });

  constructor() {
    void this.settingsStore.load();
    void this.updatesStore.refresh();
    void this.appStatusStore.initialize();

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

  protected async checkNow(): Promise<void> {
    await this.updatesStore.checkNow();
  }

  protected async openMain(): Promise<void> {
    await this.facade.openMainWindow();
  }
}
