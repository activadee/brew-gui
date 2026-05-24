import path from 'node:path';

import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  nativeTheme,
  type BrowserWindowConstructorOptions
} from 'electron';

import type { CheckNowResult, WindowChromeState, WindowControlAction } from '../src/shared/contracts';
import { IPC_CHANNELS } from './ipc-channels';
import { registerIpcHandlers } from './ipc';
import { configureAutoUpdate } from './services/auto-update';
import { BackgroundScheduler, type UpdateCheckTrigger } from './services/background-scheduler';
import { ActionTemplateRunner } from './services/action-template-runner';
import { ActionTemplatesStore } from './services/action-templates-store';
import { ActiveJobsStore } from './services/active-jobs-store';
import { HomebrewService, type JobEventSink } from './services/homebrew-service';
import { JobEventBridge } from './services/job-event-bridge';
import { JobHistoryStore } from './services/job-history-store';
import { SettingsStore } from './services/settings-store';
import { TelemetryStore } from './services/telemetry-store';
import { TrayAlertController } from './services/tray-alert-controller';
import { log } from './utils/logger';

const isDev = !app.isPackaged || Boolean(process.env.ELECTRON_START_URL);
const isDarwin = process.platform === 'darwin';

const WINDOW_BACKGROUND = {
  light: '#ececef',
  dark: '#252525'
} as const;

function resolveWindowBackgroundColor(): string {
  return nativeTheme.shouldUseDarkColors ? WINDOW_BACKGROUND.dark : WINDOW_BACKGROUND.light;
}

function syncWindowBackgroundColors(): void {
  const backgroundColor = resolveWindowBackgroundColor();

  for (const window of [mainWindow, trayWindow]) {
    if (window && !window.isDestroyed()) {
      window.setBackgroundColor(backgroundColor);
    }
  }
}

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const settingsStore = new SettingsStore();
const homebrewService = new HomebrewService();
const historyStore = new JobHistoryStore();
const activeJobsStore = new ActiveJobsStore();
const telemetryStore = new TelemetryStore();
const templatesStore = new ActionTemplatesStore(settingsStore);

const innerJobEventSink: JobEventSink = {
  onProgress: (event) => {
    emitRendererEvent(IPC_CHANNELS.EVENTS_JOB_PROGRESS, event);
  },
  onComplete: (event) => {
    emitRendererEvent(IPC_CHANNELS.EVENTS_JOB_COMPLETE, event);
  },
  onFailed: (event) => {
    emitRendererEvent(IPC_CHANNELS.EVENTS_JOB_FAILED, event);
  }
};

const jobEventSink = new JobEventBridge({
  inner: innerJobEventSink,
  historyStore,
  activeJobsStore,
  telemetryStore
});

const templateRunner = new ActionTemplateRunner(templatesStore, homebrewService, jobEventSink);
telemetryStore.setEnabled(settingsStore.getSettings().telemetryEnabled);

const trayAlertController = new TrayAlertController({
  onFlushMutedCount: (count) => {
    applyTrayUpdateSignal(count);
  }
});

const backgroundScheduler = new BackgroundScheduler({
  homebrew: homebrewService,
  settingsStore,
  jobSink: jobEventSink,
  onUpdateCheckResult: (result, trigger) => {
    emitUpdatesChanged(result.count, result.checkedAt, trigger);
  }
});

const preloadPath = path.join(__dirname, 'preload.js');

function resolveWindowPlatform(platform: NodeJS.Platform): WindowChromeState['platform'] {
  switch (platform) {
    case 'darwin':
    case 'linux':
    case 'win32':
      return platform;
    default:
      return 'unknown';
  }
}

function getMainWindowChromeState(): WindowChromeState {
  const window = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
  const hasWindow = Boolean(window);

  return {
    platform: resolveWindowPlatform(process.platform),
    isFocused: window?.isFocused() ?? false,
    isMaximized: window?.isMaximized() ?? false,
    isFullScreen: window?.isFullScreen() ?? false,
    canClose: hasWindow,
    canMinimize: hasWindow,
    canZoom: hasWindow,
    canFullScreen: hasWindow
  };
}

function emitWindowChromeChanged(): void {
  const payload = getMainWindowChromeState();

  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(IPC_CHANNELS.EVENTS_WINDOW_CHROME_CHANGED, payload);
    }
  }
}

function createMainWindow(): BrowserWindow {
  const settings = settingsStore.getSettings();

  const window = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 880,
    minHeight: 620,
    title: 'Brewdeck',
    backgroundColor: resolveWindowBackgroundColor(),
    autoHideMenuBar: true,
    skipTaskbar: false,
    frame: true,
    ...(isDarwin
      ? {
          titleBarStyle: 'hiddenInset' as const,
          vibrancy: 'sidebar' as const,
          visualEffectState: 'followWindow' as const
        }
      : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  loadRenderer(window, `/${settings.defaultView}`);

  window.on('close', (event) => {
    if (isDarwin && !isQuitting) {
      event.preventDefault();
      hideMainWindowToTray();
    }
  });

  window.on('focus', () => {
    emitWindowChromeChanged();
  });

  window.on('blur', () => {
    emitWindowChromeChanged();
  });

  window.on('maximize', () => {
    emitWindowChromeChanged();
  });

  window.on('unmaximize', () => {
    emitWindowChromeChanged();
  });

  window.on('enter-full-screen', () => {
    emitWindowChromeChanged();
  });

  window.on('leave-full-screen', () => {
    emitWindowChromeChanged();
  });

  window.on('show', () => {
    emitWindowChromeChanged();
  });

  window.on('hide', () => {
    emitWindowChromeChanged();
  });

  window.on('closed', () => {
    mainWindow = null;
    emitWindowChromeChanged();
  });

  return window;
}

function createTrayWindow(): BrowserWindow {
  const windowOptions: BrowserWindowConstructorOptions = {
    width: 380,
    height: 480,
    frame: false,
    resizable: false,
    movable: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: resolveWindowBackgroundColor(),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  };

  const window = new BrowserWindow(windowOptions);
  loadRenderer(window, '/tray');

  window.on('blur', () => {
    if (!window.webContents.isDevToolsOpened()) {
      window.hide();
    }
  });

  return window;
}

function createTray(): Tray {
  const trayInstance = new Tray(loadTrayIcon());

  trayInstance.setToolTip('Brewdeck');
  trayInstance.on('click', () => {
    toggleTrayWindow();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Brewdeck',
      click: () => {
        showMainWindow();
      }
    },
    {
      label: 'Check for updates now',
      click: () => {
        void backgroundScheduler.runManualUpdateCheck().catch((error) => {
          log.warn('Manual tray update check failed', error);
        });
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);

  trayInstance.on('right-click', () => {
    trayWindow?.hide();
    trayInstance.popUpContextMenu(contextMenu);
  });

  trayInstance.on('double-click', () => {
    showMainWindow();
    trayWindow?.hide();
  });

  return trayInstance;
}

function showMainWindow(): void {
  mainWindow ??= createMainWindow();
  if (isDarwin) {
    app.dock.show();
  }
  mainWindow.setSkipTaskbar(false);
  mainWindow.show();
  mainWindow.focus();
  emitWindowChromeChanged();
}

function hideMainWindowToTray(): void {
  if (!mainWindow) {
    return;
  }

  mainWindow.hide();
  mainWindow.setSkipTaskbar(true);
  if (isDarwin) {
    app.dock.hide();
  }

  emitWindowChromeChanged();
}

function controlMainWindow(action: WindowControlAction): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  switch (action) {
    case 'close':
      mainWindow.close();
      break;
    case 'minimize':
      mainWindow.minimize();
      break;
    case 'toggleZoom':
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
      break;
    case 'toggleFullScreen':
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      break;
    default:
      break;
  }

  emitWindowChromeChanged();
}

function loadTrayIcon() {
  const pngPath = path.join(__dirname, '../public/icons/trayTemplate.png');
  const png2xPath = path.join(__dirname, '../public/icons/trayTemplate@2x.png');

  const baseIcon = nativeImage.createFromPath(pngPath);
  const retinaIcon = nativeImage.createFromPath(png2xPath);

  if (baseIcon.isEmpty()) {
    return nativeImage.createEmpty();
  }

  if (!retinaIcon.isEmpty()) {
    baseIcon.addRepresentation({
      scaleFactor: 2,
      width: retinaIcon.getSize().width,
      height: retinaIcon.getSize().height,
      buffer: retinaIcon.toPNG()
    });
  }

  const resized = baseIcon.resize({ width: 18, height: 18, quality: 'best' });
  if (isDarwin) {
    resized.setTemplateImage(true);
  }

  return resized;
}

function toggleTrayWindow(): void {
  if (!tray || !trayWindow) {
    return;
  }

  if (trayWindow.isVisible()) {
    trayWindow.hide();
    return;
  }

  const trayBounds = tray.getBounds();
  const windowBounds = trayWindow.getBounds();

  const x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2);
  const y = Math.round(trayBounds.y + trayBounds.height + 6);

  trayWindow.setPosition(x, y, false);
  trayWindow.show();
  trayWindow.focus();
}

async function loadRenderer(window: BrowserWindow, route: string): Promise<void> {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;

  if (isDev) {
    const baseUrl = process.env.ELECTRON_START_URL ?? 'http://127.0.0.1:4200';
    await window.loadURL(`${baseUrl}/#${normalizedRoute}`);
    return;
  }

  const rendererPath = path.join(app.getAppPath(), 'dist/brew-gui/browser/index.html');
  await window.loadFile(rendererPath, {
    hash: normalizedRoute.replace(/^\//, '')
  });
}

function emitUpdatesChanged(
  count: number,
  checkedAt: string,
  trigger: UpdateCheckTrigger = 'manual'
): void {
  const payload = { count, checkedAt };

  emitRendererEvent(IPC_CHANNELS.EVENTS_UPDATES_CHANGED, payload);

  if (!tray) {
    return;
  }

  const shouldMute = trayAlertController.shouldMuteUpdateSignal(
    resolveUpdateSignalSource(trigger),
    count
  );
  if (!shouldMute) {
    applyTrayUpdateSignal(count);
  }
}

function registerHandlers(): void {
  registerIpcHandlers({
    homebrew: homebrewService,
    settingsStore,
    templatesStore,
    templateRunner,
    historyStore,
    activeJobsStore,
    telemetryStore,
    jobSink: jobEventSink,
    onSettingsChanged: (settings) => {
      backgroundScheduler.onSettingsChanged(settings);
      trayAlertController.updateSettings(settings);
    },
    runManualUpdateCheck: async (): Promise<CheckNowResult> => {
      return backgroundScheduler.runManualUpdateCheck();
    },
    runManualMetadataSync: async () => {
      return backgroundScheduler.runManualMetadataSync();
    },
    runManualCleanup: async () => {
      return backgroundScheduler.runManualCleanup();
    },
    onOpenMainWindow: () => {
      showMainWindow();
      trayWindow?.hide();
    },
    onWindowControl: (action) => {
      controlMainWindow(action);
    },
    getWindowChromeState: () => getMainWindowChromeState()
  });
}

async function bootstrap(): Promise<void> {
  nativeTheme.on('updated', () => {
    syncWindowBackgroundColors();
  });

  mainWindow = createMainWindow();
  trayWindow = createTrayWindow();
  tray = createTray();
  const settings = settingsStore.getSettings();
  trayAlertController.updateSettings(settings);

  registerHandlers();
  configureAutoUpdate({
    onStateChanged: (state) => {
      emitRendererEvent(IPC_CHANNELS.EVENTS_UPDATE_STATE_CHANGED, state);
    }
  });
  backgroundScheduler.start(settings);
  emitWindowChromeChanged();

  await backgroundScheduler.runStartupCatchup();
  if (!settings.autoCheckOnLaunch) {
    const checkedAt = settingsStore.getLastCheckedAt() ?? new Date().toISOString();
    emitUpdatesChanged(settingsStore.getLastUpdateCount(), checkedAt, 'startup');
  }
}

app.whenReady().then(() => {
  void bootstrap();

  app.on('activate', () => {
    showMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (!isDarwin) {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
  backgroundScheduler.stop();
  trayAlertController.stop();
});

function emitRendererEvent(channel: string, payload: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, payload);
    }
  }
}

function applyTrayUpdateSignal(count: number): void {
  if (!tray) {
    return;
  }

  const notify = settingsStore.getSettings().trayNotifyOnUpdates;
  tray.setToolTip(count > 0 ? `Brewdeck • ${count} updates available` : 'Brewdeck • Up to date');
  tray.setTitle(notify && count > 0 ? `${count}` : '');
}

function resolveUpdateSignalSource(trigger: UpdateCheckTrigger): 'manual' | 'scheduled' | 'startup' {
  switch (trigger) {
    case 'manual':
      return 'manual';
    case 'startup':
      return 'startup';
    case 'scheduled':
    default:
      return 'scheduled';
  }
}
