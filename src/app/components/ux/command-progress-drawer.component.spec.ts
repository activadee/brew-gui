import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { JobsStore, type JobLogEntry } from '../../core/stores/jobs.store';
import { CommandProgressDrawerComponent } from './command-progress-drawer.component';

const sampleJob: JobLogEntry = {
  jobId: 'job-1',
  action: 'install',
  command: 'brew install --formula ripgrep',
  packageName: 'ripgrep',
  kind: 'formula',
  status: 'succeeded',
  queuedAt: '2026-02-25T00:00:00.000Z',
  runningAt: '2026-02-25T00:00:01.000Z',
  completedAt: '2026-02-25T00:00:03.000Z',
  durationMs: 3000,
  exitCode: 0,
  error: null,
  outputLines: [
    {
      text: 'Downloading',
      stream: 'stdout',
      timestamp: '2026-02-25T00:00:01.000Z'
    }
  ]
};

describe('CommandProgressDrawerComponent', () => {
  async function render() {
    const store = {
      drawerOpen: signal(true),
      runningCount: signal(0),
      succeededCount: signal(1),
      failedCount: signal(0),
      statusFilter: signal<'all' | 'running' | 'succeeded' | 'failed'>('all'),
      actionFilter: signal<
        'all' | 'install' | 'uninstall' | 'reinstall' | 'upgradeOne' | 'upgradeAll' | 'pin' | 'unpin' | 'syncMetadata'
      >('all'),
      kindFilter: signal<'all' | 'formula' | 'cask' | 'system'>('all'),
      query: signal(''),
      filteredJobs: signal([sampleJob]),
      setStatusFilter: vi.fn(),
      setActionFilter: vi.fn(),
      setKindFilter: vi.fn(),
      setQuery: vi.fn(),
      clearHistory: vi.fn(),
      closeDrawer: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [CommandProgressDrawerComponent],
      providers: [{ provide: JobsStore, useValue: store }]
    }).compileComponents();

    const fixture = TestBed.createComponent(CommandProgressDrawerComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    return { fixture, store };
  }

  it('renders command preview, status badges, and exit status', async () => {
    const { fixture } = await render();
    const html = fixture.nativeElement as HTMLElement;

    expect(html.textContent).toContain('Brew Activity Log');
    expect(html.textContent).toContain('brew install --formula ripgrep');
    expect(html.textContent).toContain('succeeded');
    expect(html.textContent).toContain('exit 0');
    expect(html.textContent).toContain('Output (1)');
  });

  it('forwards filter changes to jobs store methods', async () => {
    const { fixture, store } = await render();
    const component = fixture.componentInstance as any;

    component.onStatusFilterChange('failed');
    component.onActionFilterChange('upgradeAll');
    component.onKindFilterChange('system');

    expect(store.setStatusFilter).toHaveBeenCalledWith('failed');
    expect(store.setActionFilter).toHaveBeenCalledWith('upgradeAll');
    expect(store.setKindFilter).toHaveBeenCalledWith('system');
  });

  it('supports hide and clear actions', async () => {
    const { fixture, store } = await render();
    const html = fixture.nativeElement as HTMLElement;

    const hideButton = Array.from(html.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Hide')
    );
    const clearButton = Array.from(html.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Clear')
    );

    hideButton?.click();
    clearButton?.click();

    expect(store.closeDrawer).toHaveBeenCalled();
    expect(store.clearHistory).toHaveBeenCalled();
  });
});
