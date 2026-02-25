import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp'
  }
}));

import { uninstallOneRequestSchema } from '../../src/shared/contracts';
import { buildInstallCommand, buildUninstallCommand, HomebrewService } from './homebrew-service';

describe('buildInstallCommand', () => {
  it('builds formula install command', () => {
    expect(buildInstallCommand({ kind: 'formula', name: 'ripgrep' })).toEqual([
      'install',
      '--formula',
      'ripgrep'
    ]);
  });

  it('builds cask install command', () => {
    expect(buildInstallCommand({ kind: 'cask', name: 'visual-studio-code' })).toEqual([
      'install',
      '--cask',
      'visual-studio-code'
    ]);
  });
});

describe('buildUninstallCommand', () => {
  it('builds formula uninstall command', () => {
    expect(buildUninstallCommand({ kind: 'formula', name: 'ripgrep' })).toEqual([
      'uninstall',
      '--formula',
      'ripgrep'
    ]);
  });

  it('builds cask uninstall command without zap', () => {
    expect(buildUninstallCommand({ kind: 'cask', name: 'visual-studio-code' })).toEqual([
      'uninstall',
      '--cask',
      'visual-studio-code'
    ]);
  });

  it('builds cask uninstall command with zap', () => {
    expect(buildUninstallCommand({ kind: 'cask', name: 'visual-studio-code', zap: true })).toEqual([
      'uninstall',
      '--cask',
      '--zap',
      'visual-studio-code'
    ]);
  });
});

describe('uninstallOneRequestSchema', () => {
  it('rejects zap for formula uninstall requests', () => {
    const parsed = uninstallOneRequestSchema.safeParse({
      kind: 'formula',
      name: 'ripgrep',
      zap: true
    });

    expect(parsed.success).toBe(false);
  });
});

describe('HomebrewService.installOne', () => {
  it('enqueues install jobs with the full install timeout', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'ok', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await service.installOne(
      { kind: 'formula', name: 'ripgrep' },
      {
        onProgress: () => undefined,
        onComplete: () => undefined,
        onFailed: () => undefined
      }
    );

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[1]).toBe(20 * 60 * 1000);
  });
});

describe('HomebrewService.uninstallOne', () => {
  it('enqueues uninstall jobs with the full uninstall timeout', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'ok', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await service.uninstallOne(
      { kind: 'cask', name: 'visual-studio-code', zap: true },
      {
        onProgress: () => undefined,
        onComplete: () => undefined,
        onFailed: () => undefined
      }
    );

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[1]).toBe(20 * 60 * 1000);
  });
});
