import path from 'node:path';

import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  type BrowserWindowConstructorOptions
} from 'electron';

import type { WindowChromeState, WindowControlAction } from '../src/shared/contracts';
import { IPC_CHANNELS } from './ipc-channels';
import { registerIpcHandlers } from './ipc';
import { configureAutoUpdate } from './services/auto-update';
import { HomebrewService } from './services/homebrew-service';
import { SettingsStore } from './services/settings-store';
import { log } from './utils/logger';

const isDev = !app.isPackaged || Boolean(process.env.ELECTRON_START_URL);
const isDarwin = process.platform === 'darwin';

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let intervalHandle: NodeJS.Timeout | null = null;
let isQuitting = false;

const settingsStore = new SettingsStore();
const homebrewService = new HomebrewService();

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
    title: 'Brew Sidebar',
    backgroundColor: '#ececef',
    autoHideMenuBar: true,
    skipTaskbar: false,
    frame: !isDarwin,
    ...(isDarwin
      ? {
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
    height: 420,
    frame: false,
    resizable: false,
    movable: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#ececef',
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

  trayInstance.setToolTip('Brew Sidebar');
  trayInstance.on('click', () => {
    toggleTrayWindow();
  });

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Brew Sidebar',
      click: () => {
        showMainWindow();
      }
    },
    {
      label: 'Check for updates now',
      click: () => {
        void runUpdateCheck();
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

  const rendererPath = path.join(__dirname, '../dist/brew-gui/browser/index.html');
  await window.loadFile(rendererPath, {
    hash: normalizedRoute.replace(/^\//, '')
  });
}

function emitUpdatesChanged(count: number, checkedAt: string): void {
  const payload = { count, checkedAt };

  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send('updates:changed', payload);
    }
  }

  if (tray) {
    const notify = settingsStore.getSettings().trayNotifyOnUpdates;
    tray.setToolTip(count > 0 ? `Brew Sidebar • ${count} updates available` : 'Brew Sidebar • Up to date');
    tray.setTitle(notify && count > 0 ? `${count}` : '');
  }
}

function refreshScheduler(): void {
  const settings = settingsStore.getSettings();

  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }

  intervalHandle = setInterval(() => {
    void runUpdateCheck();
  }, settings.checkIntervalMinutes * 60 * 1000);
}

async function runUpdateCheck(): Promise<void> {
  try {
    const result = await homebrewService.checkNow();
    settingsStore.setLastCheck(result.count, result.checkedAt);
    emitUpdatesChanged(result.count, result.checkedAt);
  } catch (error) {
    log.warn('Update check failed', error);
  }
}

function registerHandlers(): void {
  registerIpcHandlers({
    homebrew: homebrewService,
    settingsStore,
    emitUpdatesChanged: (payload) => {
      emitUpdatesChanged(payload.count, payload.checkedAt);
    },
    onIntervalChanged: () => {
      refreshScheduler();
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
  mainWindow = createMainWindow();
  trayWindow = createTrayWindow();
  tray = createTray();

  registerHandlers();
  configureAutoUpdate();
  refreshScheduler();
  emitWindowChromeChanged();

  const settings = settingsStore.getSettings();
  if (settings.autoCheckOnLaunch) {
    await runUpdateCheck();
  } else {
    const checkedAt = settingsStore.getLastCheckedAt() ?? new Date().toISOString();
    emitUpdatesChanged(settingsStore.getLastUpdateCount(), checkedAt);
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
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
});
