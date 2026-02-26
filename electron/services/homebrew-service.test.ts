import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  app: {
    getPath: () => '/tmp'
  }
}));

import {
  brewJobActionSchema,
  packageDetailsRequestSchema,
  pinOneRequestSchema,
  reinstallOneRequestSchema,
  serviceRequestSchema,
  tapAddRequestSchema,
  tapRemoveRequestSchema,
  unpinOneRequestSchema,
  uninstallOneRequestSchema,
  type PackageDetails
} from '../../src/shared/contracts';
import {
  buildInstallCommand,
  buildPinCommand,
  buildReinstallCommand,
  buildServiceRestartCommand,
  buildServiceStartCommand,
  buildServiceStopCommand,
  buildTapAddCommand,
  buildTapRemoveCommand,
  buildUninstallCommand,
  buildUnpinCommand,
  HomebrewService
} from './homebrew-service';
import { BrewCommandError } from './brew-runner';

function runGit(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString();
}

function configureGitAuthor(cwd: string): void {
  runGit(['config', 'user.email', 'brew-gui-tests@example.com'], cwd);
  runGit(['config', 'user.name', 'Brew GUI Tests'], cwd);
}

function commitFile(cwd: string, fileName: string, contents: string, message: string): void {
  writeFileSync(path.join(cwd, fileName), contents);
  runGit(['add', fileName], cwd);
  runGit(['commit', '-m', message], cwd);
}

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

describe('buildTapAddCommand', () => {
  it('builds tap add command', () => {
    expect(buildTapAddCommand({ name: 'sst/tap' })).toEqual(['tap', 'sst/tap']);
  });
});

describe('buildTapRemoveCommand', () => {
  it('builds tap remove command', () => {
    expect(buildTapRemoveCommand({ name: 'sst/tap' })).toEqual(['untap', 'sst/tap']);
  });
});

describe('service command builders', () => {
  it('builds service start command', () => {
    expect(buildServiceStartCommand({ name: 'unbound' })).toEqual(['services', 'start', 'unbound']);
  });

  it('builds service stop command', () => {
    expect(buildServiceStopCommand({ name: 'unbound' })).toEqual(['services', 'stop', 'unbound']);
  });

  it('builds service restart command', () => {
    expect(buildServiceRestartCommand({ name: 'unbound' })).toEqual(['services', 'restart', 'unbound']);
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

describe('tap request schemas', () => {
  it('accepts owner/repo tap names and rejects invalid ones', () => {
    expect(tapAddRequestSchema.safeParse({ name: 'sst/tap' }).success).toBe(true);
    expect(tapRemoveRequestSchema.safeParse({ name: 'steipete/tap' }).success).toBe(true);
    expect(tapAddRequestSchema.safeParse({ name: 'not-a-tap' }).success).toBe(false);
  });
});

describe('serviceRequestSchema', () => {
  it('accepts service names and rejects empty values', () => {
    expect(serviceRequestSchema.safeParse({ name: 'unbound' }).success).toBe(true);
    expect(serviceRequestSchema.safeParse({ name: '   ' }).success).toBe(false);
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
      deprecationReason: null,
      disableReason: null,
      replacement: null,
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

  it('prefers non-null lifecycle reason and replacement metadata during merge', async () => {
    const service = new HomebrewService() as any;
    service.resolveLocalDetails = vi.fn(async () =>
      createDetails({
        deprecated: true,
        deprecationReason: null,
        replacement: null,
        source: 'local'
      })
    );
    service.resolveRemoteDetails = vi.fn(async () =>
      createDetails({
        deprecated: true,
        deprecationReason: 'repo_archived',
        replacement: {
          kind: 'formula',
          name: 'mise'
        },
        source: 'remote'
      })
    );

    const result = await service.getPackageDetails(request);

    expect(result.source).toBe('hybrid');
    expect(result.deprecationReason).toBe('repo_archived');
    expect(result.replacement).toEqual({
      kind: 'formula',
      name: 'mise'
    });
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

describe('HomebrewService.getTaps', () => {
  it('treats protected taps without local clones as healthy in API mode', async () => {
    const missingPath = path.join(os.tmpdir(), `brew-gui-missing-${Date.now()}`);

    const service = new HomebrewService() as any;
    service.runner = {
      runText: vi.fn(async (args: string[]) => {
        if (args[0] === 'tap') {
          return {
            stdout: '',
            stderr: '',
            exitCode: 0
          };
        }

        if (args[0] === '--repository' && typeof args[1] === 'string') {
          return { stdout: `${missingPath}\n`, stderr: '', exitCode: 0 };
        }

        throw new Error(`Unexpected brew command ${args.join(' ')}`);
      })
    };

    const taps = await service.getTaps();

    const core = taps.find((tap: { name: string }) => tap.name === 'homebrew/core');
    const cask = taps.find((tap: { name: string }) => tap.name === 'homebrew/cask');

    expect(core?.health).toBe('healthy');
    expect(core?.syncState).toBe('upToDate');
    expect(core?.warning).toBeNull();
    expect(cask?.health).toBe('healthy');
    expect(cask?.syncState).toBe('upToDate');
    expect(cask?.warning).toBeNull();
  });

  it('maps local git status into tap sync and health states', async () => {
    const sandbox = mkdtempSync(path.join(os.tmpdir(), 'brew-gui-taps-'));

    try {
      const remote = path.join(sandbox, 'remote.git');
      runGit(['init', '--bare', remote], sandbox);

      const seed = path.join(sandbox, 'seed');
      runGit(['clone', remote, seed], sandbox);
      configureGitAuthor(seed);
      commitFile(seed, 'README.md', 'seed', 'seed commit');
      runGit(['push', 'origin', 'HEAD'], seed);

      const upToDatePath = path.join(sandbox, 'up-to-date');
      runGit(['clone', remote, upToDatePath], sandbox);
      configureGitAuthor(upToDatePath);

      const dirtyPath = path.join(sandbox, 'dirty');
      runGit(['clone', remote, dirtyPath], sandbox);
      configureGitAuthor(dirtyPath);
      writeFileSync(path.join(dirtyPath, 'DIRTY.txt'), 'dirty');

      const aheadPath = path.join(sandbox, 'ahead');
      runGit(['clone', remote, aheadPath], sandbox);
      configureGitAuthor(aheadPath);
      commitFile(aheadPath, 'ahead.txt', 'ahead', 'ahead commit');

      const behindPath = path.join(sandbox, 'behind');
      runGit(['clone', remote, behindPath], sandbox);
      configureGitAuthor(behindPath);

      const upstreamWriter = path.join(sandbox, 'upstream-writer');
      runGit(['clone', remote, upstreamWriter], sandbox);
      configureGitAuthor(upstreamWriter);
      commitFile(upstreamWriter, 'upstream.txt', 'upstream', 'upstream commit');
      runGit(['push', 'origin', 'HEAD'], upstreamWriter);
      runGit(['fetch', 'origin'], behindPath);

      const noUpstreamPath = path.join(sandbox, 'no-upstream');
      runGit(['init', noUpstreamPath], sandbox);
      configureGitAuthor(noUpstreamPath);
      commitFile(noUpstreamPath, 'no-upstream.txt', 'local', 'local commit');

      const tapPaths: Record<string, string> = {
        'homebrew/core': upToDatePath,
        'homebrew/cask': upToDatePath,
        'user/up-to-date': upToDatePath,
        'user/dirty': dirtyPath,
        'user/ahead': aheadPath,
        'user/behind': behindPath,
        'user/no-upstream': noUpstreamPath
      };

      const service = new HomebrewService() as any;
      service.runner = {
        runText: vi.fn(async (args: string[]) => {
          if (args[0] === 'tap') {
            return {
              stdout: ['user/up-to-date', 'user/dirty', 'user/ahead', 'user/behind', 'user/no-upstream'].join('\n'),
              stderr: '',
              exitCode: 0
            };
          }

          if (args[0] === '--repository' && typeof args[1] === 'string') {
            const repositoryPath = tapPaths[args[1]];
            if (!repositoryPath) {
              throw new Error(`Unknown tap ${args[1]}`);
            }
            return { stdout: `${repositoryPath}\n`, stderr: '', exitCode: 0 };
          }

          throw new Error(`Unexpected brew command ${args.join(' ')}`);
        })
      };

      const taps = await service.getTaps();

      const upToDate = taps.find((tap: { name: string }) => tap.name === 'user/up-to-date');
      const dirty = taps.find((tap: { name: string }) => tap.name === 'user/dirty');
      const ahead = taps.find((tap: { name: string }) => tap.name === 'user/ahead');
      const behind = taps.find((tap: { name: string }) => tap.name === 'user/behind');
      const noUpstream = taps.find((tap: { name: string }) => tap.name === 'user/no-upstream');

      expect(upToDate?.syncState).toBe('upToDate');
      expect(upToDate?.health).toBe('healthy');

      expect(dirty?.dirty).toBe(true);
      expect(dirty?.health).toBe('attention');

      expect(ahead?.syncState).toBe('ahead');
      expect(ahead?.ahead).toBeGreaterThan(0);
      expect(ahead?.health).toBe('attention');

      expect(behind?.syncState).toBe('behind');
      expect(behind?.behind).toBeGreaterThan(0);
      expect(behind?.health).toBe('attention');

      expect(noUpstream?.syncState).toBe('noUpstream');
      expect(noUpstream?.health).toBe('attention');
    } finally {
      rmSync(sandbox, { recursive: true, force: true });
    }
  }, 20_000);
});

describe('HomebrewService.getServices', () => {
  it('parses and sorts service rows while normalizing unknown statuses', async () => {
    const service = new HomebrewService() as any;
    const runJson = vi.fn(async () => [
      {
        name: 'zebra-service',
        status: 'started',
        user: 'a1b3826',
        file: '/opt/homebrew/opt/zebra/homebrew.mxcl.zebra-service.plist',
        exit_code: null
      },
      {
        name: 'alpha-service',
        status: 'strange-status',
        user: null,
        file: '',
        exit_code: '8'
      },
      {
        name: '',
        status: 'none',
        user: null,
        file: null,
        exit_code: null
      }
    ]);

    service.runner = { runJson };

    const services = await service.getServices();

    expect(runJson).toHaveBeenCalledWith(['services', 'list', '--json'], expect.any(Object));
    expect(services).toHaveLength(2);
    expect(services[0]?.name).toBe('alpha-service');
    expect(services[0]?.status).toBe('unknown');
    expect(services[0]?.exitCode).toBe(8);
    expect(services[1]?.name).toBe('zebra-service');
    expect(services[1]?.status).toBe('started');
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

describe('HomebrewService.tapAdd', () => {
  it('enqueues tap add jobs with tap timeout and emits action metadata', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'tapped', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.tapAdd(
      { name: 'sst/tap' },
      {
        onProgress,
        onComplete,
        onFailed: () => undefined
      }
    );

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[1]).toBe(10 * 60 * 1000);
    expect(onProgress.mock.calls[0]?.[0].action).toBe('tapAdd');
    expect(result.action).toBe('tapAdd');
    expect(result.kind).toBe('system');
    expect(result.command).toBe('brew tap sst/tap');
  });
});

describe('HomebrewService.tapRemove', () => {
  it('rejects protected taps before enqueueing work', async () => {
    const service = new HomebrewService() as any;
    const enqueue = vi.fn();

    service.mutationQueue = { enqueue };

    await expect(
      service.tapRemove(
        { name: 'homebrew/core' },
        {
          onProgress: () => undefined,
          onComplete: () => undefined,
          onFailed: () => undefined
        }
      )
    ).rejects.toThrow('Cannot remove protected tap homebrew/core.');
    expect(enqueue).not.toHaveBeenCalled();
  });

  it('rejects protected tap aliases before enqueueing work', async () => {
    const aliases = ['homebrew/homebrew-core', 'homebrew/homebrew-cask'];

    for (const name of aliases) {
      const service = new HomebrewService() as any;
      const enqueue = vi.fn();

      service.mutationQueue = { enqueue };

      await expect(
        service.tapRemove(
          { name },
          {
            onProgress: () => undefined,
            onComplete: () => undefined,
            onFailed: () => undefined
          }
        )
      ).rejects.toThrow(`Cannot remove protected tap ${name}.`);

      expect(enqueue).not.toHaveBeenCalled();
    }
  });

  it('enqueues tap remove jobs with remove timeout', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'untapped', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await service.tapRemove(
      { name: 'sst/tap' },
      {
        onProgress: () => undefined,
        onComplete: () => undefined,
        onFailed: () => undefined
      }
    );

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[1]).toBe(5 * 60 * 1000);
  });

  it('emits structured failed events when untap command fails', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => {
      throw new BrewCommandError('brew untap failed', {
        command: ['untap', 'sst/tap'],
        exitCode: 1,
        stdout: '',
        stderr: 'Error: tap still in use'
      });
    });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onFailed = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await expect(
      service.tapRemove(
        { name: 'sst/tap' },
        {
          onProgress: () => undefined,
          onComplete: () => undefined,
          onFailed
        }
      )
    ).rejects.toThrow();

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed.mock.calls[0]?.[0].action).toBe('tapRemove');
    expect(onFailed.mock.calls[0]?.[0].kind).toBe('system');
    expect(onFailed.mock.calls[0]?.[0].command).toBe('brew untap sst/tap');
    expect(onFailed.mock.calls[0]?.[0].exitCode).toBe(1);
  });
});

describe('HomebrewService.getCleanupPreview', () => {
  it('parses dry-run entries with size and files metadata', async () => {
    const service = new HomebrewService() as any;
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const runText = vi.fn(async () => ({
      stdout: [
        'Would remove: /opt/homebrew/Cellar/foo/1.0 (237B)',
        'Would remove: /opt/homebrew/Library/Homebrew/vendor/portable-ruby/3.4.7 (1,585 files, 35.6MB)',
        '==> This operation would free approximately 35.6MB of disk space.'
      ].join('\n'),
      stderr: '',
      exitCode: 0
    }));

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.getCleanupPreview();

    expect(runText).toHaveBeenCalledWith(['cleanup', '--dry-run'], expect.any(Object));
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[1]).toBe(10 * 60 * 1000);
    expect(result.command).toBe('brew cleanup --dry-run');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({
      path: '/opt/homebrew/Cellar/foo/1.0',
      sizeBytes: 237,
      fileCount: null
    });
    expect(result.items[1]).toMatchObject({
      fileCount: 1585
    });
    expect(result.totalBytes).toBe(37329306);
  });

  it('sets totalBytes to zero for explicit nothing-to-do output', async () => {
    const service = new HomebrewService() as any;
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const runText = vi.fn(async () => ({
      stdout: 'Nothing to do.\n',
      stderr: '',
      exitCode: 0
    }));

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.getCleanupPreview();

    expect(result.items).toHaveLength(0);
    expect(result.totalBytes).toBe(0);
  });
});

describe('HomebrewService.runCleanup', () => {
  it('enqueues cleanup jobs with cleanup timeout and action metadata', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'clean', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.runCleanup({
      onProgress,
      onComplete,
      onFailed: () => undefined
    });

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[1]).toBe(30 * 60 * 1000);
    expect(onProgress.mock.calls[0]?.[0].action).toBe('cleanup');
    expect(result.action).toBe('cleanup');
    expect(result.command).toBe('brew cleanup');
    expect(result.kind).toBe('system');
  });

  it('emits structured failed events when cleanup command fails', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => {
      throw new BrewCommandError('brew cleanup failed', {
        command: ['cleanup'],
        exitCode: 1,
        stdout: '',
        stderr: 'Error: cleanup failed'
      });
    });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onFailed = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await expect(
      service.runCleanup({
        onProgress: () => undefined,
        onComplete: () => undefined,
        onFailed
      })
    ).rejects.toThrow();

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed.mock.calls[0]?.[0]).toMatchObject({
      action: 'cleanup',
      kind: 'system',
      command: 'brew cleanup',
      exitCode: 1
    });
  });
});

describe('HomebrewService service actions', () => {
  it('enqueues service-start jobs with service timeout and action metadata', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'started', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.serviceStart(
      { name: 'unbound' },
      {
        onProgress,
        onComplete,
        onFailed: () => undefined
      }
    );

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[1]).toBe(5 * 60 * 1000);
    expect(onProgress.mock.calls[0]?.[0].action).toBe('serviceStart');
    expect(result.action).toBe('serviceStart');
    expect(result.kind).toBe('system');
    expect(result.packageName).toBe('unbound');
    expect(result.command).toBe('brew services start unbound');
  });

  it('enqueues service-stop jobs with service timeout and action metadata', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({ stdout: 'stopped', stderr: '', exitCode: 0 }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.serviceStop(
      { name: 'unbound' },
      {
        onProgress,
        onComplete,
        onFailed: () => undefined
      }
    );

    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue.mock.calls[0]?.[1]).toBe(5 * 60 * 1000);
    expect(onProgress.mock.calls[0]?.[0].action).toBe('serviceStop');
    expect(result.action).toBe('serviceStop');
    expect(result.command).toBe('brew services stop unbound');
  });

  it('emits structured failed events when service restart fails', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => {
      throw new BrewCommandError('brew services restart failed', {
        command: ['services', 'restart', 'unbound'],
        exitCode: 1,
        stdout: '',
        stderr: 'Error: failed to restart'
      });
    });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onFailed = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await expect(
      service.serviceRestart(
        { name: 'unbound' },
        {
          onProgress: () => undefined,
          onComplete: () => undefined,
          onFailed
        }
      )
    ).rejects.toThrow();

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed.mock.calls[0]?.[0]).toMatchObject({
      action: 'serviceRestart',
      kind: 'system',
      packageName: 'unbound',
      command: 'brew services restart unbound',
      exitCode: 1
    });
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

describe('HomebrewService.getSmartUpgradePlan', () => {
  it('builds smart-upgrade batches with pinned and blocked exclusions', async () => {
    const service = new HomebrewService() as any;
    service.getOutdated = vi.fn(async () => [
      {
        id: 'formula:ripgrep',
        kind: 'formula',
        name: 'ripgrep',
        installedVersions: ['14.0.0'],
        currentVersion: '14.0.1',
        pinned: false
      },
      {
        id: 'formula:openssl@3',
        kind: 'formula',
        name: 'openssl@3',
        installedVersions: ['3.1.0'],
        currentVersion: '3.2.0',
        pinned: true
      },
      {
        id: 'cask:firefox',
        kind: 'cask',
        name: 'firefox',
        installedVersions: ['120.0.0'],
        currentVersion: '121.0.0',
        pinned: false
      }
    ]);

    const plan = await service.getSmartUpgradePlan([
      {
        kind: 'formula',
        name: 'ripgrep'
      }
    ]);

    expect(plan.totals.outdated).toBe(3);
    expect(plan.totals.excludedPinned).toBe(1);
    expect(plan.totals.excludedBlocked).toBe(1);
    expect(plan.excludedPinned.map((item: { name: string }) => item.name)).toEqual(['openssl@3']);
    expect(plan.excludedBlocked.map((item: { name: string }) => item.name)).toEqual(['ripgrep']);
    expect(plan.high.map((item: { name: string }) => item.name)).toEqual(['firefox']);
  });
});

describe('HomebrewService.upgradeSmart', () => {
  it('runs only selected risk batches in low->medium->high order', async () => {
    const service = new HomebrewService() as any;
    service.getOutdated = vi.fn(async () => [
      {
        id: 'formula:bat',
        kind: 'formula',
        name: 'bat',
        installedVersions: ['0.24.0'],
        currentVersion: '0.24.1',
        pinned: false
      },
      {
        id: 'formula:fd',
        kind: 'formula',
        name: 'fd',
        installedVersions: ['9.0.0'],
        currentVersion: '9.1.0',
        pinned: false
      },
      {
        id: 'cask:firefox',
        kind: 'cask',
        name: 'firefox',
        installedVersions: ['120.0.0'],
        currentVersion: '121.0.0',
        pinned: false
      }
    ]);
    const runText = vi.fn(async () => ({
      stdout: 'ok',
      stderr: '',
      exitCode: 0
    }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onProgress = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.upgradeSmart(
      { risks: ['low', 'high'] },
      [],
      {
        onProgress,
        onComplete: () => undefined,
        onFailed: () => undefined
      }
    );

    expect(runText.mock.calls.map((call: [string[]]) => call[0])).toEqual([
      ['upgrade', '--formula', 'bat'],
      ['upgrade', '--cask', 'firefox']
    ]);
    expect(onProgress.mock.calls[0]?.[0].action).toBe('upgradeSmart');
    expect(result.action).toBe('upgradeSmart');
    expect(result.command).toContain('smart-upgrade');
  });

  it('continues after package failures and emits a final failed event summary', async () => {
    const service = new HomebrewService() as any;
    service.getOutdated = vi.fn(async () => [
      {
        id: 'formula:bat',
        kind: 'formula',
        name: 'bat',
        installedVersions: ['0.24.0'],
        currentVersion: '0.24.1',
        pinned: false
      },
      {
        id: 'formula:ripgrep',
        kind: 'formula',
        name: 'ripgrep',
        installedVersions: ['14.0.0'],
        currentVersion: '14.0.1',
        pinned: false
      }
    ]);
    const runText = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new BrewCommandError('upgrade failed', {
          command: ['upgrade', '--formula', 'bat'],
          exitCode: 1,
          stdout: '',
          stderr: 'Error: bat failed'
        });
      })
      .mockResolvedValueOnce({
        stdout: 'ripgrep upgraded',
        stderr: '',
        exitCode: 0
      });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onFailed = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await expect(
      service.upgradeSmart(
        { risks: ['low'] },
        [],
        {
          onProgress: () => undefined,
          onComplete: () => undefined,
          onFailed
        }
      )
    ).rejects.toThrow('Smart upgrade completed with failures');

    expect(runText).toHaveBeenCalledTimes(2);
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed.mock.calls[0]?.[0]).toMatchObject({
      action: 'upgradeSmart',
      kind: 'system'
    });
  });
});

describe('HomebrewService.runDoctor', () => {
  it('parses warning diagnostics from exit-code 1 output and emits completion metadata', async () => {
    const service = new HomebrewService() as any;
    const diagnosticOutput = [
      'Please note that these warnings are just used to help the Homebrew maintainers',
      'with debugging if you file an issue. If everything you use Homebrew for is',
      "working fine: please don't worry or file an issue; just ignore this. Thanks!",
      '',
      'Warning: Some installed casks are deprecated or disabled.',
      'You should find replacements for the following casks:',
      '  powershell',
      '',
      'Warning: You have the following deprecated, official taps tapped:',
      '  Homebrew/homebrew-services',
      'Untap them with `brew untap`.'
    ].join('\n');
    const runText = vi.fn(async () => {
      throw new BrewCommandError('brew doctor reported warnings', {
        command: ['doctor'],
        exitCode: 1,
        stdout: diagnosticOutput,
        stderr: ''
      });
    });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onComplete = vi.fn();
    const onFailed = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.runDoctor({
      onProgress: () => undefined,
      onComplete,
      onFailed
    });

    expect(result.exitCode).toBe(1);
    expect(result.counts.warning).toBe(2);
    expect(result.findings[1]?.suggestedFix).toContain('brew untap');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({
      action: 'doctor',
      command: 'brew doctor',
      kind: 'system',
      exitCode: 1
    });
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('returns zero findings for healthy doctor output', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => ({
      stdout: 'Your system is ready to brew.\n',
      stderr: '',
      exitCode: 0
    }));
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    const result = await service.runDoctor({
      onProgress: () => undefined,
      onComplete: () => undefined,
      onFailed: () => undefined
    });

    expect(result.counts).toEqual({
      error: 0,
      warning: 0,
      info: 0
    });
    expect(result.findings).toHaveLength(0);
  });

  it('emits structured failed events when doctor command fails with non-diagnostic output', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => {
      throw new BrewCommandError('brew doctor failed', {
        command: ['doctor'],
        exitCode: 2,
        stdout: '',
        stderr: 'fatal: doctor command failed'
      });
    });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onFailed = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await expect(
      service.runDoctor({
        onProgress: () => undefined,
        onComplete: () => undefined,
        onFailed
      })
    ).rejects.toThrow();

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed.mock.calls[0]?.[0]).toMatchObject({
      action: 'doctor',
      command: 'brew doctor',
      kind: 'system',
      exitCode: 2
    });
  });

  it('does not treat info-only exit-code 1 output as parseable diagnostics', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async () => {
      throw new BrewCommandError('brew doctor failed', {
        command: ['doctor'],
        exitCode: 1,
        stdout: 'fatal: doctor command failed',
        stderr: ''
      });
    });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onComplete = vi.fn();
    const onFailed = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await expect(
      service.runDoctor({
        onProgress: () => undefined,
        onComplete,
        onFailed
      })
    ).rejects.toThrow();

    expect(onComplete).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onFailed.mock.calls[0]?.[0]).toMatchObject({
      action: 'doctor',
      command: 'brew doctor',
      kind: 'system',
      exitCode: 1
    });
  });

  it('emits queued, running, and output progress events for doctor runs', async () => {
    const service = new HomebrewService() as any;
    const runText = vi.fn(async (_command: string[], options: { onStdout?: (chunk: string) => void }) => {
      options.onStdout?.('Checking...\n');
      return {
        stdout: 'Your system is ready to brew.\n',
        stderr: '',
        exitCode: 0
      };
    });
    const enqueue = vi.fn(async (task: (signal: AbortSignal) => Promise<unknown>) =>
      task(new AbortController().signal)
    );
    const onProgress = vi.fn();
    const onComplete = vi.fn();

    service.runner = { runText };
    service.mutationQueue = { enqueue };

    await service.runDoctor({
      onProgress,
      onComplete,
      onFailed: () => undefined
    });

    const stages = onProgress.mock.calls.map((call) => call[0].stage);
    expect(stages).toContain('queued');
    expect(stages).toContain('running');
    expect(stages).toContain('output');
    expect(onComplete.mock.calls[0]?.[0].action).toBe('doctor');
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
