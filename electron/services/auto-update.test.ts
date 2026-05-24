import { beforeEach, describe, expect, it, vi } from 'vitest';

const updaterListeners = new Map<string, (payload?: unknown) => void>();

const autoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  on: vi.fn((event: string, handler: (payload?: unknown) => void) => {
    updaterListeners.set(event, handler);
  }),
  checkForUpdates: vi.fn(async () => undefined),
  quitAndInstall: vi.fn()
};

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getVersion: () => '1.0.0'
  }
}));

vi.mock('electron-updater', () => ({
  autoUpdater
}));

vi.mock('../utils/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn()
  }
}));

describe('auto-update service', () => {
  beforeEach(async () => {
    updaterListeners.clear();
    autoUpdater.on.mockClear();
    autoUpdater.checkForUpdates.mockClear();
    autoUpdater.quitAndInstall.mockClear();
    vi.resetModules();
  });

  async function loadModule() {
    return import('./auto-update');
  }

  it('maps updater events to state', async () => {
    const onStateChanged = vi.fn();
    const { configureAutoUpdate, getUpdateState, checkForAppUpdate } = await loadModule();

    configureAutoUpdate({ onStateChanged });
    expect(getUpdateState().status).toBe('checking');

    updaterListeners.get('update-available')?.({
      version: '2.0.0',
      releaseNotes: 'Release notes'
    });
    expect(getUpdateState()).toMatchObject({
      status: 'downloading',
      availableVersion: '2.0.0',
      releaseNotes: 'Release notes'
    });

    updaterListeners.get('update-downloaded')?.({
      version: '2.0.0',
      releaseNotes: null
    });
    expect(getUpdateState().status).toBe('ready');

    updaterListeners.get('update-not-available')?.();
    expect(getUpdateState().status).toBe('upToDate');

    updaterListeners.get('error')?.(new Error('network failed'));
    expect(getUpdateState()).toMatchObject({
      status: 'error',
      error: 'network failed'
    });

    onStateChanged.mockClear();
    await checkForAppUpdate();
    expect(getUpdateState().status).toBe('checking');
    expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
    expect(onStateChanged).toHaveBeenCalled();
  });

  it('quits and installs only when update is ready', async () => {
    const { configureAutoUpdate, quitAndInstallUpdate, getUpdateState } = await loadModule();

    configureAutoUpdate();
    await quitAndInstallUpdate();
    expect(autoUpdater.quitAndInstall).not.toHaveBeenCalled();

    updaterListeners.get('update-downloaded')?.({ version: '2.0.0', releaseNotes: null });
    expect(getUpdateState().status).toBe('ready');

    await quitAndInstallUpdate();
    expect(autoUpdater.quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it('does not stack updater listeners when configured twice', async () => {
    const { configureAutoUpdate } = await loadModule();

    configureAutoUpdate();
    configureAutoUpdate();

    expect(autoUpdater.on).toHaveBeenCalledTimes(4);
  });

  it('starts disabled when the app is not packaged', async () => {
    vi.doMock('electron', () => ({
      app: {
        isPackaged: false,
        getVersion: () => '1.0.0'
      }
    }));
    const { configureAutoUpdate, getUpdateState, isAutoUpdateEnabled } = await loadModule();

    configureAutoUpdate();
    expect(isAutoUpdateEnabled()).toBe(false);
    expect(getUpdateState().status).toBe('disabled');
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
});
