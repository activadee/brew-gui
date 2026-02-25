import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { CatalogPackage } from '../../../shared/contracts';
import { BrewFacadeService } from '../../core/services/brew-facade.service';
import { ToastService } from '../../core/services/toast.service';
import { CatalogStore } from '../../core/stores/catalog.store';
import { InstalledStore } from '../../core/stores/installed.store';
import { UpdatesStore } from '../../core/stores/updates.store';
import { BrowseCatalogViewComponent } from './browse-catalog-view.component';

const baseItem: CatalogPackage = {
  id: 'formula:ripgrep',
  kind: 'formula',
  name: 'ripgrep',
  fullName: 'ripgrep',
  desc: 'Search tool',
  version: '14.1.0',
  homepage: 'https://example.com',
  tap: 'homebrew/core',
  deprecated: false,
  disabled: false
};

function createCatalogStore(items: CatalogPackage[]) {
  return {
    loading: signal(false),
    error: signal<string | null>(null),
    items: signal(items),
    total: signal(items.length),
    source: signal<'network' | 'cache'>('network'),
    stale: signal(false),
    query: signal(''),
    kindFilter: signal<'all' | 'formula' | 'cask'>('all'),
    hasPreviousPage: signal(false),
    hasNextPage: signal(false),
    setQuery: vi.fn(),
    setKindFilter: vi.fn(),
    refresh: vi.fn(async () => undefined),
    previousPage: vi.fn(async () => undefined),
    nextPage: vi.fn(async () => undefined)
  };
}

function createInstalledStore(ids: string[]) {
  return {
    installedIdSet: signal(new Set(ids)),
    refresh: vi.fn(async () => undefined)
  };
}

describe('BrowseCatalogViewComponent', () => {
  async function render(items: CatalogPackage[], installedIds: string[] = []) {
    const catalogStore = createCatalogStore(items);
    const installedStore = createInstalledStore(installedIds);
    const updatesStore = { refresh: vi.fn(async () => undefined) };
    const facade = { installOne: vi.fn(async () => undefined) };
    const toast = { push: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [BrowseCatalogViewComponent],
      providers: [
        { provide: CatalogStore, useValue: catalogStore },
        { provide: InstalledStore, useValue: installedStore },
        { provide: UpdatesStore, useValue: updatesStore },
        { provide: BrewFacadeService, useValue: facade },
        { provide: ToastService, useValue: toast }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(BrowseCatalogViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, facade, catalogStore, installedStore, updatesStore, toast };
  }

  it('shows install action for installable packages', async () => {
    const { fixture } = await render([baseItem]);
    const html = fixture.nativeElement as HTMLElement;
    const installButton = findButtonByText(html, 'Install');

    expect(installButton).toBeTruthy();
    expect(installButton?.hasAttribute('disabled')).toBe(false);
  });

  it('shows installed state for already-installed packages', async () => {
    const { fixture } = await render([baseItem], ['formula:ripgrep']);
    const html = fixture.nativeElement as HTMLElement;
    const installedButton = findButtonByText(html, 'Installed');

    expect(installedButton).toBeTruthy();
    expect(installedButton?.hasAttribute('disabled')).toBe(true);
  });

  it('shows disabled state for disabled packages', async () => {
    const { fixture } = await render([
      { ...baseItem, id: 'cask:bad-app', kind: 'cask', name: 'bad-app', disabled: true }
    ]);
    const html = fixture.nativeElement as HTMLElement;
    const disabledButton = findButtonByText(html, 'Disabled');

    expect(disabledButton).toBeTruthy();
    expect(disabledButton?.hasAttribute('disabled')).toBe(true);
  });

  it('opens confirm dialog and invokes install flow', async () => {
    const { fixture, facade, catalogStore, installedStore, updatesStore, toast } = await render([baseItem]);
    const html = fixture.nativeElement as HTMLElement;

    findButtonByText(html, 'Install')?.click();
    fixture.detectChanges();

    const confirmButton = findButtonByText(html, 'Install package');
    expect(confirmButton).toBeTruthy();

    confirmButton?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(facade.installOne).toHaveBeenCalledWith({ kind: 'formula', name: 'ripgrep' });
    expect(installedStore.refresh).toHaveBeenCalled();
    expect(updatesStore.refresh).toHaveBeenCalled();
    expect(catalogStore.refresh).toHaveBeenCalled();
    expect(toast.push).toHaveBeenCalledWith('Installed ripgrep.', 'success');
  });
});

function findButtonByText(root: HTMLElement, text: string): HTMLButtonElement | null {
  const buttons = Array.from(root.querySelectorAll('button'));
  return (
    buttons.find((button) => button.textContent?.replace(/\s+/g, ' ').trim() === text) ?? null
  );
}
