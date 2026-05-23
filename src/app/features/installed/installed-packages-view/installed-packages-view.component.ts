import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import type { InstalledPackage, ReinstallOneRequest } from '../../../../shared/contracts';
import { EmptyStateComponent } from '../../../components/foundation/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../components/foundation/loading-state/loading-state.component';
import { PackageFilterChipsComponent } from '../../../components/shared/package-filter-chips/package-filter-chips.component';
import type { PackageRowOverflowAction } from '../../../components/shared/package-row-overflow-menu/package-row-overflow-menu.component';
import { PackageRowComponent } from '../../../components/shared/package-row/package-row.component';
import { PackageSearchInputComponent } from '../../../components/shared/package-search-input/package-search-input.component';
import { BatchConfirmDialogComponent } from '../../../components/ux/batch-confirm-dialog/batch-confirm-dialog.component';
import { DiagnosticPanelComponent } from '../../../components/ux/diagnostic-panel/diagnostic-panel.component';
import { ReinstallConfirmDialogComponent } from '../../../components/ux/reinstall-confirm-dialog/reinstall-confirm-dialog.component';
import { UninstallConfirmDialogComponent } from '../../../components/ux/uninstall-confirm-dialog/uninstall-confirm-dialog.component';
import { PackageActionsService } from '../../../core/services/package-actions.service';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { InstalledStore } from '../../../core/stores/installed.store';
import { PackageDetailsStore } from '../../../core/stores/package-details.store';
import { PackageSelectionStore } from '../../../core/stores/package-selection.store';
import { TemplatesStore } from '../../../core/stores/templates.store';
import { UpdatesStore } from '../../../core/stores/updates.store';

type BatchAction = 'uninstall' | 'pin' | null;

@Component({
  selector: 'app-installed-packages-view',
  imports: [
    ZardButtonComponent,
    ZardCardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    PackageFilterChipsComponent,
    PackageRowComponent,
    PackageSearchInputComponent,
    BatchConfirmDialogComponent,
    DiagnosticPanelComponent,
    ReinstallConfirmDialogComponent,
    UninstallConfirmDialogComponent
  ],
  templateUrl: './installed-packages-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './installed-packages-view.component.css',
})
export class InstalledPackagesViewComponent {
  protected readonly installedStore = inject(InstalledStore);
  protected readonly updatesStore = inject(UpdatesStore);
  protected readonly catalogStore = inject(CatalogStore);
  protected readonly packageDetailsStore = inject(PackageDetailsStore);
  protected readonly selectionStore = inject(PackageSelectionStore);
  protected readonly templatesStore = inject(TemplatesStore);
  private readonly packageActions = inject(PackageActionsService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'formula', label: 'Formulae' },
    { value: 'cask', label: 'Casks' }
  ];

  protected readonly selectedPackage = signal<InstalledPackage | null>(null);
  protected readonly zapSelected = signal(false);
  protected readonly uninstallBusy = signal(false);
  protected readonly impactLoading = signal(false);
  protected readonly dependents = signal<string[]>([]);
  protected readonly impactNote = signal<string | null>(null);
  protected readonly reinstallTarget = signal<InstalledPackage | null>(null);
  protected readonly reinstallZapSelected = signal(false);
  protected readonly reinstallBusy = signal(false);
  protected readonly batchAction = signal<BatchAction>(null);
  protected readonly batchBusy = signal(false);
  protected readonly templatePickerOpen = signal(false);
  protected readonly templateRunTarget = signal<InstalledPackage | null>(null);
  protected readonly selectedTemplateId = signal<string | null>(null);

  protected readonly actionBusy = computed(
    () =>
      this.uninstallBusy()
      || this.reinstallBusy()
      || this.batchBusy()
      || this.installedStore.pinning()
  );
  protected readonly uninstallConfirmOpen = computed(() => Boolean(this.selectedPackage()));
  protected readonly reinstallConfirmOpen = computed(() => Boolean(this.reinstallTarget()));
  protected readonly batchConfirmOpen = computed(() => this.batchAction() !== null);
  protected readonly batchTargets = computed(() => {
    const ids = new Set(this.selectionStore.selectedIds());
    return this.installedStore.filteredItems().filter((item) => ids.has(item.id));
  });
  protected readonly batchPackageNames = computed(() => this.batchTargets().map((item) => item.name));
  protected readonly batchDialogTitle = computed(() => {
    const action = this.batchAction();
    if (action === 'uninstall') {
      return `Uninstall ${this.batchTargets().length} packages?`;
    }
    if (action === 'pin') {
      return `Pin ${this.batchTargets().length} formulae?`;
    }
    return 'Confirm batch action';
  });
  protected readonly batchDialogMessage = computed(() => {
    const action = this.batchAction();
    if (action === 'uninstall') {
      return 'This removes the selected packages from Homebrew.';
    }
    if (action === 'pin') {
      return 'This pins the selected formulae at their current versions.';
    }
    return '';
  });
  protected readonly batchConfirmLabel = computed(() =>
    this.batchAction() === 'pin' ? 'Pin selected' : 'Uninstall selected'
  );
  protected readonly batchCommandPreview = computed(() => {
    const action = this.batchAction();
    if (!action) {
      return null;
    }
    const items = this.batchTargets().map((item) => ({ kind: item.kind, name: item.name }));
    return this.packageActions.buildBatchCommandPreview(action, items);
  });
  protected readonly batchPinDisabled = computed(() =>
    this.batchTargets().some((item) => item.kind !== 'formula')
  );
  protected readonly pinFilterOptions = computed(() => [
    { value: 'all', label: 'All', count: this.installedStore.totalCount() },
    { value: 'pinned', label: 'Pinned', count: this.installedStore.pinnedCount() },
    { value: 'unpinned', label: 'Unpinned', count: this.installedStore.unpinnedCount() }
  ]);
  protected readonly lifecycleFilterOptions = computed(() => [
    { value: 'all', label: 'All', count: this.installedStore.totalCount() },
    { value: 'healthy', label: 'Healthy', count: this.installedStore.healthyCount() },
    { value: 'deprecated', label: 'Deprecated', count: this.installedStore.deprecatedOnlyCount() },
    { value: 'disabled', label: 'Disabled', count: this.installedStore.disabledCount() }
  ]);
  protected readonly uninstallDialogTitle = computed(() =>
    this.selectedPackage() ? `Uninstall ${this.selectedPackage()!.name}?` : 'Uninstall package?'
  );
  protected readonly uninstallDialogMessage = computed(() =>
    this.selectedPackage()?.kind === 'cask'
      ? 'This removes the selected cask from Homebrew. You can optionally remove related files with --zap.'
      : 'This removes the selected formula from Homebrew.'
  );
  protected readonly uninstallCommandPreview = computed(() => {
    const target = this.selectedPackage();
    if (!target) {
      return null;
    }
    return this.packageActions.buildUninstallCommandPreview(
      { kind: target.kind, name: target.name },
      this.zapSelected()
    );
  });
  protected readonly reinstallDialogTitle = computed(() =>
    this.reinstallTarget() ? `Reinstall ${this.reinstallTarget()!.name}?` : 'Reinstall package?'
  );
  protected readonly reinstallDialogMessage = computed(() =>
    this.reinstallTarget()?.kind === 'cask'
      ? 'This reinstalls the selected cask. You can optionally remove related files with --zap first.'
      : 'This reinstalls the selected formula using Homebrew.'
  );
  protected readonly reinstallCommandPreview = computed(() => {
    const target = this.reinstallTarget();
    if (!target) {
      return null;
    }
    if (target.kind === 'formula') {
      return `brew reinstall --formula ${target.name}`;
    }
    return this.reinstallZapSelected()
      ? `brew reinstall --cask --zap ${target.name}`
      : `brew reinstall --cask ${target.name}`;
  });
  protected readonly templatePreviewLines = computed(() => {
    const target = this.templateRunTarget();
    const templateId = this.selectedTemplateId();
    if (!target || !templateId) {
      return [];
    }
    const template = this.templatesStore.templates().find((item) => item.id === templateId);
    if (!template) {
      return [];
    }
    return this.packageActions.buildTemplateCommandPreview(template.name, template.steps, {
      kind: target.kind,
      name: target.name
    });
  });

  constructor() {
    void this.templatesStore.load();
    this.destroyRef.onDestroy(() => this.selectionStore.clear());
  }

  protected onFilterChange(value: string): void {
    this.installedStore.setKindFilter(value as 'all' | 'formula' | 'cask');
  }

  protected onPinFilterChange(value: string): void {
    this.installedStore.setPinFilter(value as 'all' | 'pinned' | 'unpinned');
  }

  protected onLifecycleFilterChange(value: string): void {
    this.installedStore.setLifecycleFilter(value as 'all' | 'healthy' | 'deprecated' | 'disabled');
  }

  protected async openUninstallDialog(item: InstalledPackage): Promise<void> {
    if (this.actionBusy()) {
      return;
    }

    this.reinstallTarget.set(null);
    this.reinstallZapSelected.set(false);
    this.selectedPackage.set(item);
    this.zapSelected.set(false);
    this.dependents.set([]);
    this.impactNote.set(null);
    this.impactLoading.set(true);

    try {
      const impact = await this.packageActions.getUninstallImpact({ kind: item.kind, name: item.name });
      this.dependents.set(impact.dependents);
      this.impactNote.set(impact.note);
    } catch {
      this.dependents.set([]);
      this.impactNote.set(null);
    } finally {
      this.impactLoading.set(false);
    }
  }

  protected closeUninstallDialog(): void {
    if (this.uninstallBusy()) {
      return;
    }
    this.selectedPackage.set(null);
    this.zapSelected.set(false);
    this.dependents.set([]);
    this.impactNote.set(null);
  }

  protected onZapSelectedChange(selected: boolean): void {
    this.zapSelected.set(selected);
  }

  protected openBatchUninstall(): void {
    if (this.batchTargets().length === 0 || this.actionBusy()) {
      return;
    }
    this.batchAction.set('uninstall');
  }

  protected openBatchPin(): void {
    if (this.batchTargets().length === 0 || this.batchPinDisabled() || this.actionBusy()) {
      return;
    }
    this.batchAction.set('pin');
  }

  protected closeBatchDialog(): void {
    if (this.batchBusy()) {
      return;
    }
    this.batchAction.set(null);
  }

  protected async confirmBatch(): Promise<void> {
    const action = this.batchAction();
    const items = this.batchTargets().map((item) => ({ kind: item.kind, name: item.name }));
    if (!action || items.length === 0) {
      return;
    }

    this.batchBusy.set(true);
    try {
      if (action === 'uninstall') {
        await this.packageActions.uninstallMany({ items });
      } else {
        await this.packageActions.pinMany({ items: items.filter((item) => item.kind === 'formula') });
      }
      await Promise.all([
        this.installedStore.refresh(),
        this.updatesStore.refresh(),
        this.catalogStore.refresh()
      ]);
      this.selectionStore.clear();
      this.batchAction.set(null);
    } finally {
      this.batchBusy.set(false);
    }
  }

  protected overflowActionsFor(item: InstalledPackage): PackageRowOverflowAction[] {
    const busy = this.actionBusy();
    const replacementAction = this.replacementOverflowAction(item);
    const templateAction: PackageRowOverflowAction = {
      id: 'run-template',
      label: 'Run template…',
      disabled: busy || this.templatesStore.templates().length === 0
    };

    if (item.kind === 'cask') {
      const baseActions: PackageRowOverflowAction[] = [
        { id: 'view-details', label: 'View details' },
        templateAction,
        { id: 'reinstall', label: 'Reinstall package', disabled: busy },
        { id: 'pin-not-supported', label: 'Pin not supported for casks', disabled: true }
      ];
      if (replacementAction) {
        baseActions.splice(1, 0, replacementAction);
      }
      return baseActions;
    }

    const formulaActions = item.pinned
      ? [
          { id: 'view-details', label: 'View details' },
          templateAction,
          { id: 'reinstall', label: 'Reinstall package', disabled: busy },
          { id: 'unpin', label: 'Unpin formula', disabled: busy }
        ]
      : [
          { id: 'view-details', label: 'View details' },
          templateAction,
          { id: 'reinstall', label: 'Reinstall package', disabled: busy },
          { id: 'pin', label: 'Pin formula', disabled: busy }
        ];

    if (replacementAction) {
      formulaActions.splice(1, 0, replacementAction);
    }
    return formulaActions;
  }

  protected async onOverflowAction(item: InstalledPackage, action: string): Promise<void> {
    if (action === 'view-details') {
      await this.packageDetailsStore.openFor({ kind: item.kind, name: item.name });
      return;
    }

    if (action === 'view-replacement-details' && item.replacement) {
      await this.packageDetailsStore.openFor({
        kind: item.replacement.kind,
        name: item.replacement.name
      });
      return;
    }

    if (action === 'run-template') {
      this.templateRunTarget.set(item);
      this.selectedTemplateId.set(this.templatesStore.templates().at(0)?.id ?? null);
      this.templatePickerOpen.set(true);
      return;
    }

    if (this.actionBusy()) {
      return;
    }

    if (action === 'reinstall') {
      this.openReinstallDialog(item);
      return;
    }

    if (item.kind !== 'formula') {
      return;
    }

    if (action === 'pin') {
      const started = await this.installedStore.pinOne({ kind: 'formula', name: item.name });
      if (started) {
        await this.updatesStore.refresh();
        this.packageActions.notifyPinSuccess({ kind: 'formula', name: item.name });
      }
      return;
    }

    if (action === 'unpin') {
      const started = await this.installedStore.unpinOne({ kind: 'formula', name: item.name });
      if (started) {
        await this.updatesStore.refresh();
        this.packageActions.notifyUnpinSuccess(item.name);
      }
    }
  }

  protected closeTemplatePicker(): void {
    this.templatePickerOpen.set(false);
    this.templateRunTarget.set(null);
    this.selectedTemplateId.set(null);
  }

  protected async confirmRunTemplate(): Promise<void> {
    const target = this.templateRunTarget();
    const templateId = this.selectedTemplateId();
    if (!target || !templateId) {
      return;
    }

    const template = this.templatesStore.templates().find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    this.batchBusy.set(true);
    try {
      await this.packageActions.runTemplate(
        { templateId, kind: target.kind, name: target.name },
        template.name
      );
      await Promise.all([
        this.installedStore.refresh(),
        this.updatesStore.refresh(),
        this.catalogStore.refresh()
      ]);
      this.closeTemplatePicker();
    } finally {
      this.batchBusy.set(false);
    }
  }

  private replacementOverflowAction(item: InstalledPackage): PackageRowOverflowAction | null {
    if (!item.replacement) {
      return null;
    }
    return {
      id: 'view-replacement-details',
      label: `View replacement details (${item.replacement.name})`
    };
  }

  protected openReinstallDialog(item: InstalledPackage): void {
    if (this.actionBusy()) {
      return;
    }
    this.selectedPackage.set(null);
    this.zapSelected.set(false);
    this.reinstallTarget.set(item);
    this.reinstallZapSelected.set(false);
  }

  protected closeReinstallDialog(): void {
    if (this.reinstallBusy()) {
      return;
    }
    this.reinstallTarget.set(null);
    this.reinstallZapSelected.set(false);
  }

  protected onReinstallZapSelectedChange(selected: boolean): void {
    this.reinstallZapSelected.set(selected);
  }

  protected async confirmUninstall(): Promise<void> {
    const target = this.selectedPackage();
    if (!target) {
      return;
    }

    const request =
      target.kind === 'cask'
        ? { kind: target.kind, name: target.name, zap: this.zapSelected() }
        : { kind: target.kind, name: target.name };

    this.uninstallBusy.set(true);
    this.selectedPackage.set(null);
    this.zapSelected.set(false);

    try {
      const success = await this.packageActions.uninstallOne(request);
      if (!success) {
        return;
      }
      await Promise.all([
        this.installedStore.refresh(),
        this.updatesStore.refresh(),
        this.catalogStore.refresh()
      ]);
    } finally {
      this.uninstallBusy.set(false);
    }
  }

  protected async confirmReinstall(): Promise<void> {
    const target = this.reinstallTarget();
    if (!target) {
      return;
    }

    const request: ReinstallOneRequest =
      target.kind === 'cask'
        ? { kind: target.kind, name: target.name, zap: this.reinstallZapSelected() }
        : { kind: target.kind, name: target.name };

    this.reinstallBusy.set(true);
    this.reinstallTarget.set(null);
    this.reinstallZapSelected.set(false);

    try {
      const success = await this.packageActions.reinstallOne(request);
      if (!success) {
        return;
      }
      await Promise.all([
        this.installedStore.refresh(),
        this.updatesStore.refresh(),
        this.catalogStore.refresh()
      ]);
    } finally {
      this.reinstallBusy.set(false);
    }
  }
}
