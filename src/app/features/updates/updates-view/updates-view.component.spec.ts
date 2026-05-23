import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { InstalledPackage, OutdatedPackage, SmartUpgradePlan } from '../../../../shared/contracts';
import { BrewFacadeService } from '../../../core/services/brew-facade.service';
import { PackageActionsService } from '../../../core/services/package-actions.service';
import { ToastService } from '../../../core/services/toast.service';
import { PackageSelectionStore } from '../../../core/stores/package-selection.store';
import { TemplatesStore } from '../../../core/stores/templates.store';
import { InstalledStore } from '../../../core/stores/installed.store';
import { PackageDetailsStore } from '../../../core/stores/package-details.store';
import { UpdatesStore } from '../../../core/stores/updates.store';
import { UpdatesViewComponent } from './updates-view.component';

const baseItem: OutdatedPackage = {
  id: 'formula:ripgrep',
  kind: 'formula',
  name: 'ripgrep',
  installedVersions: ['14.0.0'],
  currentVersion: '14.1.0',
  pinned: false
};

const pinnedItem: OutdatedPackage = {
  ...baseItem,
  id: 'formula:openssl@3',
  name: 'openssl@3',
  pinned: true
};

const caskItem: OutdatedPackage = {
  id: 'cask:visual-studio-code',
  kind: 'cask',
  name: 'visual-studio-code',
  installedVersions: ['1.96.0'],
  currentVersion: '1.97.0',
  pinned: false
};

const criticalItem: OutdatedPackage = {
  id: 'formula:node',
  kind: 'formula',
  name: 'node',
  installedVersions: ['20.9.0'],
  currentVersion: '21.0.0',
  pinned: false
};

const securityItem: OutdatedPackage = {
  id: 'formula:openssl@3',
  kind: 'formula',
  name: 'openssl@3',
  installedVersions: ['3.0.0'],
  currentVersion: '3.0.1',
  pinned: false
};

const normalItem: OutdatedPackage = {
  id: 'formula:bat',
  kind: 'formula',
  name: 'bat',
  installedVersions: ['0.24.0'],
  currentVersion: '0.24.1',
  pinned: false
};

const smartPlan: SmartUpgradePlan = {
  generatedAt: '2026-02-26T00:00:00.000Z',
  low: [
    {
      id: baseItem.id,
      kind: baseItem.kind,
      name: baseItem.name,
      installedVersion: '14.0.0',
      currentVersion: '14.1.0',
      risk: 'low',
      reason: 'Patch version upgrade detected.'
    }
  ],
  medium: [],
  high: [
    {
      id: caskItem.id,
      kind: caskItem.kind,
      name: caskItem.name,
      installedVersion: '1.96.0',
      currentVersion: '1.97.0',
      risk: 'high',
      reason: 'Cask upgrades are treated as high risk for review.'
    }
  ],
  excludedPinned: [],
  excludedBlocked: [],
  totals: {
    outdated: 2,
    eligible: 2,
    low: 1,
    medium: 0,
    high: 1,
    excludedPinned: 0,
    excludedBlocked: 0
  }
};

function toInstalled(item: OutdatedPackage, overrides: Partial<InstalledPackage> = {}): InstalledPackage {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    desc: null,
    installedVersion: item.installedVersions[0] ?? 'unknown',
    currentVersion: item.currentVersion,
    pinned: item.pinned,
    tap: item.kind === 'formula' ? 'homebrew/core' : 'homebrew/cask',
    homepage: null,
    deprecated: false,
    disabled: false,
    deprecationReason: null,
    disableReason: null,
    replacement: null,
    ...overrides
  };
}

function createUpdatesStore(items: OutdatedPackage[], filtered: OutdatedPackage[]) {
  const blocked = new Set<string>();

  return {
    items: signal(items),
    updateCount: signal(items.length),
    pinnedCount: signal(items.filter((item) => item.pinned).length),
    unpinnedCount: signal(items.filter((item) => !item.pinned).length),
    lastCheckedAt: signal<string | null>(null),
    query: signal(''),
    kindFilter: signal<'all' | 'formula' | 'cask'>('all'),
    pinFilter: signal<'all' | 'pinned' | 'unpinned'>('all'),
    loading: signal(false),
    error: signal<string | null>(null),
    filteredItems: signal(filtered),
    upgrading: signal(false),
    pinning: signal(false),
    smartPlan: signal<SmartUpgradePlan | null>(smartPlan),
    smartPlanning: signal(false),
    smartRunning: signal(false),
    setQuery: vi.fn(),
    setKindFilter: vi.fn(),
    setPinFilter: vi.fn(),
    checkNow: vi.fn(async () => undefined),
    upgradeOne: vi.fn(async () => true),
    upgradeAll: vi.fn(async () => true),
    pinOne: vi.fn(async () => true),
    unpinOne: vi.fn(async () => true),
    loadSmartUpgradePlan: vi.fn(async () => smartPlan),
    upgradeSmart: vi.fn(async () => true),
    toggleSmartUpgradeBlocked: vi.fn(async (payload: { kind: string; name: string }) => {
      const key = `${payload.kind}:${payload.name}`;
      if (blocked.has(key)) {
        blocked.delete(key);
      } else {
        blocked.add(key);
      }

      return true;
    }),
    isSmartUpgradeBlocked: vi.fn((kind: string, name: string) => blocked.has(`${kind}:${name}`))
  };
}

describe('UpdatesViewComponent', () => {
  async function render(
    items: OutdatedPackage[],
    options?: { filteredItems?: OutdatedPackage[]; installedItems?: InstalledPackage[] }
  ) {
    const filteredItems = options?.filteredItems ?? items;
    const installedItems = options?.installedItems ?? items.map((item) => toInstalled(item));

    const updatesStore = createUpdatesStore(items, filteredItems);
    const installedStore = {
      refresh: vi.fn(async () => undefined),
      items: signal(installedItems)
    };
    const packageDetailsStore = { openFor: vi.fn(async () => undefined) };
    const toast = { push: vi.fn(), pushWithAction: vi.fn() };
    const facade = { getPackageDetails: vi.fn(async () => ({ homepage: null })) };
    const packageActions = {
      upgradeMany: vi.fn(async () => ({ succeeded: 1, failed: 0, results: [] })),
      uninstallMany: vi.fn(async () => ({ succeeded: 1, failed: 0, results: [] })),
      pinMany: vi.fn(async () => ({ succeeded: 1, failed: 0, results: [] })),
      notifyPinSuccess: vi.fn(),
      notifyUnpinSuccess: vi.fn(),
      toggleSmartUpgradeBlocked: vi.fn(async (_target, _blocked, toggle) => toggle()),
      buildBatchCommandPreview: vi.fn(() => 'brew upgrade'),
      runTemplate: vi.fn(async () => true)
    };
    const templatesStore = { templates: signal([]), load: vi.fn(async () => undefined) };

    await TestBed.configureTestingModule({
      imports: [UpdatesViewComponent],
      providers: [
        { provide: UpdatesStore, useValue: updatesStore },
        { provide: InstalledStore, useValue: installedStore },
        { provide: PackageDetailsStore, useValue: packageDetailsStore },
        { provide: BrewFacadeService, useValue: facade },
        { provide: PackageActionsService, useValue: packageActions },
        { provide: TemplatesStore, useValue: templatesStore },
        { provide: ToastService, useValue: toast },
        PackageSelectionStore
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(UpdatesViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, updatesStore, installedStore, packageDetailsStore, packageActions, toast };
  }

  it('defaults to all channel filter and computes channel counts', async () => {
    const { fixture } = await render([criticalItem, securityItem, normalItem]);
    const component = fixture.componentInstance as any;

    expect(component.channelFilter()).toBe('all');
    expect(component.channelFilterOptions()).toEqual([
      { value: 'all', label: 'All', count: 3 },
      { value: 'critical', label: 'Critical', count: 1 },
      { value: 'security', label: 'Security', count: 1 },
      { value: 'normal', label: 'Normal', count: 1 }
    ]);
  });

  it('filters rendered updates by selected update channel', async () => {
    const { fixture } = await render([criticalItem, securityItem, normalItem]);
    const component = fixture.componentInstance as any;

    component.onChannelFilterChange('critical');
    expect(component.channelFilteredItems().map((item: OutdatedPackage) => item.name)).toEqual(['node']);

    component.onChannelFilterChange('security');
    expect(component.channelFilteredItems().map((item: OutdatedPackage) => item.name)).toEqual(['openssl@3']);

    component.onChannelFilterChange('normal');
    expect(component.channelFilteredItems().map((item: OutdatedPackage) => item.name)).toEqual(['bat']);
  });

  it('computes channel counts from full update set even when filtered list is narrowed', async () => {
    const { fixture } = await render([criticalItem, securityItem, normalItem], {
      filteredItems: [normalItem]
    });
    const component = fixture.componentInstance as any;

    expect(component.channelFilteredItems().map((item: OutdatedPackage) => item.name)).toEqual(['bat']);
    expect(component.channelCounts()).toEqual({
      critical: 1,
      security: 1,
      normal: 1
    });

    component.onChannelFilterChange('critical');
    expect(component.channelFilteredItems()).toEqual([]);
  });

  it('shows success toast and closes dialog when upgrade-all starts', async () => {
    const { fixture, toast } = await render([baseItem]);
    const component = fixture.componentInstance as any;

    component.openUpgradeAll();
    await component.confirmUpgrade();

    expect(toast.push).toHaveBeenCalledWith('Upgrade-all command started.', 'success');
    expect(component.confirmOpen()).toBe(false);
  });

  it('does not show success toast or close dialog when upgrade-all fails', async () => {
    const { fixture, updatesStore, toast } = await render([baseItem]);
    const component = fixture.componentInstance as any;
    updatesStore.upgradeAll.mockResolvedValue(false);

    component.openUpgradeAll();
    await component.confirmUpgrade();

    expect(toast.push).not.toHaveBeenCalled();
    expect(component.confirmOpen()).toBe(true);
  });

  it('does not show success toast or close dialog when single upgrade fails', async () => {
    const { fixture, updatesStore, toast } = await render([baseItem]);
    const component = fixture.componentInstance as any;
    updatesStore.upgradeOne.mockResolvedValue(false);

    component.openUpgradeOne(baseItem);
    await component.confirmUpgrade();

    expect(toast.push).not.toHaveBeenCalled();
    expect(component.confirmOpen()).toBe(true);
  });

  it('disables upgrade action and labels pinned formulas', async () => {
    const { fixture } = await render([pinnedItem]);
    const component = fixture.componentInstance as any;

    expect(component.upgradeActionLabel(pinnedItem)).toBe('Pinned');
    expect(component.upgradeActionVariant(pinnedItem)).toBe('secondary');
    expect(component.upgradeActionDisabled(pinnedItem)).toBe(true);
  });

  it('shows unpin overflow action for pinned formula and smart-toggle action', async () => {
    const { fixture } = await render([pinnedItem]);
    const component = fixture.componentInstance as any;

    expect(component.overflowActionsFor(pinnedItem)).toEqual([
      { id: 'view-details', label: 'View details' },
      { id: 'run-template', label: 'Run template…', disabled: true },
      { id: 'toggle-smart-upgrade', label: 'Exclude from smart upgrade', disabled: false },
      { id: 'unpin', label: 'Unpin formula', disabled: false }
    ]);
  });

  it('shows smart-toggle and disabled pin-not-supported action for casks', async () => {
    const { fixture } = await render([caskItem]);
    const component = fixture.componentInstance as any;

    expect(component.overflowActionsFor(caskItem)).toEqual([
      { id: 'view-details', label: 'View details' },
      { id: 'run-template', label: 'Run template…', disabled: true },
      { id: 'toggle-smart-upgrade', label: 'Exclude from smart upgrade', disabled: false },
      { id: 'pin-not-supported', label: 'Pin not supported for casks', disabled: true }
    ]);
  });

  it('opens details drawer from overflow action', async () => {
    const { fixture, packageDetailsStore } = await render([baseItem]);
    const component = fixture.componentInstance as any;

    await component.onOverflowAction(baseItem, 'view-details');

    expect(packageDetailsStore.openFor).toHaveBeenCalledWith({
      kind: 'formula',
      name: 'ripgrep'
    });
  });

  it('unpins formula and refreshes installed state from overflow action', async () => {
    const { fixture, updatesStore, installedStore, packageActions } = await render([pinnedItem]);
    const component = fixture.componentInstance as any;

    await component.onOverflowAction(pinnedItem, 'unpin');

    expect(updatesStore.unpinOne).toHaveBeenCalledWith({ kind: 'formula', name: 'openssl@3' });
    expect(installedStore.refresh).toHaveBeenCalled();
    expect(packageActions.notifyUnpinSuccess).toHaveBeenCalledWith('openssl@3');
  });

  it('opens smart-upgrade dialog and preselects non-empty risk levels', async () => {
    const { fixture, updatesStore } = await render([baseItem, caskItem]);
    const component = fixture.componentInstance as any;

    await component.openSmartUpgrade();

    expect(updatesStore.loadSmartUpgradePlan).toHaveBeenCalled();
    expect(component.smartDialogIsOpen()).toBe(true);
    expect(component.selectedSmartRisks()).toEqual(['low', 'high']);
  });

  it('runs smart-upgrade with selected risks and closes on success', async () => {
    const { fixture, updatesStore, toast } = await render([baseItem, caskItem]);
    const component = fixture.componentInstance as any;

    await component.openSmartUpgrade();
    component.onSmartRisksChange(['high']);
    await component.confirmSmartUpgrade();

    expect(updatesStore.upgradeSmart).toHaveBeenCalledWith(['high']);
    expect(toast.push).toHaveBeenCalledWith('Smart upgrade completed.', 'success');
    expect(component.smartDialogIsOpen()).toBe(false);
  });

  it('toggles smart-upgrade exclusion from overflow action', async () => {
    const { fixture, updatesStore, packageActions } = await render([baseItem]);
    const component = fixture.componentInstance as any;

    await component.onOverflowAction(baseItem, 'toggle-smart-upgrade');

    expect(updatesStore.toggleSmartUpgradeBlocked).toHaveBeenCalledWith({
      kind: 'formula',
      name: 'ripgrep'
    });
    expect(packageActions.toggleSmartUpgradeBlocked).toHaveBeenCalled();
  });
});
