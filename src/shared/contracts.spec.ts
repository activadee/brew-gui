import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SETTINGS,
  appSettingsSchema,
  brewDoctorFindingSchema,
  brewDoctorResultSchema,
  brewJobCompleteEventSchema,
  brewJobFailedEventSchema,
  brewJobProgressEventSchema,
  installedPackageSchema,
  brewServiceSchema,
  cleanupPreviewResultSchema,
  packageDetailsRequestSchema,
  packageDetailsSchema,
  quietHoursTimeSchema,
  serviceRequestSchema,
  tapAddRequestSchema,
  tapRemoveRequestSchema,
  brewTapSchema,
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

  it('parses app settings payloads with scheduled jobs and quiet hours', () => {
    const parsed = appSettingsSchema.parse({
      ...DEFAULT_SETTINGS,
      scheduledCleanupEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '21:30',
      quietHoursEnd: '06:15'
    });

    expect(parsed.scheduledMetadataSyncEnabled).toBe(true);
    expect(parsed.scheduledCleanupEnabled).toBe(true);
    expect(parsed.quietHoursStart).toBe('21:30');
    expect(parsed.quietHoursEnd).toBe('06:15');
  });

  it('rejects invalid quiet-hours times', () => {
    expect(quietHoursTimeSchema.safeParse('24:00').success).toBe(false);
    expect(quietHoursTimeSchema.safeParse('7:00').success).toBe(false);
    expect(
      appSettingsSchema.safeParse({
        ...DEFAULT_SETTINGS,
        quietHoursStart: '25:15'
      }).success
    ).toBe(false);
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
      deprecationReason: null,
      disableReason: null,
      replacement: null,
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

  it('parses installed package payloads with lifecycle metadata', () => {
    const parsed = installedPackageSchema.parse({
      id: 'formula:aftman',
      kind: 'formula',
      name: 'aftman',
      desc: 'Tool manager',
      installedVersion: '0.1.0',
      currentVersion: '0.1.0',
      pinned: false,
      tap: 'homebrew/core',
      homepage: 'https://example.com/aftman',
      deprecated: true,
      disabled: false,
      deprecationReason: 'repo_archived',
      disableReason: null,
      replacement: {
        kind: 'formula',
        name: 'mise'
      }
    });

    expect(parsed.deprecated).toBe(true);
    expect(parsed.replacement?.name).toBe('mise');
  });

  it('parses tap payloads and validates tap request names', () => {
    const tap = brewTapSchema.parse({
      name: 'sst/tap',
      official: false,
      protected: false,
      userTapped: true,
      path: '/opt/homebrew/Library/Taps/sst/homebrew-tap',
      remote: 'https://github.com/sst/homebrew-tap',
      branch: 'main',
      upstream: 'origin/main',
      ahead: 0,
      behind: 2,
      dirty: false,
      syncState: 'behind',
      health: 'attention',
      lastCheckedAt: '2026-02-25T00:00:00.000Z',
      warning: null
    });
    const addValid = tapAddRequestSchema.safeParse({ name: 'sst/tap' });
    const addInvalid = tapAddRequestSchema.safeParse({ name: 'not-a-tap' });
    const removeValid = tapRemoveRequestSchema.safeParse({ name: 'steipete/tap' });

    expect(tap.name).toBe('sst/tap');
    expect(addValid.success).toBe(true);
    expect(addInvalid.success).toBe(false);
    expect(removeValid.success).toBe(true);
  });

  it('parses services payloads and validates service requests', () => {
    const service = brewServiceSchema.parse({
      name: 'postgresql@16',
      status: 'started',
      user: 'a1b3826',
      file: '/opt/homebrew/opt/postgresql@16/homebrew.mxcl.postgresql@16.plist',
      exitCode: null
    });
    const requestValid = serviceRequestSchema.safeParse({ name: 'postgresql@16' });
    const requestInvalid = serviceRequestSchema.safeParse({ name: '   ' });

    expect(service.status).toBe('started');
    expect(requestValid.success).toBe(true);
    expect(requestInvalid.success).toBe(false);
  });

  it('parses cleanup preview payloads', () => {
    const parsed = cleanupPreviewResultSchema.parse({
      command: 'brew cleanup --dry-run',
      items: [
        {
          path: '/opt/homebrew/Cellar/foo/1.0',
          sizeBytes: 237,
          fileCount: null,
          metadata: '237B'
        }
      ],
      totalBytes: 237,
      rawOutput: 'Would remove: /opt/homebrew/Cellar/foo/1.0 (237B)',
      generatedAt: '2026-02-25T00:00:00.000Z'
    });

    expect(parsed.command).toBe('brew cleanup --dry-run');
    expect(parsed.items[0]?.sizeBytes).toBe(237);
    expect(parsed.totalBytes).toBe(237);
  });

  it('parses doctor diagnostics payloads', () => {
    const parsed = brewDoctorResultSchema.parse({
      command: 'brew doctor',
      exitCode: 1,
      findings: [
        {
          id: 'warning-1',
          severity: 'warning',
          title: 'Some installed casks are deprecated or disabled.',
          details: [
            'You should find replacements for the following casks:',
            'powershell'
          ],
          suggestedFix: 'You should find replacements for the following casks:'
        }
      ],
      counts: {
        error: 0,
        warning: 1,
        info: 0
      },
      rawOutput: 'Warning: Some installed casks are deprecated or disabled.',
      generatedAt: '2026-02-26T00:00:00.000Z'
    });

    expect(parsed.command).toBe('brew doctor');
    expect(parsed.counts.warning).toBe(1);
    expect(parsed.findings[0]?.severity).toBe('warning');
  });

  it('rejects malformed doctor findings', () => {
    const parsed = brewDoctorFindingSchema.safeParse({
      id: '',
      severity: 'warning',
      title: '',
      details: ['line'],
      suggestedFix: null
    });

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

  it('accepts tap job actions', () => {
    const tapAdd = brewJobProgressEventSchema.safeParse({
      jobId: 'job-1',
      action: 'tapAdd',
      command: 'brew tap sst/tap',
      stage: 'running',
      stream: 'system',
      message: 'Adding tap sst/tap',
      packageName: 'sst/tap',
      kind: 'system',
      timestamp: '2026-02-25T00:00:00.000Z'
    });
    const tapRemove = brewJobProgressEventSchema.safeParse({
      jobId: 'job-2',
      action: 'tapRemove',
      command: 'brew untap sst/tap',
      stage: 'queued',
      stream: 'system',
      message: 'Queued tap removal',
      packageName: 'sst/tap',
      kind: 'system',
      timestamp: '2026-02-25T00:00:00.000Z'
    });

    expect(tapAdd.success).toBe(true);
    expect(tapRemove.success).toBe(true);
  });

  it('accepts cleanup job actions', () => {
    const cleanup = brewJobProgressEventSchema.safeParse({
      jobId: 'job-3',
      action: 'cleanup',
      command: 'brew cleanup',
      stage: 'queued',
      stream: 'system',
      message: 'Queued cleanup operation',
      packageName: null,
      kind: 'system',
      timestamp: '2026-02-25T00:00:00.000Z'
    });

    expect(cleanup.success).toBe(true);
  });

  it('accepts doctor job actions', () => {
    const doctor = brewJobProgressEventSchema.safeParse({
      jobId: 'job-10',
      action: 'doctor',
      command: 'brew doctor',
      stage: 'running',
      stream: 'system',
      message: 'Running brew doctor diagnostics',
      packageName: null,
      kind: 'system',
      timestamp: '2026-02-26T00:00:00.000Z'
    });

    expect(doctor.success).toBe(true);
  });

  it('accepts service job actions', () => {
    const start = brewJobProgressEventSchema.safeParse({
      jobId: 'job-4',
      action: 'serviceStart',
      command: 'brew services start postgresql@16',
      stage: 'queued',
      stream: 'system',
      message: 'Queued start for service postgresql@16',
      packageName: 'postgresql@16',
      kind: 'system',
      timestamp: '2026-02-25T00:00:00.000Z'
    });
    const stop = brewJobProgressEventSchema.safeParse({
      jobId: 'job-5',
      action: 'serviceStop',
      command: 'brew services stop postgresql@16',
      stage: 'running',
      stream: 'system',
      message: 'Stopping service postgresql@16',
      packageName: 'postgresql@16',
      kind: 'system',
      timestamp: '2026-02-25T00:00:00.000Z'
    });
    const restart = brewJobProgressEventSchema.safeParse({
      jobId: 'job-6',
      action: 'serviceRestart',
      command: 'brew services restart postgresql@16',
      stage: 'queued',
      stream: 'system',
      message: 'Queued restart for service postgresql@16',
      packageName: 'postgresql@16',
      kind: 'system',
      timestamp: '2026-02-25T00:00:00.000Z'
    });

    expect(start.success).toBe(true);
    expect(stop.success).toBe(true);
    expect(restart.success).toBe(true);
  });
});
