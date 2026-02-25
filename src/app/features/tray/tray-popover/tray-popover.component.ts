import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardSegmentedComponent, type SegmentedOption } from '@/shared/components/segmented';
import { BrewFacadeService } from '../../../core/services/brew-facade.service';
import { SettingsStore } from '../../../core/stores/settings.store';
import { UpdatesStore } from '../../../core/stores/updates.store';

@Component({
  selector: 'app-tray-popover',
  imports: [FormsModule, ZardCardComponent, ZardBadgeComponent, ZardButtonComponent, ZardSegmentedComponent],
  templateUrl: './tray-popover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tray-popover.component.css',
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
