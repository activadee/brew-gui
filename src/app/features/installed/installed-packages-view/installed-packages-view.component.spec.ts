import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { InstalledPackage } from '../../../../shared/contracts';
import { PackageActionsService } from '../../../core/services/package-actions.service';
import { PackageSelectionStore } from '../../../core/stores/package-selection.store';
import { TemplatesStore } from '../../../core/stores/templates.store';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { InstalledStore } from '../../../core/stores/installed.store';
import { PackageDetailsStore } from '../../../core/stores/package-details.store';
import { UpdatesStore } from '../../../core/stores/updates.store';
import { InstalledPackagesViewComponent } from './installed-packages-view.component';

const formulaItem: InstalledPackage = {
  id: 'formula:ripgrep',
  kind: 'formula',
  name: 'ripgrep',
  desc: 'Search recursively',
  installedVersion: '14.1.0',
  currentVersion: '14.1.0',
  pinned: false,
  tap: 'homebrew/core',
  homepage: 'https://example.com/ripgrep',
  deprecated: false,
  disabled: false,
  deprecationReason: null,
  disableReason: null,
  replacement: null
};

const pinnedFormulaItem: InstalledPackage = {
  ...formulaItem,
  id: 'formula:openssl@3',
  name: 'openssl@3',
  pinned: true
};

const caskItem: InstalledPackage = {
  id: 'cask:visual-studio-code',
  kind: 'cask',
  name: 'visual-studio-code',
  desc: 'Code editor',
  installedVersion: '1.97.0',
  currentVersion: '1.97.0',
  pinned: false,
  tap: 'homebrew/cask',
  homepage: 'https://example.com/vscode',
  deprecated: false,
  disabled: false,
  deprecationReason: null,
  disableReason: null,
  replacement: null
};

const deprecatedItem: InstalledPackage = {
  ...formulaItem,
  id: 'formula:aftman',
  name: 'aftman',
  deprecated: true,
  deprecationReason: 'repo_archived',
  replacement: { kind: 'formula', name: 'mise' }
};

function createInstalledStore(items: InstalledPackage[]) {
  return {
    loading: signal(false),
    error: signal<string | null>(null),
    filteredItems: signal(items),
    query: signal(''),
    kindFilter: signal<'all' | 'formula' | 'cask'>('all'),
    pinFilter: signal<'all' | 'pinned' | 'unpinned'>('all'),
    lifecycleFilter: signal<'all' | 'healthy' | 'deprecated' | 'disabled'>('all'),
    pinning: signal(false),
    totalCount: signal(items.length),
    pinnedCount: signal(items.filter((item) => item.pinned).length),
    unpinnedCount: signal(items.filter((item) => !item.pinned).length),
    healthyCount: signal(items.filter((item) => !item.deprecated && !item.disabled).length),
    deprecatedOnlyCount: signal(items.filter((item) => item.deprecated && !item.disabled).length),
    disabledCount: signal(items.filter((item) => item.disabled).length),
    setQuery: vi.fn(),
    setKindFilter: vi.fn(),
    setPinFilter: vi.fn(),
    setLifecycleFilter: vi.fn(),
    refresh: vi.fn(async () => undefined),
    pinOne: vi.fn(async () => true),
    unpinOne: vi.fn(async () => true)
  };
}

describe('InstalledPackagesViewComponent', () => {
  async function render(
    items: InstalledPackage[],
    options: { uninstallSuccess?: boolean; reinstallSuccess?: boolean } = {}
  ) {
    const uninstallSuccess = options.uninstallSuccess ?? true;
    const reinstallSuccess = options.reinstallSuccess ?? true;
    const installedStore = createInstalledStore(items);
    const updatesStore = { refresh: vi.fn(async () => undefined) };
    const catalogStore = { refresh: vi.fn(async () => undefined) };
    const packageDetailsStore = { openFor: vi.fn(async () => undefined) };
    const packageActions = {
      uninstallOne: vi.fn(async () => uninstallSuccess),
      reinstallOne: vi.fn(async () => reinstallSuccess),
      getUninstallImpact: vi.fn(async () => ({ dependents: [], note: null })),
      notifyPinSuccess: vi.fn(),
      notifyUnpinSuccess: vi.fn(),
      buildUninstallCommandPreview: vi.fn(() => 'brew uninstall'),
      buildBatchCommandPreview: vi.fn(() => 'brew batch'),
      buildTemplateCommandPreview: vi.fn(() => [])
    };
    const templatesStore = { templates: signal([]), load: vi.fn(async () => undefined) };

    await TestBed.configureTestingModule({
      imports: [InstalledPackagesViewComponent],
      providers: [
        { provide: InstalledStore, useValue: installedStore },
        { provide: UpdatesStore, useValue: updatesStore },
        { provide: CatalogStore, useValue: catalogStore },
        { provide: PackageDetailsStore, useValue: packageDetailsStore },
        { provide: PackageActionsService, useValue: packageActions },
        { provide: TemplatesStore, useValue: templatesStore },
        PackageSelectionStore
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(InstalledPackagesViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, installedStore, updatesStore, catalogStore, packageDetailsStore, packageActions };
  }

  it('renders uninstall action for installed rows', async () => {
    const { fixture } = await render([formulaItem]);
    const html = fixture.nativeElement as HTMLElement;

    const uninstallButton = findButtonByText(html, 'Uninstall');
    expect(uninstallButton).toBeTruthy();
    expect(uninstallButton?.hasAttribute('disabled')).toBe(false);
  });

  it('shows cask zap option unchecked by default', async () => {
    const { fixture } = await render([caskItem]);
    const html = fixture.nativeElement as HTMLElement;

    findButtonByText(html, 'Uninstall')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const zapToggle = dialogCheckbox(html);
    expect(zapToggle).toBeTruthy();
    expect(zapToggle?.checked).toBe(false);
  });

  it('hides zap option for formula uninstall', async () => {
    const { fixture } = await render([formulaItem]);
    const html = fixture.nativeElement as HTMLElement;

    findButtonByText(html, 'Uninstall')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(dialogCheckbox(html)).toBeNull();
  });

  it('submits formula uninstall without zap', async () => {
    const { fixture, packageActions, installedStore, updatesStore, catalogStore } = await render([
      formulaItem
    ]);
    const html = fixture.nativeElement as HTMLElement;

    findButtonByText(html, 'Uninstall')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    findButtonByText(html, 'Uninstall package')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(packageActions.uninstallOne).toHaveBeenCalledWith({ kind: 'formula', name: 'ripgrep' });
    expect(installedStore.refresh).toHaveBeenCalled();
    expect(updatesStore.refresh).toHaveBeenCalled();
    expect(catalogStore.refresh).toHaveBeenCalled();
  });

  it('submits cask uninstall with zap when selected', async () => {
    const { fixture, packageActions } = await render([caskItem]);
    const html = fixture.nativeElement as HTMLElement;

    findButtonByText(html, 'Uninstall')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const zapToggle = dialogCheckbox(html);
    zapToggle?.click();
    fixture.detectChanges();

    findButtonByText(html, 'Uninstall package')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(packageActions.uninstallOne).toHaveBeenCalledWith({
      kind: 'cask',
      name: 'visual-studio-code',
      zap: true
    });
  });

  it('does not show success feedback when uninstall result is unsuccessful', async () => {
    const { fixture, packageActions, installedStore, updatesStore, catalogStore } = await render(
      [formulaItem],
      { uninstallSuccess: false }
    );
    const html = fixture.nativeElement as HTMLElement;

    findButtonByText(html, 'Uninstall')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    findButtonByText(html, 'Uninstall package')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(packageActions.uninstallOne).toHaveBeenCalledWith({ kind: 'formula', name: 'ripgrep' });
    expect(installedStore.refresh).not.toHaveBeenCalled();
    expect(updatesStore.refresh).not.toHaveBeenCalled();
    expect(catalogStore.refresh).not.toHaveBeenCalled();
  });

  it('shows pin menu action for unpinned formula', async () => {
    const { fixture } = await render([formulaItem]);
    const component = fixture.componentInstance as any;

    expect(component.overflowActionsFor(formulaItem)).toEqual([
      { id: 'view-details', label: 'View details' },
      { id: 'run-template', label: 'Run template…', disabled: true },
      { id: 'reinstall', label: 'Reinstall package', disabled: false },
      { id: 'pin', label: 'Pin formula', disabled: false }
    ]);
  });

  it('shows unpin menu action for pinned formula', async () => {
    const { fixture } = await render([pinnedFormulaItem]);
    const component = fixture.componentInstance as any;

    expect(component.overflowActionsFor(pinnedFormulaItem)).toEqual([
      { id: 'view-details', label: 'View details' },
      { id: 'run-template', label: 'Run template…', disabled: true },
      { id: 'reinstall', label: 'Reinstall package', disabled: false },
      { id: 'unpin', label: 'Unpin formula', disabled: false }
    ]);
  });

  it('shows disabled pin-not-supported action for casks', async () => {
    const { fixture } = await render([caskItem]);
    const component = fixture.componentInstance as any;

    expect(component.overflowActionsFor(caskItem)).toEqual([
      { id: 'view-details', label: 'View details' },
      { id: 'run-template', label: 'Run template…', disabled: true },
      { id: 'reinstall', label: 'Reinstall package', disabled: false },
      { id: 'pin-not-supported', label: 'Pin not supported for casks', disabled: true }
    ]);
  });

  it('opens details drawer from overflow action', async () => {
    const { fixture, packageDetailsStore } = await render([formulaItem]);
    const component = fixture.componentInstance as any;

    await component.onOverflowAction(formulaItem, 'view-details');

    expect(packageDetailsStore.openFor).toHaveBeenCalledWith({
      kind: 'formula',
      name: 'ripgrep'
    });
  });

  it('shows replacement overflow action when recommendation exists', async () => {
    const { fixture } = await render([deprecatedItem]);
    const component = fixture.componentInstance as any;

    expect(component.overflowActionsFor(deprecatedItem)).toEqual([
      { id: 'view-details', label: 'View details' },
      { id: 'view-replacement-details', label: 'View replacement details (mise)' },
      { id: 'run-template', label: 'Run template…', disabled: true },
      { id: 'reinstall', label: 'Reinstall package', disabled: false },
      { id: 'pin', label: 'Pin formula', disabled: false }
    ]);
  });

  it('opens replacement details from overflow action', async () => {
    const { fixture, packageDetailsStore } = await render([deprecatedItem]);
    const component = fixture.componentInstance as any;

    await component.onOverflowAction(deprecatedItem, 'view-replacement-details');

    expect(packageDetailsStore.openFor).toHaveBeenCalledWith({
      kind: 'formula',
      name: 'mise'
    });
  });

  it('submits formula reinstall without zap', async () => {
    const { fixture, packageActions, installedStore, updatesStore, catalogStore } = await render([
      formulaItem
    ]);
    const component = fixture.componentInstance as any;

    await component.onOverflowAction(formulaItem, 'reinstall');
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    findButtonByText(html, 'Reinstall package')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(packageActions.reinstallOne).toHaveBeenCalledWith({ kind: 'formula', name: 'ripgrep' });
    expect(installedStore.refresh).toHaveBeenCalled();
    expect(updatesStore.refresh).toHaveBeenCalled();
    expect(catalogStore.refresh).toHaveBeenCalled();
  });

  it('submits cask reinstall with zap when selected', async () => {
    const { fixture, packageActions } = await render([caskItem]);
    const component = fixture.componentInstance as any;

    await component.onOverflowAction(caskItem, 'reinstall');
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    const zapToggle = dialogCheckbox(html);
    zapToggle?.click();
    fixture.detectChanges();

    findButtonByText(html, 'Reinstall package')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(packageActions.reinstallOne).toHaveBeenCalledWith({
      kind: 'cask',
      name: 'visual-studio-code',
      zap: true
    });
  });

  it('does not show success feedback when reinstall result is unsuccessful', async () => {
    const { fixture, packageActions, installedStore, updatesStore, catalogStore } = await render(
      [formulaItem],
      { reinstallSuccess: false }
    );
    const component = fixture.componentInstance as any;

    await component.onOverflowAction(formulaItem, 'reinstall');
    fixture.detectChanges();

    const html = fixture.nativeElement as HTMLElement;
    findButtonByText(html, 'Reinstall package')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(packageActions.reinstallOne).toHaveBeenCalledWith({ kind: 'formula', name: 'ripgrep' });
    expect(installedStore.refresh).not.toHaveBeenCalled();
    expect(updatesStore.refresh).not.toHaveBeenCalled();
    expect(catalogStore.refresh).not.toHaveBeenCalled();
  });

  it('pins formula and refreshes updates on overflow action', async () => {
    const { fixture, installedStore, updatesStore, packageActions } = await render([formulaItem]);
    const component = fixture.componentInstance as any;

    await component.onOverflowAction(formulaItem, 'pin');

    expect(installedStore.pinOne).toHaveBeenCalledWith({ kind: 'formula', name: 'ripgrep' });
    expect(updatesStore.refresh).toHaveBeenCalled();
    expect(packageActions.notifyPinSuccess).toHaveBeenCalledWith({ kind: 'formula', name: 'ripgrep' });
  });
});

function dialogCheckbox(root: HTMLElement): HTMLInputElement | null {
  const dialog = root.querySelector('section.fixed');
  return dialog?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
}

function findButtonByText(root: HTMLElement, text: string): HTMLButtonElement | null {
  const buttons = Array.from(root.querySelectorAll('button'));
  return (
    buttons.find((button) => button.textContent?.replace(/\s+/g, ' ').trim() === text) ?? null
  );
}

