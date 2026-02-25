import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { SettingsStore } from '../../core/stores/settings.store';

@Component({
  selector: 'app-settings-view',
  imports: [ReactiveFormsModule],
  template: `
    <section class="ui-shell-enter space-y-4">
      <header>
        <h2 class="text-lg font-semibold">Settings</h2>
        <p class="mt-1 text-sm text-[var(--text-muted)]">Tray notifications and scheduler preferences.</p>
      </header>

      <form [formGroup]="form" class="card-surface panel-reveal space-y-4 p-4" (ngSubmit)="save()">
        <label class="block space-y-1">
          <span class="text-sm font-medium">Update check interval</span>
          <select
            formControlName="checkIntervalMinutes"
            class="field-ui px-3 py-2 text-sm"
          >
            <option [ngValue]="60">Every 1 hour</option>
            <option [ngValue]="360">Every 6 hours</option>
            <option [ngValue]="1440">Every 24 hours</option>
          </select>
        </label>

        <label class="flex items-center justify-between gap-3 text-sm">
          <span>Check on launch</span>
          <input type="checkbox" formControlName="autoCheckOnLaunch" class="h-4 w-4" />
        </label>

        <label class="flex items-center justify-between gap-3 text-sm">
          <span>Notify from tray when updates exist</span>
          <input type="checkbox" formControlName="trayNotifyOnUpdates" class="h-4 w-4" />
        </label>

        <label class="block space-y-1">
          <span class="text-sm font-medium">Default view</span>
          <select formControlName="defaultView" class="field-ui px-3 py-2 text-sm">
            <option value="updates">Updates</option>
            <option value="installed">Installed</option>
            <option value="browse">Browse</option>
          </select>
        </label>

        <div class="flex items-center justify-end gap-2">
          <button type="button" class="btn-ui btn-ui-ghost" (click)="resetForm()">
            Reset
          </button>
          <button
            type="submit"
            class="btn-ui btn-ui-primary"
            [disabled]="settingsStore.saving()"
          >
            {{ settingsStore.saving() ? 'Saving…' : 'Save settings' }}
          </button>
        </div>
      </form>

      @if (settingsStore.error()) {
        <p class="text-sm text-[var(--danger)]">{{ settingsStore.error() }}</p>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SettingsViewComponent {
  protected readonly settingsStore = inject(SettingsStore);

  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly form = this.fb.group({
    checkIntervalMinutes: 360 as 60 | 360 | 1440,
    autoCheckOnLaunch: true,
    trayNotifyOnUpdates: true,
    defaultView: 'updates' as 'updates' | 'installed' | 'browse'
  });

  constructor() {
    effect(() => {
      const settings = this.settingsStore.settings();
      this.form.patchValue(settings, { emitEvent: false });
    });
  }

  protected async save(): Promise<void> {
    const value = this.form.getRawValue();
    await this.settingsStore.update(value);
  }

  protected resetForm(): void {
    this.form.patchValue(this.settingsStore.settings());
  }
}
