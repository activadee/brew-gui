import { randomUUID } from 'node:crypto';

import type {
  BrewAvailability,
  BrewJobCompleteEvent,
  BrewJobFailedEvent,
  BrewJobProgressEvent,
  CatalogPackage,
  CheckNowResult,
  InstallOneRequest,
  InstalledPackage,
  OutdatedPackage,
  SearchCatalogRequest,
  SearchCatalogResponse,
  SyncMetadataResult,
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
import { BrewRunner } from './brew-runner';

const CATALOG_TTL_MS = 24 * 60 * 60 * 1000;

interface CatalogMaterialized {
  packages: CatalogPackage[];
  source: 'network' | 'cache';
  stale: boolean;
  fetchedAt: string | null;
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

export function buildUninstallCommand(request: UninstallOneRequest): string[] {
  if (request.kind === 'formula') {
    return ['uninstall', '--formula', request.name];
  }

  return request.zap
    ? ['uninstall', '--cask', '--zap', request.name]
    : ['uninstall', '--cask', request.name];
}

export class HomebrewService {
  private readonly runner = new BrewRunner();
  private readonly mutationQueue = new CommandQueue();
  private readonly catalogCache = new CatalogCache();

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

  async checkNow(): Promise<CheckNowResult> {
    const outdated = await this.getOutdated();

    return {
      count: outdated.length,
      checkedAt: new Date().toISOString()
    };
  }

  async syncMetadata(): Promise<SyncMetadataResult> {
    log.info('Running explicit brew metadata sync');

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

  async upgradeOne(request: UpgradeOneRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    const jobId = randomUUID();

    sink.onProgress({
      jobId,
      stage: 'queued',
      message: `Queued upgrade for ${request.name}`,
      packageName: request.name,
      kind: request.kind,
      timestamp: new Date().toISOString()
    });

    return this.mutationQueue.enqueue((signal) =>
      this.runUpgradeJob(
        jobId,
        request.kind === 'formula'
          ? ['upgrade', '--formula', request.name]
          : ['upgrade', '--cask', request.name],
        sink,
        request.kind,
        request.name,
        signal
      )
    );
  }

  async installOne(request: InstallOneRequest, sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    const jobId = randomUUID();
    const command = buildInstallCommand(request);
    const installTimeoutMs = 20 * 60 * 1000;

    sink.onProgress({
      jobId,
      stage: 'queued',
      message: `Queued install for ${request.name}`,
      packageName: request.name,
      kind: request.kind,
      timestamp: new Date().toISOString()
    });

    return this.mutationQueue.enqueue(async (signal) => {
      sink.onProgress({
        jobId,
        stage: 'running',
        message: `Installing ${request.name}`,
        packageName: request.name,
        kind: request.kind,
        timestamp: new Date().toISOString()
      });

      try {
        const result = await this.runner.runText(command, {
          signal,
          timeoutMs: installTimeoutMs,
          onStdout: (chunk) =>
            sink.onProgress({
              jobId,
              stage: 'output',
              message: chunk,
              packageName: request.name,
              kind: request.kind,
              timestamp: new Date().toISOString()
            }),
          onStderr: (chunk) =>
            sink.onProgress({
              jobId,
              stage: 'output',
              message: chunk,
              packageName: request.name,
              kind: request.kind,
              timestamp: new Date().toISOString()
            })
        });

        const event: BrewJobCompleteEvent = {
          jobId,
          success: true,
          output: `${result.stdout}${result.stderr}`.trim(),
          timestamp: new Date().toISOString()
        };

        sink.onComplete(event);
        return event;
      } catch (error) {
        const failed: BrewJobFailedEvent = {
          jobId,
          error: (error as Error).message,
          output: '',
          timestamp: new Date().toISOString()
        };

        sink.onFailed(failed);
        throw error;
      }
    }, installTimeoutMs);
  }

  async uninstallOne(
    request: UninstallOneRequest,
    sink: JobEventSink
  ): Promise<BrewJobCompleteEvent> {
    const jobId = randomUUID();
    const command = buildUninstallCommand(request);
    const uninstallTimeoutMs = 20 * 60 * 1000;
    const uninstallTarget = request.kind === 'cask' && request.zap ? `${request.name} (--zap)` : request.name;

    sink.onProgress({
      jobId,
      stage: 'queued',
      message: `Queued uninstall for ${uninstallTarget}`,
      packageName: request.name,
      kind: request.kind,
      timestamp: new Date().toISOString()
    });

    return this.mutationQueue.enqueue(async (signal) => {
      sink.onProgress({
        jobId,
        stage: 'running',
        message: `Uninstalling ${uninstallTarget}`,
        packageName: request.name,
        kind: request.kind,
        timestamp: new Date().toISOString()
      });

      try {
        const result = await this.runner.runText(command, {
          signal,
          timeoutMs: uninstallTimeoutMs,
          onStdout: (chunk) =>
            sink.onProgress({
              jobId,
              stage: 'output',
              message: chunk,
              packageName: request.name,
              kind: request.kind,
              timestamp: new Date().toISOString()
            }),
          onStderr: (chunk) =>
            sink.onProgress({
              jobId,
              stage: 'output',
              message: chunk,
              packageName: request.name,
              kind: request.kind,
              timestamp: new Date().toISOString()
            })
        });

        const event: BrewJobCompleteEvent = {
          jobId,
          success: true,
          output: `${result.stdout}${result.stderr}`.trim(),
          timestamp: new Date().toISOString()
        };

        sink.onComplete(event);
        return event;
      } catch (error) {
        const failed: BrewJobFailedEvent = {
          jobId,
          error: (error as Error).message,
          output: '',
          timestamp: new Date().toISOString()
        };

        sink.onFailed(failed);
        throw error;
      }
    }, uninstallTimeoutMs);
  }

  async upgradeAll(sink: JobEventSink): Promise<BrewJobCompleteEvent> {
    const jobId = randomUUID();

    sink.onProgress({
      jobId,
      stage: 'queued',
      message: 'Queued upgrade for all outdated packages',
      packageName: null,
      kind: null,
      timestamp: new Date().toISOString()
    });

    return this.mutationQueue.enqueue(async (signal) => {
      sink.onProgress({
        jobId,
        stage: 'running',
        message: 'Running formula upgrades',
        packageName: null,
        kind: null,
        timestamp: new Date().toISOString()
      });

      const formulaOutput = await this.runner.runText(['upgrade', '--formula'], {
        signal,
        timeoutMs: 30 * 60 * 1000,
        onStdout: (chunk) =>
          sink.onProgress({
            jobId,
            stage: 'output',
            message: chunk,
            packageName: null,
            kind: 'formula',
            timestamp: new Date().toISOString()
          }),
        onStderr: (chunk) =>
          sink.onProgress({
            jobId,
            stage: 'output',
            message: chunk,
            packageName: null,
            kind: 'formula',
            timestamp: new Date().toISOString()
          })
      });

      sink.onProgress({
        jobId,
        stage: 'running',
        message: 'Running cask upgrades',
        packageName: null,
        kind: null,
        timestamp: new Date().toISOString()
      });

      const caskOutput = await this.runner.runText(['upgrade', '--cask'], {
        signal,
        timeoutMs: 30 * 60 * 1000,
        onStdout: (chunk) =>
          sink.onProgress({
            jobId,
            stage: 'output',
            message: chunk,
            packageName: null,
            kind: 'cask',
            timestamp: new Date().toISOString()
          }),
        onStderr: (chunk) =>
          sink.onProgress({
            jobId,
            stage: 'output',
            message: chunk,
            packageName: null,
            kind: 'cask',
            timestamp: new Date().toISOString()
          })
      });

      const event: BrewJobCompleteEvent = {
        jobId,
        success: true,
        output: `${formulaOutput.stdout}\n${formulaOutput.stderr}\n${caskOutput.stdout}\n${caskOutput.stderr}`.trim(),
        timestamp: new Date().toISOString()
      };

      sink.onComplete(event);
      return event;
    });
  }

  private async runUpgradeJob(
    jobId: string,
    command: string[],
    sink: JobEventSink,
    kind: 'formula' | 'cask',
    packageName: string,
    signal: AbortSignal
  ): Promise<BrewJobCompleteEvent> {
    sink.onProgress({
      jobId,
      stage: 'running',
      message: `Upgrading ${packageName}`,
      packageName,
      kind,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await this.runner.runText(command, {
        signal,
        timeoutMs: 20 * 60 * 1000,
        onStdout: (chunk) =>
          sink.onProgress({
            jobId,
            stage: 'output',
            message: chunk,
            packageName,
            kind,
            timestamp: new Date().toISOString()
          }),
        onStderr: (chunk) =>
          sink.onProgress({
            jobId,
            stage: 'output',
            message: chunk,
            packageName,
            kind,
            timestamp: new Date().toISOString()
          })
      });

      const event: BrewJobCompleteEvent = {
        jobId,
        success: true,
        output: `${result.stdout}${result.stderr}`.trim(),
        timestamp: new Date().toISOString()
      };

      sink.onComplete(event);
      return event;
    } catch (error) {
      const failed: BrewJobFailedEvent = {
        jobId,
        error: (error as Error).message,
        output: '',
        timestamp: new Date().toISOString()
      };

      sink.onFailed(failed);
      throw error;
    }
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
