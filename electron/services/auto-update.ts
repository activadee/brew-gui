import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import type { AppUpdateState } from '../../src/shared/contracts';
import { log } from '../utils/logger';

declare const __ENABLE_AUTO_UPDATES__: boolean;

type UpdateStateEmitter = (state: AppUpdateState) => void;

interface ConfigureAutoUpdateOptions {
  onStateChanged?: UpdateStateEmitter;
}

let currentState: AppUpdateState = createInitialState();
let stateEmitter: UpdateStateEmitter | null = null;
let configured = false;

function createInitialState(): AppUpdateState {
  return {
    status: isAutoUpdateEnabled() ? 'upToDate' : 'disabled',
    currentVersion: app.getVersion()
  };
}

function setState(patch: Partial<AppUpdateState> & Pick<AppUpdateState, 'status'>): void {
  currentState = {
    ...currentState,
    ...patch,
    currentVersion: app.getVersion()
  };
  stateEmitter?.(currentState);
}

export function isAutoUpdateEnabled(): boolean {
  return app.isPackaged && __ENABLE_AUTO_UPDATES__;
}

export function getUpdateState(): AppUpdateState {
  return currentState;
}

export async function checkForAppUpdate(): Promise<void> {
  if (!isAutoUpdateEnabled()) {
    return;
  }

  setState({ status: 'checking', error: undefined });
  await autoUpdater.checkForUpdates();
}

export async function quitAndInstallUpdate(): Promise<void> {
  if (!isAutoUpdateEnabled() || currentState.status !== 'ready') {
    return;
  }

  autoUpdater.quitAndInstall();
}

export function configureAutoUpdate(options: ConfigureAutoUpdateOptions = {}): void {
  stateEmitter = options.onStateChanged ?? null;
  currentState = createInitialState();
  stateEmitter?.(currentState);

  if (!isAutoUpdateEnabled()) {
    log.info(
      'Auto-updater is disabled (unpackaged dev builds, or ENABLE_AUTO_UPDATES=0 at build time).'
    );
    return;
  }

  if (configured) {
    return;
  }
  configured = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (error) => {
    log.warn('Auto-updater error', error, { correlationId: 'auto-update' });
    setState({
      status: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available', { version: info.version, correlationId: 'auto-update' });
    setState({
      status: 'downloading',
      availableVersion: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
      error: undefined
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available', { correlationId: 'auto-update' });
    setState({
      status: 'upToDate',
      availableVersion: undefined,
      releaseNotes: undefined,
      error: undefined
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded; restart to apply', { version: info.version, correlationId: 'auto-update' });
    setState({
      status: 'ready',
      availableVersion: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
      error: undefined
    });
  });

  void checkForAppUpdate();
}
