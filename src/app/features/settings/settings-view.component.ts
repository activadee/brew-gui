import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';
import { ZardSegmentedComponent, type SegmentedOption } from '@/shared/components/segmented';
import { ZardSwitchComponent } from '@/shared/components/switch';
import { SettingsStore } from '../../core/stores/settings.store';

@Component({
  selector: 'app-settings-view',
  imports: [
    ReactiveFormsModule,
    ZardCardComponent,
    ZardButtonComponent,
    ZardBadgeComponent,
    ZardDividerComponent,
    ZardSegmentedComponent,
    ZardSwitchComponent
  ],
  template: `
    <section class="ui-shell-enter space-y-2">
      <header class="flex items-center justify-between gap-2">
        <div>
          <h2 class="text-lg font-semibold">Settings</h2>
          <p class="mt-1 text-sm text-muted-foreground">
            Notification and refresh behavior for the Brew Sidebar background agent.
          </p>
        </div>
        <z-badge zType="outline" zShape="pill">Preferences</z-badge>
      </header>

      <form [formGroup]="form" (ngSubmit)="save()">
        <z-card class="space-y-3 border-border/70 bg-card/95 shadow-sm">
          <div class="space-y-1.5">
            <p class="text-sm font-medium">Check interval</p>
            <z-segmented
              zSize="sm"
              [zOptions]="intervalOptions"
              formControlName="checkIntervalMinutes"
              zAriaLabel="Update check interval"
            />
          </div>

          <z-divider zSpacing="sm" />

          <div class="space-y-2">
            <z-switch formControlName="autoCheckOnLaunch">Check for updates on launch</z-switch>
            <z-switch formControlName="trayNotifyOnUpdates">Show tray badge when updates exist</z-switch>
          </div>

          <z-divider zSpacing="sm" />

          <div class="space-y-1.5">
            <p class="text-sm font-medium">Default view</p>
            <z-segmented
              zSize="sm"
              [zOptions]="defaultViewOptions"
              formControlName="defaultView"
              zAriaLabel="Default startup view"
            />
          </div>

          <div class="flex items-center justify-end gap-2 pt-1">
            <button type="button" z-button zType="outline" zSize="sm" [zDisabled]="settingsStore.saving()" (click)="resetForm()">
              Reset
            </button>
            <button type="submit" z-button zSize="sm" [zDisabled]="settingsStore.saving()">
              {{ settingsStore.saving() ? 'Saving…' : 'Save settings' }}
            </button>
          </div>
        </z-card>
      </form>

      @if (settingsStore.error()) {
        <p class="text-sm text-destructive">{{ settingsStore.error() }}</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
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
      defaultView: value.defaultView
    });
  }

  protected resetForm(): void {
    const settings = this.settingsStore.settings();
    this.form.patchValue({
      checkIntervalMinutes: String(settings.checkIntervalMinutes) as '60' | '360' | '1440',
      autoCheckOnLaunch: settings.autoCheckOnLaunch,
      trayNotifyOnUpdates: settings.trayNotifyOnUpdates,
      defaultView: settings.defaultView
    });
  }
}
