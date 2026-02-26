import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';

import type {
  BrewAvailability,
  BrewDoctorFinding,
  BrewDoctorResult,
  BrewDoctorSeverity,
  BrewJobAction,
  BrewJobCompleteEvent,
  BrewJobFailedEvent,
  BrewJobKind,
  BrewJobProgressEvent,
  BrewJobStream,
  BrewService,
  BrewServiceStatus,
  BrewTap,
  CatalogPackage,
  CleanupPreviewItem,
  CleanupPreviewResult,
  CheckNowResult,
  GetServicesResponse,
  InstallOneRequest,
  InstalledPackage,
  OutdatedPackage,
  PackageDependencyGroup,
  PackageDetails,
  PackageDetailsRequest,
  PackageReplacement,
  PinOneRequest,
  ReinstallOneRequest,
  SearchCatalogRequest,
  SearchCatalogResponse,
  SmartUpgradeBlockedPackage,
  SmartUpgradePlan,
  SmartUpgradePlanItem,
  SmartUpgradeRiskLevel,
  SmartUpgradeRunRequest,
  SyncMetadataResult,
  TapAddRequest,
  TapRemoveRequest,
  ServiceRequest,
  UnpinOneRequest,
  UninstallOneRequest,
  UpgradeOneRequest
} from '../../src/shared/contracts';
import { searchCatalogRequestSchema } from '../../src/shared/contracts';
import { log } from '../utils/logger';
import { CatalogCache } from './catalog-cache';
import { CommandQueue } from './command-queue';
import {
  normalizeCatalog,
  normalizeInstalled,
  normalizeOutdated,
  type BrewInfoResponse,
  type BrewOutdatedResponse
} from './homebrew-normalizer';
import {
  buildSmartUpgradeBlockedKey,
  buildSmartUpgradePlan
} from './smart-upgrade-planner';
import { BrewCommandError, BrewRunner } from './brew-runner';

const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;
const DETAILS_TTL_MS = 10 * 60 * 1000;
const TAP_READ_TIMEOUT_MS = 30_000;
const CLEANUP_PREVIEW_TIMEOUT_MS = 10 * 60 * 1000;
const CLEANUP_RUN_TIMEOUT_MS = 30 * 60 * 1000;
const DOCTOR_RUN_TIMEOUT_MS = 10 * 60 * 1000;
const SERVICES_MUTATION_TIMEOUT_MS = 5 * 60 * 1000;
const PROTECTED_TAP_NAMES = new Set(['homebrew/core', 'homebrew/cask']);
const PROTECTED_TAP_ALIASES = new Map<string, string>([
  ['homebrew/homebrew-core', 'homebrew/core'],
  ['homebrew/homebrew-cask', 'homebrew/cask']
]);

interface CatalogMaterialized {
  packages: CatalogPackage[];
  source: 'network' | 'cache';
  stale: boolean;
  fetchedAt: string | null;
}

interface PackageDetailsCacheEntry {
  details: PackageDetails;
  cachedAt: number;
}

interface TrackedJobTarget {
  packageName: string | null;
  kind: BrewJobKind;
}

interface TrackedJobOptions {
  jobId: string;
  commandText: string;
  action: BrewJobAction;
  command: string[];
  target: TrackedJobTarget;
  timeoutMs: number;
  queuedMessage: string;
  runningMessage: string;
  sink: JobEventSink;
  signal: AbortSignal;
  allowAutoUpdate?: boolean;
}

type QueuedTrackedJobOptions = Omit<TrackedJobOptions, 'signal' | 'jobId' | 'commandText'>;

interface StructuredBrewError {
  message: string;
  exitCode: number;
  output: string;
}

interface TapPathResolution {
  path: string | null;
  pathExists: boolean;
  warning: string | null;
}

interface TapGitState {
  remote: string | null;
  branch: string | null;
  upstream: string | null;
  ahead: number | null;
  behind: number | null;
  dirty: boolean;
  syncState: BrewTap['syncState'];
  warning: string | null;
}

export interface JobEventSink {
  onProgress: (event: BrewJobProgressEvent) => void;
  onComplete: (event: BrewJobCompleteEvent) => void;
  onFailed: (event: BrewJobFailedEvent) => void;
}

export function buildInstallCommand(request: InstallOneRequest): string[] {
  return request.kind === 'formula'
    ? ['install', '--formula', request.name]
    : ['install', '--cask', request.name];
}

export function buildReinstallCommand(request: ReinstallOneRequest): string[] {
  if (request.kind === 'formula') {
    return ['reinstall', '--formula', request.name];
  }

  return request.zap
    ? ['reinstall', '--cask', '--zap', request.name]
    : ['reinstall', '--cask', request.name];
}

export function buildUninstallCommand(request: UninstallOneRequest): string[] {
  if (request.kind === 'formula') {
    return ['uninstall', '--formula', request.name];
  }

  return request.zap
    ? ['uninstall', '--cask', '--zap', request.name]
    : ['uninstall', '--cask', request.name];
}

export function buildPinCommand(request: PinOneRequest): string[] {
  return ['pin', request.name];
}

export function buildUnpinCommand(request: UnpinOneRequest): string[] {
  return ['unpin', request.name];
}

export function buildTapAddCommand(request: TapAddRequest): string[] {
  return ['tap', request.name];
}

export function buildTapRemoveCommand(request: TapRemoveRequest): string[] {
  return ['untap', request.name];
}

export function buildServiceStartCommand(request: ServiceRequest): string[] {
  return ['services', 'start', request.name];
}

export function buildServiceStopCommand(request: ServiceRequest): string[] {
  return ['services', 'stop', request.name];
}

export function buildServiceRestartCommand(request: ServiceRequest): string[] {
  return ['services', 'restart', request.name];
}

export class HomebrewService {
  private readonly runner = new BrewRunner();
  private readonly mutationQueue = new CommandQueue();
  private readonly catalogCache = new CatalogCache();
  private readonly detailsCache = new Map<string, PackageDetailsCacheEntry>();

  async getBrewAvailability(): Promise<BrewAvailability> {
    return this.runner.getAvailability();
  }

  async getInstalled(): Promise<InstalledPackage[]> {
    const [formulaRaw, caskRaw] = await Promise.all([
      this.runner.runJson<BrewInfoResponse>(['info', '--json=v2', '--installed', '--formula']),
      this.runner.runJson<BrewInfoResponse>(['info', '--json=v2', '--installed', '--cask'])
    ]);

    return normalizeInstalled({
      formulae: formulaRaw.formulae,
      casks: caskRaw.casks
    });
  }

  async getOutdated(): Promise<OutdatedPackage[]> {
    const [formulaRaw, caskRaw] = await Promise.all([
      this.runner.runJson<BrewOutdatedResponse>(['outdated', '--formula', '--json=v2']),
      this.runner.runJson<BrewOutdatedResponse>(['outdated', '--cask', '--json=v2'])
    ]);

    return normalizeOutdated({
      formulae: formulaRaw.formulae,
      casks: caskRaw.casks
    });
  }

  async getTaps(): Promise<BrewTap[]> {
    const [userTappedSet, now] = await Promise.all([
      this.resolveUserTappedNames(),
      Promise.resolve(new Date().toISOString())
    ]);
    const tapNames = new Set<string>([...userTappedSet, ...PROTECTED_TAP_NAMES]);
    const items = await Promise.all(
      Array.from(tapNames).map(async (name) => {
        const protectedTap = PROTECTED_TAP_NAMES.has(name);
        const userTapped = userTappedSet.has(name);
        const pathResolution = await this.resolveTapPath(name);
        const gitState = pathResolution.pathExists
          ? await resolveTapGitState(pathResolution.path)
          : resolveMissingTapGitState({
              protectedTap,
              userTapped
            });
        const warning = uniqueStrings([pathResolution.warning ?? '', gitState.warning ?? '']).join(' || ') || null;

        return {
          name,
          official: name.startsWith('homebrew/'),
          protected: protectedTap,
          userTapped,
          path: pathResolution.path,
          remote: gitState.remote,
          branch: gitState.branch,
          upstream: gitState.upstream,
          ahead: gitState.ahead,
          behind: gitState.behind,
          dirty: gitState.dirty,
          syncState: gitState.syncState,
          health: resolveTapHealth({
            syncState: gitState.syncState,
            dirty: gitState.dirty,
            warning
          }),
          lastCheckedAt: now,
          warning
        } satisfies BrewTap;
      })
    );

    return items.sort(compareBrewTaps);
  }

  async getServices(): Promise<GetServicesResponse> {
    const raw = await this.runner.runJson<unknown>(['services', 'list', '--json'], {
      timeoutMs: TAP_READ_TIMEOUT_MS
    });

    if (!Array.isArray(raw)) {
      return [];
    }

    return raw
      .map((entry) => parseBrewServiceEntry(entry))
      .filter((service): service is BrewService => service !== null)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async getCleanupPreview(): Promise<CleanupPreviewResult> {
    const command = ['cleanup', '--dry-run'];
    const result = await this.mutationQueue.enqueue(
      (signal) =>
        this.runner.runText(command, {
          signal,
          timeoutMs: CLEANUP_PREVIEW_TIMEOUT_MS
        }),
      CLEANUP_PREVIEW_TIMEOUT_MS
    );
    const rawOutput = `${result.stdout}${result.stderr}`.trim();

    return parseCleanupPreviewOutput(rawOutput, `brew ${command.join(' ')}`);
  }

  async checkNow(): Promise<CheckNowResult> {
    const outdated = await this.getOutdated();

    return {
      count: outdated.length,
      checkedAt: new Date().toISOString()
    };
  }

  async getSmartUpgradePlan(
    blockedPackages: SmartUpgradeBlockedPackage[]
  ): Promise<SmartUpgradePlan> {
    const outdated = await this.getOutdated();
    const blockedKeys = new Set(
      blockedPackages.map((pkg) => buildSmartUpgradeBlockedKey(pkg))
    );

    return buildSmartUpgradePlan(outdated, blockedKeys);
  }

  async syncMetadata(sink?: JobEventSink): Promise<SyncMetadataResult> {
    log.info('Running explicit brew metadata sync');

    if (!sink) {
      const result = await this.runner.runText(['update'], {
        allowAutoUpdate: true,
        timeoutMs: 10 * 60 * 1000
      });

      return {
        success: true,
        output: `${result.stdout}${result.stderr}`.trim(),
        syncedAt: new Date().toISOString()
      };
    }

    const completion = await this.runQueuedTrackedJob({
      action: 'syncMetadata',
      command: ['update'],
      target: { packageName: null, kind: 'system' },
      timeoutMs: 10 * 60 * 1000,
      queuedMessage: 'Queued Homebrew metadata sync',
      runningMessage: 'Syncing Homebrew metadata',
      allowAutoUpdate: true,
      sink
    });

    this.invalidateAllDetailsCache();

    return {
      success: true,
      output: completion.output,
      syncedAt: completion.timestamp
    };
  }

  async searchCatalog(request: SearchCatalogRequest): Promise<SearchCatalogResponse> {
    const parsedRequest = searchCatalogRequestSchema.parse(request);
    const catalog = await this.resolveCatalog(parsedRequest.refresh);

    const query = parsedRequest.query.toLocaleLowerCase();
    const kindSet = new Set(parsedRequest.kinds);

    const filtered = catalog.packages.filter((item) => {
      if (!kindSet.has(item.kind)) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [item.name, item.fullName, item.desc ?? '', item.tap].some((field) =>
        field.toLocaleLowerCase().includes(query)
      );
    });

    const start = (parsedRequest.page - 1) * parsedRequest.pageSize;
    const pagedItems = filtered.slice(start, start + parsedRequest.pageSize);

    return {
      items: pagedItems,
      total: filtered.length,
      page: parsedRequest.page,
      pageSize: parsedRequest.pageSize,
      stale: catalog.stale,
      source: catalog.source,
      lastUpdatedAt: catalog.fetchedAt
    };
  }

  async getPackageDetails(request: PackageDetailsRequest): Promise<PackageDetails> {
    const cacheKey = `${request.kind}:${request.name}`;
    const cached = this.detailsCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.cachedAt < DETAILS_TTL_MS) {
      return {
        ...cached.details,
        source: 'cache',
        warnings: [...cached.details.warnings]
      };
    }

    let localDetails: PackageDetails | null = null;
    let remoteDetails: PackageDetails | null = null;
    const warnings: string[] = [];

    try {
      localDetails = await this.resolveLocalDetails(request);
    } catch (error) {
      warnings.push(`Local brew info unavailable: ${(error as Error).message}`);
    }

    try {
      remoteDetails = await this.resolveRemoteDetails(request);
    } catch (error) {
      warnings.push(`Remote Homebrew API unavailable: ${(error as Error).message}`);
    }

    if (!localDetails && !remoteDetails) {
      if (cached) {
        return {
          ...cached.details,
          source: 'cache',
          warnings: uniqueStrings([
            ...cached.details.warnings,
            'Using cached package details because live lookup failed.',
            ...warnings
          ])
        };
      }

      throw new Error(`Unable to load package details for ${request.kind}:${request.name}.`);
    }

    const resolved = this.mergeDetails(localDetails, remoteDetails, warnings);
    this.detailsCache.set(cacheKey, { details: resolved, cachedAt: now });
    return resolved;
  }

  async upgradeOne(request: UpgradeOneRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    const command =
      request.kind === 'formula'
        ? ['upgrade', '--formula', request.name]
        : ['upgrade', '--cask', request.name];

    try {
      return await this.runQueuedTrackedJob({
        action: 'upgradeOne',
        command,
        target: {
          packageName: request.name,
          kind: request.kind
        },
        timeoutMs: 20 * 60 * 1000,
        queuedMessage: `Queued upgrade for ${request.name}`,
        runningMessage: `Upgrading ${request.name}`,
        sink
      });
    } finally {
      this.invalidateDetailsCacheEntry(request.kind, request.name);
    }
  }

  async installOne(request: InstallOneRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    const command = buildInstallCommand(request);
    try {
      return await this.runQueuedTrackedJob({
        action: 'install',
        command,
        target: {
          packageName: request.name,
          kind: request.kind
        },
        timeoutMs: 20 * 60 * 1000,
        queuedMessage: `Queued install for ${request.name}`,
        runningMessage: `Installing ${request.name}`,
        sink
      });
    } finally {
      this.invalidateDetailsCacheEntry(request.kind, request.name);
    }
  }

  async reinstallOne(request: ReinstallOneRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    const command = buildReinstallCommand(request);
    const reinstallTarget =
      request.kind === 'cask' && request.zap ? `${request.name} (--zap)` : request.name;

    try {
      return await this.runQueuedTrackedJob({
        action: 'reinstall',
        command,
        target: {
          packageName: request.name,
          kind: request.kind
        },
        timeoutMs: 20 * 60 * 1000,
        queuedMessage: `Queued reinstall for ${reinstallTarget}`,
        runningMessage: `Reinstalling ${reinstallTarget}`,
        sink
      });
    } finally {
      this.invalidateDetailsCacheEntry(request.kind, request.name);
    }
  }

  async uninstallOne(
    request: UninstallOneRequest,
    sink: JobEventSink
  ): Promise<BrewJobCompleteEvent> {
    const command = buildUninstallCommand(request);
    const uninstallTarget = request.kind === 'cask' && request.zap ? `${request.name} (--zap)` : request.name;

    try {
      return await this.runQueuedTrackedJob({
        action: 'uninstall',
        command,
        target: {
          packageName: request.name,
          kind: request.kind
        },
        timeoutMs: 20 * 60 * 1000,
        queuedMessage: `Queued uninstall for ${uninstallTarget}`,
        runningMessage: `Uninstalling ${uninstallTarget}`,
        sink
      });
    } finally {
      this.invalidateDetailsCacheEntry(request.kind, request.name);
    }
  }

  async pinOne(request: PinOneRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    const command = buildPinCommand(request);
    try {
      return await this.runQueuedTrackedJob({
        action: 'pin',
        command,
        target: {
          packageName: request.name,
          kind: request.kind
        },
        timeoutMs: 5 * 60 * 1000,
        queuedMessage: `Queued pin for ${request.name}`,
        runningMessage: `Pinning ${request.name}`,
        sink
      });
    } finally {
      this.invalidateDetailsCacheEntry(request.kind, request.name);
    }
  }

  async unpinOne(request: UnpinOneRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    const command = buildUnpinCommand(request);
    try {
      return await this.runQueuedTrackedJob({
        action: 'unpin',
        command,
        target: {
          packageName: request.name,
          kind: request.kind
        },
        timeoutMs: 5 * 60 * 1000,
        queuedMessage: `Queued unpin for ${request.name}`,
        runningMessage: `Unpinning ${request.name}`,
        sink
      });
    } finally {
      this.invalidateDetailsCacheEntry(request.kind, request.name);
    }
  }

  async tapAdd(request: TapAddRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    const command = buildTapAddCommand(request);
    try {
      return await this.runQueuedTrackedJob({
        action: 'tapAdd',
        command,
        target: {
          packageName: request.name,
          kind: 'system'
        },
        timeoutMs: 10 * 60 * 1000,
        queuedMessage: `Queued tap add for ${request.name}`,
        runningMessage: `Adding tap ${request.name}`,
        sink
      });
    } finally {
      this.invalidateAllDetailsCache();
    }
  }

  async tapRemove(request: TapRemoveRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    if (PROTECTED_TAP_NAMES.has(normalizeTapNameForProtection(request.name))) {
      throw new Error(`Cannot remove protected tap ${request.name}.`);
    }

    const command = buildTapRemoveCommand(request);
    try {
      return await this.runQueuedTrackedJob({
        action: 'tapRemove',
        command,
        target: {
          packageName: request.name,
          kind: 'system'
        },
        timeoutMs: 5 * 60 * 1000,
        queuedMessage: `Queued tap removal for ${request.name}`,
        runningMessage: `Removing tap ${request.name}`,
        sink
      });
    } finally {
      this.invalidateAllDetailsCache();
    }
  }

  async serviceStart(request: ServiceRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    return this.runQueuedTrackedJob({
      action: 'serviceStart',
      command: buildServiceStartCommand(request),
      target: {
        packageName: request.name,
        kind: 'system'
      },
      timeoutMs: SERVICES_MUTATION_TIMEOUT_MS,
      queuedMessage: `Queued start for service ${request.name}`,
      runningMessage: `Starting service ${request.name}`,
      sink
    });
  }

  async serviceStop(request: ServiceRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    return this.runQueuedTrackedJob({
      action: 'serviceStop',
      command: buildServiceStopCommand(request),
      target: {
        packageName: request.name,
        kind: 'system'
      },
      timeoutMs: SERVICES_MUTATION_TIMEOUT_MS,
      queuedMessage: `Queued stop for service ${request.name}`,
      runningMessage: `Stopping service ${request.name}`,
      sink
    });
  }

  async serviceRestart(request: ServiceRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    return this.runQueuedTrackedJob({
      action: 'serviceRestart',
      command: buildServiceRestartCommand(request),
      target: {
        packageName: request.name,
        kind: 'system'
      },
      timeoutMs: SERVICES_MUTATION_TIMEOUT_MS,
      queuedMessage: `Queued restart for service ${request.name}`,
      runningMessage: `Restarting service ${request.name}`,
      sink
    });
  }

  async runCleanup(sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    return this.runQueuedTrackedJob({
      action: 'cleanup',
      command: ['cleanup'],
      target: {
        packageName: null,
        kind: 'system'
      },
      timeoutMs: CLEANUP_RUN_TIMEOUT_MS,
      queuedMessage: 'Queued Homebrew cleanup',
      runningMessage: 'Running Homebrew cleanup',
      sink
    });
  }

  async runDoctor(sink: JobEventSink): Promise<BrewDoctorResult> {
    const command = ['doctor'];
    const commandText = 'brew doctor';
    const target: TrackedJobTarget = {
      packageName: null,
      kind: 'system'
    };
    const action: BrewJobAction = 'doctor';
    const jobId = randomUUID();
    const startedAt = Date.now();
    let combinedOutput = '';

    this.emitProgress({
      sink,
      jobId,
      action,
      command: commandText,
      stage: 'queued',
      stream: 'system',
      target,
      message: 'Queued brew doctor diagnostics'
    });

    return this.mutationQueue.enqueue(
      async (signal) => {
        this.emitProgress({
          sink,
          jobId,
          action,
          command: commandText,
          stage: 'running',
          stream: 'system',
          target,
          message: 'Running brew doctor diagnostics'
        });

        try {
          const result = await this.runner.runText(command, {
            signal,
            timeoutMs: DOCTOR_RUN_TIMEOUT_MS,
            onStdout: (chunk) => {
              combinedOutput += chunk;
              this.emitProgress({
                sink,
                jobId,
                action,
                command: commandText,
                stage: 'output',
                stream: 'stdout',
                target,
                message: chunk
              });
            },
            onStderr: (chunk) => {
              combinedOutput += chunk;
              this.emitProgress({
                sink,
                jobId,
                action,
                command: commandText,
                stage: 'output',
                stream: 'stderr',
                target,
                message: chunk
              });
            }
          });

          const output = `${result.stdout}${result.stderr}`.trim() || combinedOutput.trim();
          const report = parseDoctorOutput(output, commandText, result.exitCode);
          const complete = this.buildCompleteEvent({
            jobId,
            action,
            command: commandText,
            target,
            startedAt,
            output,
            exitCode: result.exitCode
          });
          sink.onComplete(complete);
          return report;
        } catch (error) {
          if (error instanceof BrewCommandError && error.exitCode === 1) {
            const output = `${error.stdout}${error.stderr}`.trim() || combinedOutput.trim();
            const report = parseDoctorOutput(output, commandText, error.exitCode);
            if (isDoctorOutputParseable(report, output)) {
              const complete = this.buildCompleteEvent({
                jobId,
                action,
                command: commandText,
                target,
                startedAt,
                output,
                exitCode: error.exitCode
              });
              sink.onComplete(complete);
              return report;
            }
          }

          const structured = this.extractStructuredError(error, commandText, combinedOutput);
          const failed = this.buildFailedEvent({
            jobId,
            action,
            command: commandText,
            target,
            startedAt,
            error: structured.message,
            output: structured.output,
            exitCode: structured.exitCode
          });
          sink.onFailed(failed);
          throw error;
        }
      },
      DOCTOR_RUN_TIMEOUT_MS
    );
  }

  async upgradeSmart(
    request: SmartUpgradeRunRequest,
    blockedPackages: SmartUpgradeBlockedPackage[],
    sink: JobEventSink
  ): Promise<BrewJobCompleteEvent> {
    const blockedKeys = new Set(
      blockedPackages.map((pkg) => buildSmartUpgradeBlockedKey(pkg))
    );
    const selectedRiskSet = new Set(request.risks);

    const jobId = randomUUID();
    const action: BrewJobAction = 'upgradeSmart';
    const target: TrackedJobTarget = { packageName: null, kind: 'system' };
    const commandText = `brew smart-upgrade --risks ${request.risks.join(',')}`;
    const startedAt = Date.now();

    this.emitProgress({
      sink,
      jobId,
      action,
      command: commandText,
      stage: 'queued',
      stream: 'system',
      target,
      message: `Queued smart upgrade for risk levels: ${request.risks.join(', ')}`
    });

    return this.mutationQueue.enqueue(
      async (signal) => {
        const plan = buildSmartUpgradePlan(await this.getOutdated(), blockedKeys);
        const riskBatches: Array<{ risk: SmartUpgradeRiskLevel; items: SmartUpgradePlanItem[] }> = [
          { risk: 'low', items: plan.low },
          { risk: 'medium', items: plan.medium },
          { risk: 'high', items: plan.high }
        ];
        const selectedBatches = riskBatches.filter((batch) => selectedRiskSet.has(batch.risk));
        const selectedItems = selectedBatches.flatMap((batch) => batch.items);
        let combinedOutput = '';
        const succeeded: SmartUpgradePlanItem[] = [];
        const failures: Array<{
          item: SmartUpgradePlanItem;
          exitCode: number;
          message: string;
          output: string;
        }> = [];

        this.emitProgress({
          sink,
          jobId,
          action,
          command: commandText,
          stage: 'running',
          stream: 'system',
          target,
          message: `Running smart upgrade across ${selectedBatches.length} risk batch(es)`
        });

        if (selectedItems.length === 0) {
          const output = 'No eligible packages match the selected smart-upgrade risk levels.';
          const complete = this.buildCompleteEvent({
            jobId,
            action,
            command: commandText,
            target,
            startedAt,
            output,
            exitCode: 0
          });
          sink.onComplete(complete);
          return complete;
        }

        for (const batch of selectedBatches) {
          if (batch.items.length === 0) {
            continue;
          }

          this.emitProgress({
            sink,
            jobId,
            action,
            command: commandText,
            stage: 'output',
            stream: 'system',
            target,
            message: `Starting ${batch.risk} risk batch (${batch.items.length} package(s))`
          });

          for (const item of batch.items) {
            const packageCommand = item.kind === 'formula'
              ? ['upgrade', '--formula', item.name]
              : ['upgrade', '--cask', item.name];
            const packageCommandText = `brew ${packageCommand.join(' ')}`;
            const packageTarget: TrackedJobTarget = {
              packageName: item.name,
              kind: item.kind
            };

            this.emitProgress({
              sink,
              jobId,
              action,
              command: commandText,
              stage: 'output',
              stream: 'system',
              target: packageTarget,
              message: `Upgrading ${item.kind} ${item.name} (${batch.risk} risk)`
            });

            try {
              const result = await this.runner.runText(packageCommand, {
                signal,
                timeoutMs: 20 * 60 * 1000,
                onStdout: (chunk) => {
                  this.emitProgress({
                    sink,
                    jobId,
                    action,
                    command: commandText,
                    stage: 'output',
                    stream: 'stdout',
                    target: packageTarget,
                    message: chunk
                  });
                },
                onStderr: (chunk) => {
                  this.emitProgress({
                    sink,
                    jobId,
                    action,
                    command: commandText,
                    stage: 'output',
                    stream: 'stderr',
                    target: packageTarget,
                    message: chunk
                  });
                }
              });

              combinedOutput += `${result.stdout}${result.stderr}`;
              succeeded.push(item);
            } catch (error) {
              const structured = this.extractStructuredError(error, packageCommandText, '');
              if (structured.output) {
                combinedOutput += `${structured.output}\n`;
              }

              failures.push({
                item,
                exitCode: structured.exitCode,
                message: structured.message,
                output: structured.output
              });

              this.emitProgress({
                sink,
                jobId,
                action,
                command: commandText,
                stage: 'output',
                stream: 'system',
                target: packageTarget,
                message: `Failed ${item.name} (exit ${structured.exitCode}): ${structured.message}`
              });
            } finally {
              this.invalidateDetailsCacheEntry(item.kind, item.name);
            }
          }
        }

        if (failures.length > 0) {
          const summary = [
            `Smart upgrade finished with ${failures.length} failure(s) out of ${selectedItems.length} package(s).`,
            ...failures.map(
              (failure) =>
                `- ${failure.item.kind}:${failure.item.name} (exit ${failure.exitCode}) ${failure.message}`
            )
          ].join('\n');
          const output = [combinedOutput.trim(), summary].filter(Boolean).join('\n\n');
          const failed = this.buildFailedEvent({
            jobId,
            action,
            command: commandText,
            target,
            startedAt,
            error: `Smart upgrade completed with failures (${failures.length}/${selectedItems.length}).`,
            output,
            exitCode: failures[0]?.exitCode ?? 1
          });
          sink.onFailed(failed);
          throw new Error(failed.error);
        }

        const output = [
          combinedOutput.trim(),
          `Smart upgrade completed successfully for ${succeeded.length} package(s).`
        ]
          .filter(Boolean)
          .join('\n\n');

        const complete = this.buildCompleteEvent({
          jobId,
          action,
          command: commandText,
          target,
          startedAt,
          output,
          exitCode: 0
        });
        sink.onComplete(complete);
        return complete;
      },
      60 * 60 * 1000
    );
  }

  async upgradeAll(sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    const jobId = randomUUID();
    const action: BrewJobAction = 'upgradeAll';
    const target: TrackedJobTarget = { packageName: null, kind: 'system' };
    const commandText = 'brew upgrade --formula && brew upgrade --cask';
    const startedAt = Date.now();
    let combinedOutput = '';

    this.emitProgress({
      sink,
      jobId,
      action,
      command: commandText,
      stage: 'queued',
      stream: 'system',
      target,
      message: 'Queued upgrade for all outdated packages'
    });

    return this.mutationQueue.enqueue(
      async (signal) => {
        try {
          this.emitProgress({
            sink,
            jobId,
            action,
            command: commandText,
            stage: 'running',
            stream: 'system',
            target,
            message: 'Running formula upgrades'
          });

          const formulaResult = await this.runner.runText(['upgrade', '--formula'], {
            signal,
            timeoutMs: 30 * 60 * 1000,
            onStdout: (chunk) => {
              this.emitProgress({
                sink,
                jobId,
                action,
                command: commandText,
                stage: 'output',
                stream: 'stdout',
                target: { packageName: null, kind: 'formula' },
                message: chunk
              });
            },
            onStderr: (chunk) => {
              this.emitProgress({
                sink,
                jobId,
                action,
                command: commandText,
                stage: 'output',
                stream: 'stderr',
                target: { packageName: null, kind: 'formula' },
                message: chunk
              });
            }
          });
          combinedOutput += `${formulaResult.stdout}${formulaResult.stderr}`;

          this.emitProgress({
            sink,
            jobId,
            action,
            command: commandText,
            stage: 'running',
            stream: 'system',
            target,
            message: 'Running cask upgrades'
          });

          const caskResult = await this.runner.runText(['upgrade', '--cask'], {
            signal,
            timeoutMs: 30 * 60 * 1000,
            onStdout: (chunk) => {
              this.emitProgress({
                sink,
                jobId,
                action,
                command: commandText,
                stage: 'output',
                stream: 'stdout',
                target: { packageName: null, kind: 'cask' },
                message: chunk
              });
            },
            onStderr: (chunk) => {
              this.emitProgress({
                sink,
                jobId,
                action,
                command: commandText,
                stage: 'output',
                stream: 'stderr',
                target: { packageName: null, kind: 'cask' },
                message: chunk
              });
            }
          });
          combinedOutput += `${caskResult.stdout}${caskResult.stderr}`;

          const complete = this.buildCompleteEvent({
            jobId,
            action,
            command: commandText,
            target,
            startedAt,
            output: combinedOutput,
            exitCode: 0
          });
          sink.onComplete(complete);
          return complete;
        } catch (error) {
          const structured = this.extractStructuredError(error, commandText, combinedOutput);
          const failed = this.buildFailedEvent({
            jobId,
            action,
            command: commandText,
            target,
            startedAt,
            error: structured.message,
            output: structured.output,
            exitCode: structured.exitCode
          });
          sink.onFailed(failed);
          throw error;
        } finally {
          this.invalidateAllDetailsCache();
        }
      },
      60 * 60 * 1000
    );
  }

  private runQueuedTrackedJob(options: QueuedTrackedJobOptions): Promise<BrewJobCompleteEvent> {
    const jobId = randomUUID();
    const commandText = `brew ${options.command.join(' ')}`;

    this.emitProgress({
      sink: options.sink,
      jobId,
      action: options.action,
      command: commandText,
      stage: 'queued',
      stream: 'system',
      target: options.target,
      message: options.queuedMessage
    });

    return this.mutationQueue.enqueue(
      (signal) =>
        this.executeTrackedJob({
          ...options,
          jobId,
          commandText,
          signal
        }),
      options.timeoutMs
    );
  }

  private async executeTrackedJob(options: TrackedJobOptions): Promise<BrewJobCompleteEvent> {
    const {
      jobId,
      commandText,
      action,
      command,
      target,
      timeoutMs,
      runningMessage,
      sink,
      signal,
      allowAutoUpdate = false
    } = options;
    const startedAt = Date.now();
    let stdout = '';
    let stderr = '';

    this.emitProgress({
      sink,
      jobId,
      action,
      command: commandText,
      stage: 'running',
      stream: 'system',
      target,
      message: runningMessage
    });

    try {
      const result = await this.runner.runText(command, {
        signal,
        timeoutMs,
        allowAutoUpdate,
        onStdout: (chunk) => {
          stdout += chunk;
          this.emitProgress({
            sink,
            jobId,
            action,
            command: commandText,
            stage: 'output',
            stream: 'stdout',
            target,
            message: chunk
          });
        },
        onStderr: (chunk) => {
          stderr += chunk;
          this.emitProgress({
            sink,
            jobId,
            action,
            command: commandText,
            stage: 'output',
            stream: 'stderr',
            target,
            message: chunk
          });
        }
      });

      const complete = this.buildCompleteEvent({
        jobId,
        action,
        command: commandText,
        target,
        startedAt,
        output: `${result.stdout}${result.stderr}`,
        exitCode: result.exitCode
      });
      sink.onComplete(complete);
      return complete;
    } catch (error) {
      const structured = this.extractStructuredError(error, commandText, `${stdout}${stderr}`);
      const failed = this.buildFailedEvent({
        jobId,
        action,
        command: commandText,
        target,
        startedAt,
        error: structured.message,
        output: structured.output,
        exitCode: structured.exitCode
      });
      sink.onFailed(failed);
      throw error;
    }
  }

  private emitProgress(options: {
    sink: JobEventSink;
    jobId: string;
    action: BrewJobAction;
    command: string;
    stage: BrewJobProgressEvent['stage'];
    stream: BrewJobStream;
    target: TrackedJobTarget;
    message: string;
  }): void {
    options.sink.onProgress({
      jobId: options.jobId,
      action: options.action,
      command: options.command,
      stage: options.stage,
      stream: options.stream,
      message: options.message,
      packageName: options.target.packageName,
      kind: options.target.kind,
      timestamp: new Date().toISOString()
    });
  }

  private buildCompleteEvent(options: {
    jobId: string;
    action: BrewJobAction;
    command: string;
    target: TrackedJobTarget;
    startedAt: number;
    output: string;
    exitCode: number;
  }): BrewJobCompleteEvent {
    return {
      jobId: options.jobId,
      action: options.action,
      command: options.command,
      kind: options.target.kind,
      packageName: options.target.packageName,
      success: true,
      exitCode: options.exitCode,
      durationMs: Math.max(0, Date.now() - options.startedAt),
      output: options.output.trim(),
      timestamp: new Date().toISOString()
    };
  }

  private buildFailedEvent(options: {
    jobId: string;
    action: BrewJobAction;
    command: string;
    target: TrackedJobTarget;
    startedAt: number;
    error: string;
    output: string;
    exitCode: number;
  }): BrewJobFailedEvent {
    return {
      jobId: options.jobId,
      action: options.action,
      command: options.command,
      kind: options.target.kind,
      packageName: options.target.packageName,
      exitCode: options.exitCode,
      durationMs: Math.max(0, Date.now() - options.startedAt),
      error: options.error,
      output: options.output.trim(),
      timestamp: new Date().toISOString()
    };
  }

  private extractStructuredError(
    error: unknown,
    commandText: string,
    fallbackOutput: string
  ): StructuredBrewError {
    if (error instanceof BrewCommandError) {
      const output = `${error.stdout}${error.stderr}`.trim() || fallbackOutput.trim();
      return {
        message: error.message,
        exitCode: error.exitCode,
        output
      };
    }

    const message = error instanceof Error ? error.message : `Command failed: ${commandText}`;
    return {
      message,
      exitCode: -1,
      output: fallbackOutput.trim()
    };
  }

  private invalidateDetailsCacheEntry(
    kind: PackageDetailsRequest['kind'],
    packageName: string
  ): void {
    this.detailsCache.delete(`${kind}:${packageName}`);
  }

  private invalidateAllDetailsCache(): void {
    this.detailsCache.clear();
  }

  private async resolveUserTappedNames(): Promise<Set<string>> {
    const output = await this.runner.runText(['tap'], {
      timeoutMs: TAP_READ_TIMEOUT_MS
    });
    return new Set(
      output.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    );
  }

  private async resolveTapPath(name: string): Promise<TapPathResolution> {
    try {
      const output = await this.runner.runText(['--repository', name], {
        timeoutMs: TAP_READ_TIMEOUT_MS
      });
      const path = output.stdout.trim();
      if (!path) {
        return {
          path: null,
          pathExists: false,
          warning: `Tap path unavailable for ${name}.`
        };
      }

      let pathExists = false;
      try {
        const metadata = await stat(path);
        pathExists = metadata.isDirectory();
      } catch {
        pathExists = false;
      }

      if (!pathExists) {
        return {
          path,
          pathExists: false,
          warning: null
        };
      }

      return {
        path,
        pathExists: true,
        warning: null
      };
    } catch (error) {
      return {
        path: null,
        pathExists: false,
        warning: `Unable to resolve tap path for ${name}: ${(error as Error).message}`
      };
    }
  }

  private async resolveLocalDetails(request: PackageDetailsRequest): Promise<PackageDetails> {
    const raw = request.kind === 'formula'
      ? await this.runner.runJson<BrewInfoResponse>(['info', '--json=v2', '--formula', request.name])
      : await this.runner.runJson<BrewInfoResponse>(['info', '--json=v2', '--cask', request.name]);

    if (request.kind === 'formula') {
      const item = Array.isArray(raw.formulae) ? raw.formulae[0] : null;
      if (!isObject(item)) {
        throw new Error('No local formula details returned from brew info.');
      }

      return normalizeFormulaDetails(item, request.name, 'local', []);
    }

    const item = Array.isArray(raw.casks) ? raw.casks[0] : null;
    if (!isObject(item)) {
      throw new Error('No local cask details returned from brew info.');
    }

    return normalizeCaskDetails(item, request.name, 'local', []);
  }

  private async resolveRemoteDetails(request: PackageDetailsRequest): Promise<PackageDetails> {
    const url = request.kind === 'formula'
      ? `https://formulae.brew.sh/api/formula/${encodeURIComponent(request.name)}.json`
      : `https://formulae.brew.sh/api/cask/${encodeURIComponent(request.name)}.json`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Homebrew API request failed (${response.status}).`);
    }

    const raw = (await response.json()) as unknown;
    if (!isObject(raw)) {
      throw new Error('Homebrew API returned malformed package details.');
    }

    if (request.kind === 'formula') {
      return normalizeFormulaDetails(raw, request.name, 'remote', []);
    }

    return normalizeCaskDetails(raw, request.name, 'remote', []);
  }

  private mergeDetails(
    localDetails: PackageDetails | null,
    remoteDetails: PackageDetails | null,
    warnings: string[]
  ): PackageDetails {
    if (localDetails && remoteDetails) {
      return {
        id: localDetails.id,
        kind: localDetails.kind,
        name: localDetails.name,
        fullName: localDetails.fullName || remoteDetails.fullName,
        desc: preferString(localDetails.desc, remoteDetails.desc),
        homepage: preferString(localDetails.homepage, remoteDetails.homepage),
        tap: preferString(localDetails.tap, remoteDetails.tap),
        license: preferString(localDetails.license, remoteDetails.license),
        dependencies: mergeDependencyGroups(localDetails.dependencies, remoteDetails.dependencies),
        caveats: preferString(localDetails.caveats, remoteDetails.caveats),
        versionSnapshot: {
          installedVersions:
            localDetails.versionSnapshot.installedVersions.length > 0
              ? localDetails.versionSnapshot.installedVersions
              : remoteDetails.versionSnapshot.installedVersions,
          currentVersion: preferString(
            localDetails.versionSnapshot.currentVersion,
            remoteDetails.versionSnapshot.currentVersion
          ),
          stableVersion: preferString(
            localDetails.versionSnapshot.stableVersion,
            remoteDetails.versionSnapshot.stableVersion
          ),
          headVersion: preferString(
            localDetails.versionSnapshot.headVersion,
            remoteDetails.versionSnapshot.headVersion
          )
        },
        deprecated: localDetails.deprecated || remoteDetails.deprecated,
        disabled: localDetails.disabled || remoteDetails.disabled,
        deprecationReason: preferString(localDetails.deprecationReason, remoteDetails.deprecationReason),
        disableReason: preferString(localDetails.disableReason, remoteDetails.disableReason),
        replacement: preferReplacement(localDetails.replacement, remoteDetails.replacement),
        pinned: localDetails.pinned,
        warnings: uniqueStrings([...localDetails.warnings, ...remoteDetails.warnings, ...warnings]),
        source: 'hybrid',
        fetchedAt: new Date().toISOString()
      };
    }

    if (localDetails) {
      return {
        ...localDetails,
        warnings: uniqueStrings([...localDetails.warnings, ...warnings]),
        source: 'local',
        fetchedAt: new Date().toISOString()
      };
    }

    if (!remoteDetails) {
      throw new Error('No package details to merge.');
    }

    return {
      ...remoteDetails,
      warnings: uniqueStrings([...remoteDetails.warnings, ...warnings]),
      source: 'remote',
      fetchedAt: new Date().toISOString()
    };
  }

  private async resolveCatalog(refresh: boolean): Promise<CatalogMaterialized> {
    const cached = await this.catalogCache.read();
    const cacheAgeMs = cached ? Date.now() - new Date(cached.fetchedAt).getTime() : Number.POSITIVE_INFINITY;
    const shouldUseCache = cached && !refresh && cacheAgeMs < CATALOG_TTL_MS;

    if (shouldUseCache) {
      return {
        packages: cached.packages,
        source: 'cache',
        stale: false,
        fetchedAt: cached.fetchedAt
      };
    }

    try {
      const [formulaResponse, caskResponse] = await Promise.all([
        fetch('https://formulae.brew.sh/api/formula.json'),
        fetch('https://formulae.brew.sh/api/cask.json')
      ]);

      if (!formulaResponse.ok || !caskResponse.ok) {
        throw new Error('Unable to fetch Homebrew catalog API data.');
      }

      const formulaJson = (await formulaResponse.json()) as unknown[];
      const caskJson = (await caskResponse.json()) as unknown[];
      const normalized = normalizeCatalog(formulaJson, caskJson);
      const fetchedAt = new Date().toISOString();

      await this.catalogCache.write({ fetchedAt, packages: normalized });

      return {
        packages: normalized,
        source: 'network',
        stale: false,
        fetchedAt
      };
    } catch (error) {
      log.warn('Catalog refresh failed, checking stale cache fallback', error);

      if (cached) {
        return {
          packages: cached.packages,
          source: 'cache',
          stale: true,
          fetchedAt: cached.fetchedAt
        };
      }

      throw error;
    }
  }
}

function normalizeTapNameForProtection(name: string): string {
  const normalized = name.trim().toLocaleLowerCase();
  return PROTECTED_TAP_ALIASES.get(normalized) ?? normalized;
}

function compareBrewTaps(left: BrewTap, right: BrewTap): number {
  if (left.protected !== right.protected) {
    return left.protected ? -1 : 1;
  }

  if (left.official !== right.official) {
    return left.official ? -1 : 1;
  }

  return left.name.localeCompare(right.name);
}

function resolveTapHealth(options: {
  syncState: BrewTap['syncState'];
  dirty: boolean;
  warning: string | null;
}): BrewTap['health'] {
  if (options.syncState === 'unknown') {
    return 'error';
  }

  if (
    options.dirty
    || options.warning
    || options.syncState === 'ahead'
    || options.syncState === 'behind'
    || options.syncState === 'diverged'
    || options.syncState === 'noUpstream'
  ) {
    return 'attention';
  }

  return 'healthy';
}

function resolveMissingTapGitState(options: {
  protectedTap: boolean;
  userTapped: boolean;
}): TapGitState {
  // In Homebrew API mode, core/cask may not be cloned to disk.
  if (options.protectedTap && !options.userTapped) {
    return {
      remote: null,
      branch: null,
      upstream: null,
      ahead: null,
      behind: null,
      dirty: false,
      syncState: 'upToDate',
      warning: null
    };
  }

  return {
    remote: null,
    branch: null,
    upstream: null,
    ahead: null,
    behind: null,
    dirty: false,
    syncState: 'unknown',
    warning: 'Tap git repository is not available locally.'
  };
}

async function resolveTapGitState(path: string | null): Promise<TapGitState> {
  if (!path) {
    return {
      remote: null,
      branch: null,
      upstream: null,
      ahead: null,
      behind: null,
      dirty: false,
      syncState: 'unknown',
      warning: 'Tap git repository is not available locally.'
    };
  }

  try {
    const [statusResult, remoteResult] = await Promise.all([
      runGitCommand(['-C', path, 'status', '--porcelain=2', '--branch']),
      runGitCommand(['-C', path, 'config', '--get', 'remote.origin.url']).catch(() => ({
        stdout: '',
        stderr: '',
        exitCode: 0
      }))
    ]);
    const parsed = parseTapGitStatus(statusResult.stdout);

    return {
      ...parsed,
      remote: readString(remoteResult.stdout)
    };
  } catch (error) {
    return {
      remote: null,
      branch: null,
      upstream: null,
      ahead: null,
      behind: null,
      dirty: false,
      syncState: 'unknown',
      warning: `Unable to inspect tap git status: ${(error as Error).message}`
    };
  }
}

function parseTapGitStatus(stdout: string): Omit<TapGitState, 'remote' | 'warning'> {
  let branch: string | null = null;
  let upstream: string | null = null;
  let ahead: number | null = null;
  let behind: number | null = null;
  let dirty = false;

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    if (trimmed.startsWith('# branch.head ')) {
      const value = trimmed.replace('# branch.head ', '').trim();
      branch = value === '(detached)' ? null : value;
      continue;
    }

    if (trimmed.startsWith('# branch.upstream ')) {
      upstream = trimmed.replace('# branch.upstream ', '').trim() || null;
      continue;
    }

    if (trimmed.startsWith('# branch.ab ')) {
      const match = trimmed.match(/^# branch\.ab \+(\d+) \-(\d+)$/);
      if (match) {
        ahead = Number(match[1]);
        behind = Number(match[2]);
      }
      continue;
    }

    if (!trimmed.startsWith('# ')) {
      dirty = true;
    }
  }

  return {
    branch,
    upstream,
    ahead,
    behind,
    dirty,
    syncState: resolveTapSyncState({ upstream, ahead, behind })
  };
}

function resolveTapSyncState(options: {
  upstream: string | null;
  ahead: number | null;
  behind: number | null;
}): BrewTap['syncState'] {
  if (!options.upstream) {
    return 'noUpstream';
  }

  if (options.ahead === null || options.behind === null) {
    return 'unknown';
  }

  if (options.ahead > 0 && options.behind > 0) {
    return 'diverged';
  }

  if (options.ahead > 0) {
    return 'ahead';
  }

  if (options.behind > 0) {
    return 'behind';
  }

  return 'upToDate';
}

async function runGitCommand(args: string[], timeoutMs = 15_000): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    const commandText = `git ${args.join(' ')}`;
    const child = spawn('git', args);

    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      if (!settled) {
        settled = true;
        reject(new Error(`${commandText} timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);

    const finalize = (): void => {
      clearTimeout(timeout);
    };

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      if (settled) {
        return;
      }

      settled = true;
      finalize();
      reject(new Error(`${commandText} failed: ${error.message}`));
    });

    child.on('close', (exitCode) => {
      if (settled) {
        return;
      }

      settled = true;
      finalize();

      if (exitCode && exitCode !== 0) {
        reject(new Error(stderr.trim() || `${commandText} exited with code ${exitCode}`));
        return;
      }

      resolve({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
  });
}

function normalizeFormulaDetails(
  raw: Record<string, unknown>,
  fallbackName: string,
  source: PackageDetails['source'],
  warnings: string[]
): PackageDetails {
  const lifecycle = normalizeLifecycleMetadata(raw, 'formula');
  const name = coerceName(raw, ['name'], fallbackName);
  const fullName = coerceName(raw, ['full_name', 'name'], name);
  const versions = isObject(raw.versions) ? raw.versions : {};
  const stableVersion = readString(versions.stable);
  const installedVersions = normalizeFormulaInstalledVersions(raw);
  const currentVersion = stableVersion;
  const headVersion = readString(versions.head);

  return {
    id: `formula:${name}`,
    kind: 'formula',
    name,
    fullName,
    desc: readString(raw.desc),
    homepage: readString(raw.homepage),
    tap: readString(raw.tap) ?? 'homebrew/core',
    license: normalizeLicense(raw.license),
    dependencies: buildFormulaDependencyGroups(raw),
    caveats: normalizeCaveats(raw.caveats),
    versionSnapshot: {
      installedVersions,
      currentVersion,
      stableVersion,
      headVersion
    },
    deprecated: lifecycle.deprecated,
    disabled: lifecycle.disabled,
    deprecationReason: lifecycle.deprecationReason,
    disableReason: lifecycle.disableReason,
    replacement: lifecycle.replacement,
    pinned: Boolean(raw.pinned),
    warnings,
    source,
    fetchedAt: new Date().toISOString()
  };
}

function normalizeCaskDetails(
  raw: Record<string, unknown>,
  fallbackName: string,
  source: PackageDetails['source'],
  warnings: string[]
): PackageDetails {
  const lifecycle = normalizeLifecycleMetadata(raw, 'cask');
  const name = coerceName(raw, ['token', 'full_token', 'name'], fallbackName);
  const fullName = coerceName(raw, ['full_token', 'token', 'name'], name);
  const stableVersion = readString(raw.version);
  const installedVersions = normalizeCaskInstalledVersions(raw);

  return {
    id: `cask:${name}`,
    kind: 'cask',
    name,
    fullName,
    desc: readString(raw.desc),
    homepage: readString(raw.homepage),
    tap: readString(raw.tap) ?? 'homebrew/cask',
    license: normalizeLicense(raw.license),
    dependencies: buildCaskDependencyGroups(raw),
    caveats: normalizeCaveats(raw.caveats),
    versionSnapshot: {
      installedVersions,
      currentVersion: stableVersion,
      stableVersion,
      headVersion: null
    },
    deprecated: lifecycle.deprecated,
    disabled: lifecycle.disabled,
    deprecationReason: lifecycle.deprecationReason,
    disableReason: lifecycle.disableReason,
    replacement: lifecycle.replacement,
    pinned: false,
    warnings,
    source,
    fetchedAt: new Date().toISOString()
  };
}

function normalizeLifecycleMetadata(
  raw: Record<string, unknown>,
  preferredKind: 'formula' | 'cask'
): {
  deprecated: boolean;
  disabled: boolean;
  deprecationReason: string | null;
  disableReason: string | null;
  replacement: PackageReplacement | null;
} {
  const deprecated = Boolean(raw.deprecated);
  const disabled = Boolean(raw.disabled);
  const deprecationReason = readString(raw.deprecation_reason);
  const disableReason = readString(raw.disable_reason);

  let replacement: PackageReplacement | null = null;
  if (disabled) {
    replacement =
      resolveLifecycleReplacement(raw, preferredKind, 'disable')
      ?? resolveLifecycleReplacement(raw, preferredKind, 'deprecation');
  } else if (deprecated) {
    replacement = resolveLifecycleReplacement(raw, preferredKind, 'deprecation');
  }

  return {
    deprecated,
    disabled,
    deprecationReason,
    disableReason,
    replacement
  };
}

function resolveLifecycleReplacement(
  raw: Record<string, unknown>,
  preferredKind: 'formula' | 'cask',
  stage: 'deprecation' | 'disable'
): PackageReplacement | null {
  const formulaName = readString(raw[`${stage}_replacement_formula`]);
  const caskName = readString(raw[`${stage}_replacement_cask`]);

  if (preferredKind === 'formula' && formulaName) {
    return {
      kind: 'formula',
      name: formulaName
    };
  }

  if (preferredKind === 'cask' && caskName) {
    return {
      kind: 'cask',
      name: caskName
    };
  }

  if (formulaName) {
    return {
      kind: 'formula',
      name: formulaName
    };
  }

  if (caskName) {
    return {
      kind: 'cask',
      name: caskName
    };
  }

  return null;
}

function buildFormulaDependencyGroups(raw: Record<string, unknown>): PackageDependencyGroup[] {
  const groups: PackageDependencyGroup[] = [];

  const runtime = normalizeStringList(raw.dependencies);
  if (runtime.length > 0) {
    groups.push({ key: 'runtime', label: 'Runtime dependencies', items: runtime });
  }

  const build = normalizeStringList(raw.build_dependencies);
  if (build.length > 0) {
    groups.push({ key: 'build', label: 'Build dependencies', items: build });
  }

  const recommended = normalizeStringList(raw.recommended_dependencies);
  if (recommended.length > 0) {
    groups.push({ key: 'recommended', label: 'Recommended dependencies', items: recommended });
  }

  const optional = normalizeStringList(raw.optional_dependencies);
  if (optional.length > 0) {
    groups.push({ key: 'optional', label: 'Optional dependencies', items: optional });
  }

  const requirements = normalizeRequirements(raw.requirements);
  if (requirements.length > 0) {
    groups.push({ key: 'requirements', label: 'Requirements', items: requirements });
  }

  return groups;
}

function buildCaskDependencyGroups(raw: Record<string, unknown>): PackageDependencyGroup[] {
  const dependsOn = flattenConstraints(raw.depends_on);
  if (dependsOn.length === 0) {
    return [];
  }

  return [
    {
      key: 'constraints',
      label: 'Cask constraints',
      items: dependsOn
    }
  ];
}

function flattenConstraints(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const text = stringifyScalar(item);
        if (!text) {
          return null;
        }

        return prefix ? `${prefix}: ${text}` : text;
      })
      .filter((item): item is string => item !== null);
  }

  if (isObject(value)) {
    const output: string[] = [];
    for (const [key, child] of Object.entries(value)) {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      output.push(...flattenConstraints(child, nextPrefix));
    }
    return output;
  }

  if (typeof value === 'boolean') {
    if (!value) {
      return [];
    }
    return prefix ? [prefix] : [];
  }

  const text = stringifyScalar(value);
  if (!text) {
    return [];
  }

  return prefix ? [`${prefix}: ${text}`] : [text];
}

function stringifyScalar(value: unknown): string | null {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === 'number' || typeof value === 'bigint') {
    return String(value);
  }

  return null;
}

function normalizeRequirements(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(
    value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (isObject(item) && typeof item.name === 'string') {
          return item.name;
        }

        return null;
      })
      .filter((item): item is string => Boolean(item))
  );
}

function normalizeFormulaInstalledVersions(raw: Record<string, unknown>): string[] {
  const installed = Array.isArray(raw.installed) ? raw.installed : [];
  return uniqueStrings(
    installed
      .map((item) => {
        if (!isObject(item)) {
          return null;
        }
        return readString(item.version);
      })
      .filter((item): item is string => Boolean(item))
  );
}

function normalizeCaskInstalledVersions(raw: Record<string, unknown>): string[] {
  if (Array.isArray(raw.installed)) {
    return uniqueStrings(
      raw.installed
        .map((item) => (typeof item === 'string' ? item : null))
        .filter((item): item is string => Boolean(item))
    );
  }

  if (typeof raw.installed === 'string') {
    return [raw.installed];
  }

  return [];
}

function normalizeLicense(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    const licenses = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim());
    return licenses.length > 0 ? licenses.join(', ') : null;
  }

  if (isObject(value)) {
    return JSON.stringify(value);
  }

  return null;
}

function normalizeCaveats(value: unknown): string | null {
  if (typeof value === 'string') {
    const caveat = value.trim();
    return caveat.length > 0 ? caveat : null;
  }

  if (Array.isArray(value)) {
    const parts = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim());
    if (parts.length > 0) {
      return parts.join('\n');
    }
  }

  return null;
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(
    value
      .map((item) => (typeof item === 'string' ? item.trim() : null))
      .filter((item): item is string => Boolean(item))
  );
}

function coerceName(raw: Record<string, unknown>, keys: string[], fallback: string): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return fallback;
}

function preferString(primary: string | null, secondary: string | null): string | null {
  if (primary && primary.trim().length > 0) {
    return primary;
  }

  if (secondary && secondary.trim().length > 0) {
    return secondary;
  }

  return null;
}

function preferReplacement(
  primary: PackageReplacement | null,
  secondary: PackageReplacement | null
): PackageReplacement | null {
  if (primary) {
    return primary;
  }

  return secondary;
}

function mergeDependencyGroups(
  localGroups: PackageDependencyGroup[],
  remoteGroups: PackageDependencyGroup[]
): PackageDependencyGroup[] {
  const grouped = new Map<PackageDependencyGroup['key'], PackageDependencyGroup>();

  for (const group of [...localGroups, ...remoteGroups]) {
    const existing = grouped.get(group.key);
    if (!existing) {
      grouped.set(group.key, {
        key: group.key,
        label: group.label,
        items: uniqueStrings(group.items)
      });
      continue;
    }

    grouped.set(group.key, {
      key: group.key,
      label: existing.label,
      items: uniqueStrings([...existing.items, ...group.items])
    });
  }

  return Array.from(grouped.values());
}

function parseDoctorOutput(rawOutput: string, command: string, exitCode: number): BrewDoctorResult {
  const findings: BrewDoctorFinding[] = [];
  const infoLines: string[] = [];
  let current: {
    severity: BrewDoctorSeverity;
    title: string;
    details: string[];
  } | null = null;

  const flushCurrent = (): void => {
    if (!current) {
      return;
    }

    findings.push({
      id: `${current.severity}-${findings.length + 1}`,
      severity: current.severity,
      title: current.title,
      details: [...current.details],
      suggestedFix: extractDoctorSuggestedFix(current.title, current.details)
    });
    current = null;
  };

  for (const line of rawOutput.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      continue;
    }

    const findingMatch = trimmed.match(/^(Warning|Error):\s*(.+)$/i);
    if (findingMatch) {
      flushCurrent();
      current = {
        severity: (findingMatch[1] ?? '').toLocaleLowerCase() === 'error' ? 'error' : 'warning',
        title: findingMatch[2]?.trim() || 'Homebrew doctor finding',
        details: []
      };
      continue;
    }

    if (current) {
      current.details.push(trimmed);
      continue;
    }

    if (!shouldIgnoreDoctorPreambleLine(trimmed)) {
      infoLines.push(trimmed);
    }
  }

  flushCurrent();

  const meaningfulInfoLines = infoLines.filter((line) => !isDoctorHealthyLine(line));
  if (meaningfulInfoLines.length > 0) {
    findings.push({
      id: `info-${findings.length + 1}`,
      severity: 'info',
      title: meaningfulInfoLines[0] ?? 'Homebrew doctor output',
      details: meaningfulInfoLines.slice(1),
      suggestedFix: extractDoctorSuggestedFix(meaningfulInfoLines[0] ?? '', meaningfulInfoLines.slice(1))
    });
  }

  const counts = findings.reduce(
    (summary, finding) => {
      summary[finding.severity] += 1;
      return summary;
    },
    {
      error: 0,
      warning: 0,
      info: 0
    }
  );

  return {
    command,
    exitCode,
    findings,
    counts,
    rawOutput,
    generatedAt: new Date().toISOString()
  };
}

function isDoctorOutputParseable(report: BrewDoctorResult, rawOutput: string): boolean {
  if (report.findings.some((finding) => finding.severity === 'warning' || finding.severity === 'error')) {
    return true;
  }

  const normalized = rawOutput.trim().toLocaleLowerCase();
  if (normalized.length === 0) {
    return true;
  }

  return normalized.includes('your system is ready to brew')
    || normalized.includes('please note that these warnings are just used');
}

function extractDoctorSuggestedFix(title: string, details: string[]): string | null {
  const candidates = [...details, title];
  for (const line of candidates) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (/`[^`]+`/.test(trimmed)) {
      return trimmed;
    }

    if (
      /^(run|untap|tap|brew|remove|delete|reinstall|install|uninstall|update|fix|set|use)\b/i.test(trimmed)
    ) {
      return trimmed;
    }

    if (/(you should|please|consider|find replacements|untap them)/i.test(trimmed)) {
      return trimmed;
    }
  }

  return null;
}

function shouldIgnoreDoctorPreambleLine(line: string): boolean {
  const normalized = line.toLocaleLowerCase();

  return normalized.startsWith('please note that these warnings are just used')
    || normalized.includes('with debugging if you file an issue')
    || normalized.includes("working fine: please don't worry")
    || normalized.includes('working fine: please dont worry')
    || normalized === 'just ignore this. thanks!';
}

function isDoctorHealthyLine(line: string): boolean {
  const normalized = line.trim().toLocaleLowerCase();
  return normalized === 'your system is ready to brew.'
    || normalized === 'your system is ready to brew';
}

function parseCleanupPreviewOutput(rawOutput: string, command: string): CleanupPreviewResult {
  const lines = rawOutput.split(/\r?\n/);
  const items: CleanupPreviewItem[] = [];
  let summaryTotalBytes: number | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    if (trimmed.startsWith('Would remove:')) {
      const parsed = parseCleanupPreviewLine(trimmed);
      if (parsed) {
        items.push(parsed);
      }
      continue;
    }

    if (trimmed.toLocaleLowerCase().includes('would free approximately')) {
      summaryTotalBytes = parseCleanupSummaryBytes(trimmed);
    }
  }

  const parsedItemTotals = items
    .map((item) => item.sizeBytes)
    .filter((size): size is number => size !== null);
  const hasNothingToDo = lines.some((line) => line.trim().toLocaleLowerCase() === 'nothing to do.');
  const fallbackTotalBytes =
    parsedItemTotals.length > 0
      ? parsedItemTotals.reduce((total, size) => total + size, 0)
      : hasNothingToDo
        ? 0
        : null;

  return {
    command,
    items,
    totalBytes: summaryTotalBytes ?? fallbackTotalBytes,
    rawOutput,
    generatedAt: new Date().toISOString()
  };
}

function parseCleanupPreviewLine(line: string): CleanupPreviewItem | null {
  const entry = line.replace(/^Would remove:\s*/u, '').trim();
  if (!entry) {
    return null;
  }

  const metadataMatch = entry.match(/^(.*?)(?:\s+\((.+)\))?$/u);
  if (!metadataMatch) {
    return null;
  }

  const path = metadataMatch[1]?.trim() ?? '';
  if (!path) {
    return null;
  }

  const metadata = metadataMatch[2]?.trim() ?? null;

  return {
    path,
    sizeBytes: parseMetadataSizeBytes(metadata),
    fileCount: parseMetadataFileCount(metadata),
    metadata
  };
}

function parseCleanupSummaryBytes(line: string): number | null {
  const match = line.match(
    /would free approximately\s+([0-9][0-9,]*(?:\.[0-9]+)?)\s*(B|KB|MB|GB|TB|PB)\b/i
  );
  if (!match) {
    return null;
  }

  return parseHumanReadableBytes(match[1] ?? '', match[2] ?? '');
}

function parseMetadataSizeBytes(metadata: string | null): number | null {
  if (!metadata) {
    return null;
  }

  const matches = [...metadata.matchAll(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(B|KB|MB|GB|TB|PB)\b/gi)];
  if (matches.length === 0) {
    return null;
  }

  const last = matches[matches.length - 1];
  if (!last) {
    return null;
  }

  return parseHumanReadableBytes(last[1] ?? '', last[2] ?? '');
}

function parseMetadataFileCount(metadata: string | null): number | null {
  if (!metadata) {
    return null;
  }

  const match = metadata.match(/([0-9][0-9,]*)\s+files?/i);
  if (!match?.[1]) {
    return null;
  }

  const parsed = Number.parseInt(match[1].replaceAll(',', ''), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function parseHumanReadableBytes(valueText: string, unitText: string): number | null {
  const numberValue = Number.parseFloat(valueText.replaceAll(',', ''));
  if (!Number.isFinite(numberValue)) {
    return null;
  }

  const multiplier: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
    PB: 1024 ** 5
  };
  const unit = unitText.toUpperCase();
  const unitMultiplier = multiplier[unit];
  if (!unitMultiplier) {
    return null;
  }

  return Math.round(numberValue * unitMultiplier);
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBrewServiceEntry(value: unknown): BrewService | null {
  if (!isObject(value)) {
    return null;
  }

  const name = readString(value['name']);
  if (!name) {
    return null;
  }

  return {
    name,
    status: normalizeServiceStatus(readString(value['status'])),
    user: readString(value['user']),
    file: readString(value['file']),
    exitCode: readInteger(value['exit_code'])
  };
}

function normalizeServiceStatus(value: string | null): BrewServiceStatus {
  if (!value) {
    return 'unknown';
  }

  const normalized = value.toLocaleLowerCase();
  switch (normalized) {
    case 'started':
    case 'stopped':
    case 'none':
    case 'scheduled':
      return normalized;
    case 'error':
      return 'error';
    default:
      return normalized.includes('error') ? 'error' : 'unknown';
  }
}

function readInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }

  return null;
}
