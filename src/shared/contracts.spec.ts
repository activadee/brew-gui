import { describe, expect, it } from 'vitest';

import {
  brewJobCompleteEventSchema,
  brewJobFailedEventSchema,
  brewJobProgressEventSchema,
  packageDetailsRequestSchema,
  packageDetailsSchema,
  windowChromeStateSchema,
  windowControlActionSchema,
  type WindowChromeState
} from './contracts';

describe('window chrome contracts', () => {
  it('parses supported window control actions', () => {
    expect(windowControlActionSchema.parse('close')).toBe('close');
    expect(windowControlActionSchema.parse('minimize')).toBe('minimize');
    expect(windowControlActionSchema.parse('toggleZoom')).toBe('toggleZoom');
    expect(windowControlActionSchema.parse('toggleFullScreen')).toBe('toggleFullScreen');
  });

  it('rejects unsupported window control actions', () => {
    const result = windowControlActionSchema.safeParse('zoom');
    expect(result.success).toBe(false);
  });

  it('parses window chrome state payloads', () => {
    const sample: WindowChromeState = {
      platform: 'darwin',
      isFocused: true,
      isMaximized: false,
      isFullScreen: false,
      canClose: true,
      canMinimize: true,
      canZoom: true,
      canFullScreen: true
    };

    expect(windowChromeStateSchema.parse(sample)).toEqual(sample);
  });

  it('rejects invalid platform values in chrome state payloads', () => {
    const result = windowChromeStateSchema.safeParse({
      platform: 'solaris',
      isFocused: false,
      isMaximized: false,
      isFullScreen: false,
      canClose: false,
      canMinimize: false,
      canZoom: false,
      canFullScreen: false
    });

    expect(result.success).toBe(false);
  });

  it('parses package details payloads', () => {
    const parsed = packageDetailsSchema.parse({
      id: 'formula:ripgrep',
      kind: 'formula',
      name: 'ripgrep',
      fullName: 'ripgrep',
      desc: 'Search tool',
      homepage: 'https://example.com',
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
      source: 'hybrid',
      fetchedAt: '2026-02-25T00:00:00.000Z'
    });

    expect(parsed.name).toBe('ripgrep');
    expect(parsed.versionSnapshot.stableVersion).toBe('14.1.0');
  });

  it('rejects invalid package detail requests', () => {
    const parsed = packageDetailsRequestSchema.safeParse({ kind: 'formula', name: '' });
    expect(parsed.success).toBe(false);
  });

  it('parses structured job progress payloads', () => {
    const parsed = brewJobProgressEventSchema.parse({
      jobId: 'job-1',
      action: 'install',
      command: 'brew install --formula ripgrep',
      stage: 'output',
      stream: 'stdout',
      message: 'Downloading...',
      packageName: 'ripgrep',
      kind: 'formula',
      timestamp: '2026-02-25T00:00:00.000Z'
    });

    expect(parsed.action).toBe('install');
    expect(parsed.stream).toBe('stdout');
  });

  it('rejects job progress payloads without command metadata', () => {
    const parsed = brewJobProgressEventSchema.safeParse({
      jobId: 'job-1',
      action: 'install',
      stage: 'queued',
      stream: 'system',
      message: 'Queued',
      packageName: 'ripgrep',
      kind: 'formula',
      timestamp: '2026-02-25T00:00:00.000Z'
    });

    expect(parsed.success).toBe(false);
  });

  it('parses structured complete/failed job payloads', () => {
    const completed = brewJobCompleteEventSchema.parse({
      jobId: 'job-1',
      action: 'upgradeAll',
      command: 'brew upgrade --formula && brew upgrade --cask',
      kind: 'system',
      packageName: null,
      success: true,
      exitCode: 0,
      durationMs: 3_200,
      output: 'done',
      timestamp: '2026-02-25T00:00:03.200Z'
    });

    const failed = brewJobFailedEventSchema.parse({
      jobId: 'job-2',
      action: 'pin',
      command: 'brew pin ripgrep',
      kind: 'formula',
      packageName: 'ripgrep',
      exitCode: 1,
      durationMs: 250,
      error: 'already pinned',
      output: 'Error: already pinned',
      timestamp: '2026-02-25T00:00:00.250Z'
    });

    expect(completed.kind).toBe('system');
    expect(failed.exitCode).toBe(1);
  });
});
