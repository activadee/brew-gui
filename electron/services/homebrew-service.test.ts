import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp'
  }
}));

import { buildInstallCommand, HomebrewService } from './homebrew-service';

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
