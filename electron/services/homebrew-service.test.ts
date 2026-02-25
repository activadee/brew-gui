import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp'
  }
}));

import {
  brewJobActionSchema,
  packageDetailsRequestSchema,
  reinstallOneRequestSchema,
  pinOneRequestSchema,
  unpinOneRequestSchema,
  uninstallOneRequestSchema,
  type PackageDetails
} from '../../src/shared/contracts';
import {
  buildInstallCommand,
  buildPinCommand,
  buildReinstallCommand,
  buildUninstallCommand,
  buildUnpinCommand,
  HomebrewService
} from './homebrew-service';
import { BrewCommandError } from './brew-runner';

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

describe('buildReinstallCommand', () => {
  it('builds formula reinstall command', () => {
    expect(buildReinstallCommand({ kind: 'formula', name: 'ripgrep' })).toEqual([
      'reinstall',
      '--formula',
      'ripgrep'
    ]);
  });

  it('builds cask reinstall command without zap', () => {
    expect(buildReinstallCommand({ kind: 'cask', name: 'visual-studio-code' })).toEqual([
      'reinstall',
      '--cask',
      'visual-studio-code'
    ]);
  });

  it('builds cask reinstall command with zap', () => {
    expect(buildReinstallCommand({ kind: 'cask', name: 'visual-studio-code', zap: true })).toEqual([
      'reinstall',
      '--cask',
      '--zap',
      'visual-studio-code'
    ]);
  });
});

describe('buildPinCommand', () => {
  it('builds pin command', () => {
    expect(buildPinCommand({ kind: 'formula', name: 'ripgrep' })).toEqual(['pin', 'ripgrep']);
  });
});

describe('buildUnpinCommand', () => {
  it('builds unpin command', () => {
    expect(buildUnpinCommand({ kind: 'formula', name: 'ripgrep' })).toEqual(['unpin', 'ripgrep']);
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

describe('reinstallOneRequestSchema', () => {
  it('rejects zap for formula reinstall requests', () => {
    const parsed = reinstallOneRequestSchema.safeParse({
      kind: 'formula',
      name: 'ripgrep',
      zap: true
    });

    expect(parsed.success).toBe(false);
  });
});

describe('pinOneRequestSchema', () => {
  it('rejects cask pin requests', () => {
    const parsed = pinOneRequestSchema.safeParse({
      kind: 'cask',
      name: 'visual-studio-code'
    });

    expect(parsed.success).toBe(false);
  });
});

describe('unpinOneRequestSchema', () => {
  it('rejects cask unpin requests', () => {
    const parsed = unpinOneRequestSchema.safeParse({
      kind: 'cask',
      name: 'visual-studio-code'
    });

    expect(parsed.success).toBe(false);
  });
});

describe('packageDetailsRequestSchema', () => {
  it('rejects empty package names', () => {
    const parsed = packageDetailsRequestSchema.safeParse({
      kind: 'formula',
      name: ''
    });

    expect(parsed.success).toBe(false);
  });
});

describe('HomebrewService.getPackageDetails', () => {
  const request = { kind: 'formula', name: 'ripgrep' } as const;

  const createDetails = (overrides: Partial<PackageDetails> = {}): PackageDetails => {
    const base: PackageDetails = {
      id: 'formula:ripgrep',
      kind: 'formula',
      name: 'ripgrep',
      fullName: 'ripgrep',
      desc: 'Search recursively',
      homepage: 'https://example.com/ripgrep',
      tap: 'homebrew/core',
      license: 'Unlicense',
      dependencies: [{ key: 'runtime', label: 'Runtime dependencies', items: ['pcre2'] }],
      caveats: null,
      versionSnapshot: {
        installedVersions: ['14.1.0'],
        currentVersion: '14.1.0',
        stableVersion: '14.1.0',
        headVersion: null
      },
      deprecated: false,
      disabled: false,
      pinned: false,
      warnings: [],
      source: 'local',
      fetchedAt: '2026-02-25T00:00:00.000Z'
    };

    return {
      ...base,
      ...overrides,
      dependencies: overrides.dependencies ?? base.dependencies,
      warnings: overrides.warnings ?? base.warnings,
      versionSnapshot: {
        ...base.versionSnapshot,
        ...(overrides.versionSnapshot ?? {})
      }
    };
  };

  it('returns local details when remote lookup fails', async () => {
    const service = new HomebrewService() as any;
    service.resolveLocalDetails = vi.fn(async () => createDetails({ source: 'local' }));
    service.resolveRemoteDetails = vi.fn(async () => {
      throw new Error('remote unavailable');
    });

    const result = await service.getPackageDetails(request);

    expect(result.source).toBe('local');
    expect(result.name).toBe('ripgrep');
    expect(result.warnings.some((warning) => warning.includes('Remote Homebrew API unavailable'))).toBe(
      true
    );
  });

  it('returns remote details when local lookup fails', async () => {
    const service = new HomebrewService() as any;
    service.resolveLocalDetails = vi.fn(async () => {
      throw new Error('local unavailable');
    });
    service.resolveRemoteDetails = vi.fn(async () => createDetails({ source: 'remote', pinned: false }));

    const result = await service.getPackageDetails(request);

    expect(result.source).toBe('remote');
    expect(result.name).toBe('ripgrep');
    expect(result.warnings.some((warning) => warning.includes('Local brew info unavailable'))).toBe(true);
  });

  it('merges local and remote details into hybrid payload', async () => {
    const service = new HomebrewService() as any;
    service.resolveLocalDetails = vi.fn(async () =>
      createDetails({
        desc: null,
        homepage: null,
        pinned: true,
        dependencies: [{ key: 'runtime', label: 'Runtime dependencies', items: ['pcre2'] }],
        source: 'local'
      })
    );
    service.resolveRemoteDetails = vi.fn(async () =>
      createDetails({
        desc: 'Remote description',
        homepage: 'https://formulae.brew.sh/formula/ripgrep',
        dependencies: [{ key: 'build', label: 'Build dependencies', items: ['cmake'] }],
        source: 'remote'
      })
    );

    const result = await service.getPackageDetails(request);

    expect(result.source).toBe('hybrid');
    expect(result.desc).toBe('Remote description');
    expect(result.homepage).toBe('https://formulae.brew.sh/formula/ripgrep');
    expect(result.pinned).toBe(true);
    expect(result.dependencies.map((group) => group.key)).toEqual(
      expect.arrayContaining(['runtime', 'build'])
    );
  });

  it('returns a cache result when the cache entry is still fresh', async () => {
    const service = new HomebrewService() as any;
    service.detailsCache.set('formula:ripgrep', {
      details: createDetails({ source: 'hybrid' }),
      cachedAt: Date.now()
    });
    service.resolveLocalDetails = vi.fn();
    service.resolveRemoteDetails = vi.fn();

    const result = await service.getPackageDetails(request);

    expect(result.source).toBe('cache');
    expect(service.resolveLocalDetails).not.toHaveBeenCalled();
    expect(service.resolveRemoteDetails).not.toHaveBeenCalled();
  });

  it('falls back to stale cache when live lookups fail', async () => {
    const service = new HomebrewService() as any;
    service.detailsCache.set('formula:ripgrep', {
      details: createDetails({ source: 'hybrid', warnings: ['cached baseline warning'] }),
      cachedAt: Date.now() - 11 * 60 * 1000
    });
    service.resolveLocalDetails = vi.fn(async () => {
      throw new Error('local unavailable');
    });
    service.resolveRemoteDetails = vi.fn(async () => {
      throw new Error('remote unavailable');
    });

    const result = await service.getPackageDetails(request);

    expect(result.source).toBe('cache');
    expect(result.warnings.some((warning) => warning.includes('Using cached package details'))).toBe(true);
  });

  it('throws when both local and remote lookups fail without cache', async () => {
    const service = new HomebrewService() as any;
    service.resolveLocalDetails = vi.fn(async () => {
      throw new Error('local unavailable');
    });
    service.resolveRemoteDetails = vi.fn(async () => {
      throw new Error('remote unavailable');
    });

    await expect(service.getPackageDetails(request)).rejects.toThrow(
      'Unable to load package details for formula:ripgrep.'
    );
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

  it('invalidates package details cache for the installed package', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'ok', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    service.runner = { runText };
    service.mutationQueue = { enqueue };
    service.detailsCache.set('formula:ripgrep', {
      details: { id: 'formula:ripgrep' },
      cachedAt: Date.now()
    });

    await service.installOne(
      { kind: 'formula', name: 'ripgrep' },
      {
        onProgress: () => undefined,
        onComplete: () => undefined,
        onFailed: () => undefined
      }
    );

    expect(service.detailsCache.has('formula:ripgrep')).toBe(false);
  });

  it('emits structured lifecycle events with action and command metadata', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'ok', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    const onProgress = vi.fn();
    const onComplete = vi.fn();
    const onFailed = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const completion = await service.installOne(
      { kind: 'formula', name: 'ripgrep' },
      { onProgress, onComplete, onFailed }
    );

    expect(onProgress).toHaveBeenCalled();
    const queued = onProgress.mock.calls.find((call) => call[0].stage === 'queued')?.[0];
    const running = onProgress.mock.calls.find((call) => call[0].stage === 'running')?.[0];

    expect(queued?.action).toBe('install');
    expect(queued?.command).toBe('brew install --formula ripgrep');
    expect(running?.stream).toBe('system');
    expect(brewJobActionSchema.safeParse(completion.action).success).toBe(true);
    expect(completion.command).toBe('brew install --formula ripgrep');
    expect(completion.exitCode).toBe(0);
    expect(completion.durationMs).toBeGreaterThanOrEqual(0);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('emits failed events with structured exit code metadata', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => {
      throw new BrewCommandError('brew install failed', {
        command: ['install', '--formula', 'ripgrep'],
        exitCode: 1,
        stdout: '',
        stderr: 'Error: failed'
      });
    });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    const onFailed = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await expect(
      service.installOne(
        { kind: 'formula', name: 'ripgrep' },
        {
          onProgress: () => undefined,
          onComplete: () => undefined,
          onFailed
        }
      )
    ).rejects.toThrow();

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed.mock.calls[0]?.[0].action).toBe('install');
    expect(onFailed.mock.calls[0]?.[0].exitCode).toBe(1);
    expect(onFailed.mock.calls[0]?.[0].command).toBe('brew install --formula ripgrep');
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

describe('HomebrewService.reinstallOne', () => {
  it('enqueues reinstall jobs with the full reinstall timeout', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'ok', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await service.reinstallOne(
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

describe('HomebrewService.pinOne', () => {
  it('enqueues pin jobs with the pin timeout', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'ok', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await service.pinOne(
      { kind: 'formula', name: 'ripgrep' },
      {
        onProgress: () => undefined,
        onComplete: () => undefined,
        onFailed: () => undefined
      }
    );

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[1]).toBe(5 * 60 * 1000);
  });
});

describe('HomebrewService.unpinOne', () => {
  it('enqueues unpin jobs with the unpin timeout', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'ok', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await service.unpinOne(
      { kind: 'formula', name: 'ripgrep' },
      {
        onProgress: () => undefined,
        onComplete: () => undefined,
        onFailed: () => undefined
      }
    );

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[1]).toBe(5 * 60 * 1000);
  });
});

describe('HomebrewService.upgradeAll', () => {
  it('invalidates all package details cache entries after upgrade-all', async () => {
    const service = new HomebrewService() as any;
    const runText = vi
      .fn()
      .mockResolvedValueOnce({ stdout: 'formula ok', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'cask ok', stderr: '', exitCode: 0 });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    service.runner = { runText };
    service.mutationQueue = { enqueue };
    service.detailsCache.set('formula:ripgrep', {
      details: { id: 'formula:ripgrep' },
      cachedAt: Date.now()
    });
    service.detailsCache.set('cask:firefox', {
      details: { id: 'cask:firefox' },
      cachedAt: Date.now()
    });

    await service.upgradeAll({
      onProgress: () => undefined,
      onComplete: () => undefined,
      onFailed: () => undefined
    });

    expect(service.detailsCache.size).toBe(0);
  });

  it('emits upgrade-all lifecycle with structured action metadata', async () => {
    const service = new HomebrewService() as any;
    const runText = vi
      .fn()
      .mockResolvedValueOnce({ stdout: 'formula ok', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: 'cask ok', stderr: '', exitCode: 0 });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.upgradeAll({
      onProgress,
      onComplete,
      onFailed: () => undefined
    });

    expect(onProgress).toHaveBeenCalled();
    expect(onProgress.mock.calls[0]?.[0].action).toBe('upgradeAll');
    expect(result.action).toBe('upgradeAll');
    expect(result.kind).toBe('system');
    expect(result.command).toContain('brew upgrade');
  });
});

describe('HomebrewService.syncMetadata', () => {
  it('runs sync metadata on the mutation queue and emits structured job events', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'updated', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.syncMetadata({
      onProgress,
      onComplete,
      onFailed: () => undefined
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(onProgress.mock.calls[0]?.[0].action).toBe('syncMetadata');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });
});
