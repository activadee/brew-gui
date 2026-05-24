import { beforeEach, describe, expect, it, vi } from 'vitest';

const updaterListeners = new Map<string, (payload?: unknown) => void>();

const autoUpdater = {
  autoDownload: false,
  autoInstallOnAppQuit: false,
  allowPrerelease: false,
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
    autoUpdater.allowPrerelease = false;
    vi.resetModules();
  });

  async function loadModule() {
    return import('./auto-update');
  }

  async function bootstrapAutoUpdate(onStateChanged = vi.fn()) {
    const module = await loadModule();
    module.configureAutoUpdate({ onStateChanged });
    module.applyAppReleaseChannel('stable');
    module.startAutoUpdatePolling();
    return module;
  }

  it('maps updater events to state', async () => {
    const onStateChanged = vi.fn();
    const { getUpdateState, checkForAppUpdate } = await bootstrapAutoUpdate(onStateChanged);

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
    const { quitAndInstallUpdate, getUpdateState } = await bootstrapAutoUpdate();

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

  it('sets allowPrerelease before initial check when configured for nightly', async () => {
    const { configureAutoUpdate, applyAppReleaseChannel, startAutoUpdatePolling } = await loadModule();

    configureAutoUpdate();
    applyAppReleaseChannel('nightly');
    expect(autoUpdater.allowPrerelease).toBe(true);

    startAutoUpdatePolling();
    expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
  });

  it('re-checks for updates when release channel changes after configure', async () => {
    const { applyAppReleaseChannel } = await bootstrapAutoUpdate();

    autoUpdater.checkForUpdates.mockClear();

    applyAppReleaseChannel('nightly');
    expect(autoUpdater.allowPrerelease).toBe(true);
    expect(autoUpdater.checkForUpdates).toHaveBeenCalledTimes(1);

    autoUpdater.checkForUpdates.mockClear();
    applyAppReleaseChannel('nightly');
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });

  it('clears pending update state when release channel changes', async () => {
    const { applyAppReleaseChannel, getUpdateState } = await bootstrapAutoUpdate();

    updaterListeners.get('update-downloaded')?.({ version: '2.0.0', releaseNotes: 'Notes' });
    expect(getUpdateState()).toMatchObject({
      status: 'ready',
      availableVersion: '2.0.0'
    });

    applyAppReleaseChannel('nightly');

    expect(getUpdateState()).toMatchObject({
      status: 'checking',
      availableVersion: undefined,
      releaseNotes: undefined
    });
  });

  it('starts disabled when the app is not packaged', async () => {
    vi.doMock('electron', () => ({
      app: {
        isPackaged: false,
        getVersion: () => '1.0.0'
      }
    }));
    const { configureAutoUpdate, getUpdateState, isAutoUpdateEnabled, startAutoUpdatePolling } =
      await loadModule();

    configureAutoUpdate();
    startAutoUpdatePolling();
    expect(isAutoUpdateEnabled()).toBe(false);
    expect(getUpdateState().status).toBe('disabled');
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
  });
});
