import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { OutdatedPackage } from '../../../shared/contracts';
import { ToastService } from '../../core/services/toast.service';
import { UpdatesStore } from '../../core/stores/updates.store';
import { UpdatesViewComponent } from './updates-view.component';

const baseItem: OutdatedPackage = {
  id: 'formula:ripgrep',
  kind: 'formula',
  name: 'ripgrep',
  installedVersions: ['14.0.0'],
  currentVersion: '14.1.0',
  pinned: false
};

function createUpdatesStore(items: OutdatedPackage[]) {
  return {
    updateCount: signal(items.length),
    lastCheckedAt: signal<string | null>(null),
    query: signal(''),
    kindFilter: signal<'all' | 'formula' | 'cask'>('all'),
    loading: signal(false),
    error: signal<string | null>(null),
    filteredItems: signal(items),
    upgrading: signal(false),
    setQuery: vi.fn(),
    setKindFilter: vi.fn(),
    checkNow: vi.fn(async () => undefined),
    upgradeOne: vi.fn(async () => true),
    upgradeAll: vi.fn(async () => true)
  };
}

describe('UpdatesViewComponent', () => {
  async function render(items: OutdatedPackage[]) {
    const updatesStore = createUpdatesStore(items);
    const toast = { push: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [UpdatesViewComponent],
      providers: [
        { provide: UpdatesStore, useValue: updatesStore },
        { provide: ToastService, useValue: toast }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(UpdatesViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, updatesStore, toast };
  }

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
});
