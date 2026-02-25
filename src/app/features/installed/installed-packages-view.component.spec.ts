import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import type { BrewJobCompleteEvent, InstalledPackage } from '../../../shared/contracts';
import { BrewFacadeService } from '../../core/services/brew-facade.service';
import { ToastService } from '../../core/services/toast.service';
import { CatalogStore } from '../../core/stores/catalog.store';
import { InstalledStore } from '../../core/stores/installed.store';
import { UpdatesStore } from '../../core/stores/updates.store';
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
  homepage: 'https://example.com/ripgrep'
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
  homepage: 'https://example.com/vscode'
};

function createInstalledStore(items: InstalledPackage[]) {
  return {
    loading: signal(false),
    error: signal<string | null>(null),
    filteredItems: signal(items),
    query: signal(''),
    kindFilter: signal<'all' | 'formula' | 'cask'>('all'),
    setQuery: vi.fn(),
    setKindFilter: vi.fn(),
    refresh: vi.fn(async () => undefined)
  };
}

describe('InstalledPackagesViewComponent', () => {
  async function render(items: InstalledPackage[], uninstallSuccess = true) {
    const installedStore = createInstalledStore(items);
    const updatesStore = { refresh: vi.fn(async () => undefined) };
    const catalogStore = { refresh: vi.fn(async () => undefined) };
    const facade = { uninstallOne: vi.fn(async () => createJobCompleteEvent(uninstallSuccess)) };
    const toast = { push: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [InstalledPackagesViewComponent],
      providers: [
        { provide: InstalledStore, useValue: installedStore },
        { provide: UpdatesStore, useValue: updatesStore },
        { provide: CatalogStore, useValue: catalogStore },
        { provide: BrewFacadeService, useValue: facade },
        { provide: ToastService, useValue: toast }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(InstalledPackagesViewComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, installedStore, updatesStore, catalogStore, facade, toast };
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

    const zapToggle = html.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    expect(zapToggle).toBeTruthy();
    expect(zapToggle?.checked).toBe(false);
  });

  it('hides zap option for formula uninstall', async () => {
    const { fixture } = await render([formulaItem]);
    const html = fixture.nativeElement as HTMLElement;

    findButtonByText(html, 'Uninstall')?.click();
    fixture.detectChanges();

    const zapToggle = html.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    expect(zapToggle).toBeNull();
  });

  it('submits formula uninstall without zap', async () => {
    const { fixture, facade, installedStore, updatesStore, catalogStore, toast } = await render([
      formulaItem
    ]);
    const html = fixture.nativeElement as HTMLElement;

    findButtonByText(html, 'Uninstall')?.click();
    fixture.detectChanges();

    findButtonByText(html, 'Uninstall package')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(facade.uninstallOne).toHaveBeenCalledWith({ kind: 'formula', name: 'ripgrep' });
    expect(installedStore.refresh).toHaveBeenCalled();
    expect(updatesStore.refresh).toHaveBeenCalled();
    expect(catalogStore.refresh).toHaveBeenCalled();
    expect(toast.push).toHaveBeenCalledWith('Uninstalled ripgrep.', 'success');
  });

  it('submits cask uninstall with zap when selected', async () => {
    const { fixture, facade } = await render([caskItem]);
    const html = fixture.nativeElement as HTMLElement;

    findButtonByText(html, 'Uninstall')?.click();
    fixture.detectChanges();

    const zapToggle = html.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    zapToggle?.click();
    fixture.detectChanges();

    findButtonByText(html, 'Uninstall package')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(facade.uninstallOne).toHaveBeenCalledWith({
      kind: 'cask',
      name: 'visual-studio-code',
      zap: true
    });
  });

  it('does not show success feedback when uninstall result is unsuccessful', async () => {
    const { fixture, facade, installedStore, updatesStore, catalogStore, toast } = await render(
      [formulaItem],
      false
    );
    const html = fixture.nativeElement as HTMLElement;

    findButtonByText(html, 'Uninstall')?.click();
    fixture.detectChanges();

    findButtonByText(html, 'Uninstall package')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(facade.uninstallOne).toHaveBeenCalledWith({ kind: 'formula', name: 'ripgrep' });
    expect(installedStore.refresh).not.toHaveBeenCalled();
    expect(updatesStore.refresh).not.toHaveBeenCalled();
    expect(catalogStore.refresh).not.toHaveBeenCalled();
    expect(toast.push).not.toHaveBeenCalled();
  });
});

function findButtonByText(root: HTMLElement, text: string): HTMLButtonElement | null {
  const buttons = Array.from(root.querySelectorAll('button'));
  return (
    buttons.find((button) => button.textContent?.replace(/\s+/g, ' ').trim() === text) ?? null
  );
}

function createJobCompleteEvent(success: boolean): BrewJobCompleteEvent {
  return {
    jobId: 'job-1',
    success,
    output: success ? 'ok' : 'failed',
    timestamp: '2026-02-25T00:00:00.000Z'
  };
}
