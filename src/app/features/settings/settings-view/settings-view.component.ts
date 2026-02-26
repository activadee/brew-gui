import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardSegmentedComponent, type SegmentedOption } from '@/shared/components/segmented';
import { ZardSwitchComponent } from '@/shared/components/switch';
import { SettingsStore } from '../../../core/stores/settings.store';

@Component({
  selector: 'app-settings-view',
  imports: [
    ReactiveFormsModule,
    ZardCardComponent,
    ZardButtonComponent,
    ZardBadgeComponent,
    ZardDividerComponent,
    ZardInputDirective,
    ZardSegmentedComponent,
    ZardSwitchComponent
  ],
  templateUrl: './settings-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './settings-view.component.css',
})
export class SettingsViewComponent {
  protected readonly settingsStore = inject(SettingsStore);

  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly intervalOptions: SegmentedOption[] = [
    { value: '60', label: '1h' },
    { value: '360', label: '6h' },
    { value: '1440', label: '24h' }
  ];

  protected readonly defaultViewOptions: SegmentedOption[] = [
    { value: 'updates', label: 'Updates' },
    { value: 'installed', label: 'Installed' },
    { value: 'browse', label: 'Browse' }
  ];

  protected readonly form = this.fb.group({
    checkIntervalMinutes: '360' as '60' | '360' | '1440',
    autoCheckOnLaunch: true,
    trayNotifyOnUpdates: true,
    scheduledMetadataSyncEnabled: true,
    scheduledCleanupEnabled: false,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    defaultView: 'updates' as 'updates' | 'installed' | 'browse'
  });

  constructor() {
    effect(() => {
      const settings = this.settingsStore.settings();
      this.form.patchValue(
        {
          checkIntervalMinutes: String(settings.checkIntervalMinutes) as '60' | '360' | '1440',
          autoCheckOnLaunch: settings.autoCheckOnLaunch,
          trayNotifyOnUpdates: settings.trayNotifyOnUpdates,
          scheduledMetadataSyncEnabled: settings.scheduledMetadataSyncEnabled,
          scheduledCleanupEnabled: settings.scheduledCleanupEnabled,
          quietHoursEnabled: settings.quietHoursEnabled,
          quietHoursStart: settings.quietHoursStart,
          quietHoursEnd: settings.quietHoursEnd,
          defaultView: settings.defaultView
        },
        { emitEvent: false }
      );
    });
  }

  protected async save(): Promise<void> {
    const value = this.form.getRawValue();
    await this.settingsStore.update({
      checkIntervalMinutes: Number(value.checkIntervalMinutes) as 60 | 360 | 1440,
      autoCheckOnLaunch: value.autoCheckOnLaunch,
      trayNotifyOnUpdates: value.trayNotifyOnUpdates,
      scheduledMetadataSyncEnabled: value.scheduledMetadataSyncEnabled,
      scheduledCleanupEnabled: value.scheduledCleanupEnabled,
      quietHoursEnabled: value.quietHoursEnabled,
      quietHoursStart: value.quietHoursStart,
      quietHoursEnd: value.quietHoursEnd,
      defaultView: value.defaultView
    });
  }

  protected resetForm(): void {
    const settings = this.settingsStore.settings();
    this.form.patchValue({
      checkIntervalMinutes: String(settings.checkIntervalMinutes) as '60' | '360' | '1440',
      autoCheckOnLaunch: settings.autoCheckOnLaunch,
      trayNotifyOnUpdates: settings.trayNotifyOnUpdates,
      scheduledMetadataSyncEnabled: settings.scheduledMetadataSyncEnabled,
      scheduledCleanupEnabled: settings.scheduledCleanupEnabled,
      quietHoursEnabled: settings.quietHoursEnabled,
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd,
      defaultView: settings.defaultView
    });
  }
}
