import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { ZardAlertDialogService } from '@/shared/components/alert-dialog';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';
import { ZardIconComponent } from '@/shared/components/icon';
import { ZardInputDirective } from '@/shared/components/input';
import { ZardSegmentedComponent, type SegmentedOption } from '@/shared/components/segmented';
import { ZardSwitchComponent } from '@/shared/components/switch';
import type { ActionTemplateStep, AppSettings } from '../../../../shared/contracts';
import { ToastService } from '../../../core/services/toast.service';
import { PackageActionsService } from '../../../core/services/package-actions.service';
import { TemplatesStore } from '../../../core/stores/templates.store';
import { SettingsStore } from '../../../core/stores/settings.store';
import {
  SettingsSectionNavComponent,
  type SettingsSection
} from '../settings-section-nav/settings-section-nav.component';
import { SettingsSettingRowComponent } from '../settings-setting-row/settings-setting-row.component';

const STEP_OPTIONS: ActionTemplateStep['action'][] = ['install', 'pin', 'unpin', 'upgradeOne'];

@Component({
  selector: 'app-settings-view',
  imports: [
    DatePipe,
    ZardCardComponent,
    ZardButtonComponent,
    ZardDividerComponent,
    ZardInputDirective,
    ZardSegmentedComponent,
    ZardSwitchComponent,
    ZardIconComponent,
    SettingsSectionNavComponent,
    SettingsSettingRowComponent
  ],
  templateUrl: './settings-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './settings-view.component.css'
})
export class SettingsViewComponent {
  protected readonly settingsStore = inject(SettingsStore);
  protected readonly templatesStore = inject(TemplatesStore);
  private readonly packageActions = inject(PackageActionsService);
  private readonly alertDialog = inject(ZardAlertDialogService);
  private readonly toast = inject(ToastService);

  protected readonly sections: SettingsSection[] = [
    { id: 'general', label: 'General', icon: 'settings' },
    { id: 'brew', label: 'Brew & CLI', icon: 'terminal' },
    { id: 'notifications', label: 'Notifications', icon: 'bell' },
    { id: 'updates', label: 'Updates', icon: 'activity' },
    { id: 'privacy', label: 'Privacy', icon: 'shield' },
    { id: 'danger', label: 'Danger zone', icon: 'triangle-alert' }
  ];

  protected readonly stepOptions = STEP_OPTIONS;
  protected readonly editingTemplateId = signal<string | null>(null);
  protected readonly templateName = signal('New template');
  protected readonly templateSteps = signal<ActionTemplateStep[]>([{ action: 'install' }]);
  protected readonly templateError = signal<string | null>(null);

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

  constructor() {
    void this.templatesStore.load();

    effect(() => {
      const outcome = this.settingsStore.saveOutcome();
      const outcomeAt = this.settingsStore.saveOutcomeAt();
      if (!outcome || !outcomeAt) {
        return;
      }

      if (outcome === 'success') {
        this.toast.push('Settings saved', 'success', 2_000);
      } else {
        this.toast.push('Failed to save settings', 'error');
      }
    });
  }

  protected isSaving(key: keyof AppSettings): boolean {
    return this.settingsStore.savingKey() === key;
  }

  protected updateSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settingsStore.updateSetting(key, value);
  }

  protected onCheckIntervalChange(value: string): void {
    const parsed = Number(value);
    if (parsed === 60 || parsed === 360 || parsed === 1440) {
      this.updateSetting('checkIntervalMinutes', parsed);
    }
  }

  protected onDefaultViewChange(value: string): void {
    if (value === 'updates' || value === 'installed' || value === 'browse') {
      this.updateSetting('defaultView', value);
    }
  }

  protected onQuietHoursStartBlur(event: Event): void {
    const value = readInputValue(event);
    if (value) {
      this.updateSetting('quietHoursStart', value);
    }
  }

  protected onQuietHoursEndBlur(event: Event): void {
    const value = readInputValue(event);
    if (value) {
      this.updateSetting('quietHoursEnd', value);
    }
  }

  protected onTemplateNameInput(event: Event): void {
    this.templateName.set(readInputValue(event));
  }

  protected onStepActionChange(index: number, event: Event): void {
    const value = readSelectValue(event);
    if (value === 'install' || value === 'pin' || value === 'unpin' || value === 'upgradeOne') {
      this.updateStepAction(index, value);
    }
  }

  protected confirmResetSettings(): void {
    this.alertDialog.confirm({
      zTitle: 'Reset all settings?',
      zDescription:
        'This restores Brewdeck preferences to their defaults. Background check history and scheduler timestamps are not cleared.',
      zOkText: 'Reset settings',
      zOkDestructive: true,
      zOnOk: () => {
        void this.settingsStore.resetToDefaults();
      }
    });
  }

  protected confirmClearTemplates(): void {
    const templates = this.templatesStore.templates();
    if (templates.length === 0) {
      return;
    }

    this.alertDialog.confirm({
      zTitle: 'Delete all action templates?',
      zDescription: `This permanently removes ${templates.length} saved template${templates.length === 1 ? '' : 's'}.`,
      zOkText: 'Delete templates',
      zOkDestructive: true,
      zOnOk: () => {
        void this.clearAllTemplates();
      }
    });
  }

  protected startNewTemplate(): void {
    this.editingTemplateId.set(null);
    this.templateName.set('New template');
    this.templateSteps.set([{ action: 'install' }]);
    this.templateError.set(null);
  }

  protected editTemplate(id: string): void {
    const template = this.templatesStore.templates().find((item) => item.id === id);
    if (!template) {
      return;
    }
    this.editingTemplateId.set(id);
    this.templateName.set(template.name);
    this.templateSteps.set([...template.steps]);
    this.templateError.set(null);
  }

  protected addStep(): void {
    if (this.templateSteps().length >= 10) {
      return;
    }
    this.templateSteps.update((steps) => [...steps, { action: 'pin' }]);
  }

  protected removeStep(index: number): void {
    this.templateSteps.update((steps) => steps.filter((_, stepIndex) => stepIndex !== index));
  }

  protected moveStep(index: number, direction: -1 | 1): void {
    const nextIndex = index + direction;
    const steps = [...this.templateSteps()];
    if (nextIndex < 0 || nextIndex >= steps.length) {
      return;
    }
    const [item] = steps.splice(index, 1);
    steps.splice(nextIndex, 0, item!);
    this.templateSteps.set(steps);
  }

  protected updateStepAction(index: number, action: ActionTemplateStep['action']): void {
    this.templateSteps.update((steps) =>
      steps.map((step, stepIndex) => (stepIndex === index ? { action } : step))
    );
  }

  protected async saveTemplateDraft(): Promise<void> {
    const validationError = this.packageActions.validateTemplateSteps(this.templateSteps());
    if (validationError) {
      this.templateError.set(validationError);
      return;
    }

    try {
      await this.templatesStore.save({
        id: this.editingTemplateId() ?? undefined,
        name: this.templateName().trim(),
        steps: this.templateSteps()
      });
      this.templateError.set(null);
      this.startNewTemplate();
    } catch (error) {
      this.templateError.set((error as Error).message);
    }
  }

  protected deleteTemplate(id: string): void {
    this.alertDialog.confirm({
      zTitle: 'Delete template?',
      zDescription: 'This action cannot be undone.',
      zOkText: 'Delete',
      zOkDestructive: true,
      zOnOk: () => {
        void this.removeTemplate(id);
      }
    });
  }

  private async removeTemplate(id: string): Promise<void> {
    try {
      await this.templatesStore.remove(id);
      if (this.editingTemplateId() === id) {
        this.startNewTemplate();
      }
    } catch (error) {
      this.templateError.set((error as Error).message);
    }
  }

  private async clearAllTemplates(): Promise<void> {
    const templates = [...this.templatesStore.templates()];
    for (const template of templates) {
      await this.templatesStore.remove(template.id);
    }
    this.startNewTemplate();
  }
}

function readInputValue(event: Event): string {
  const target = event.target;
  return target instanceof HTMLInputElement ? target.value : '';
}

function readSelectValue(event: Event): string {
  const target = event.target;
  return target instanceof HTMLSelectElement ? target.value : '';
}
