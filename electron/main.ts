import path from 'node:path';

import {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage,
  type BrowserWindowConstructorOptions
} from 'electron';

import { registerIpcHandlers } from './ipc';
import { configureAutoUpdate } from './services/auto-update';
import { HomebrewService } from './services/homebrew-service';
import { SettingsStore } from './services/settings-store';
import { log } from './utils/logger';

const isDev = !app.isPackaged || Boolean(process.env.ELECTRON_START_URL);

let mainWindow: BrowserWindow | null = null;
let trayWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let intervalHandle: NodeJS.Timeout | null = null;
let isQuitting = false;

const settingsStore = new SettingsStore();
const homebrewService = new HomebrewService();

const preloadPath = path.join(__dirname, 'preload.js');

function createMainWindow(): BrowserWindow {
  const settings = settingsStore.getSettings();

  const window = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 880,
    minHeight: 620,
    title: 'Brew Sidebar',
    backgroundColor: '#f4f2ed',
    autoHideMenuBar: true,
    skipTaskbar: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  loadRenderer(window, `/${settings.defaultView}`);

  window.on('close', (event) => {
    if (process.platform === 'darwin' && !isQuitting) {
      event.preventDefault();
      hideMainWindowToTray();
    }
  });

  window.on('closed', () => {
    mainWindow = null;
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
    backgroundColor: '#f4f2ed',
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
  if (process.platform === 'darwin') {
    app.dock.show();
  }
  mainWindow.setSkipTaskbar(false);
  mainWindow.show();
  mainWindow.focus();
}

function hideMainWindowToTray(): void {
  if (!mainWindow) {
    return;
  }
  mainWindow.hide();
  mainWindow.setSkipTaskbar(true);
  if (process.platform === 'darwin') {
    app.dock.hide();
  }
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
  if (process.platform === 'darwin') {
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
    }
  });
}

async function bootstrap(): Promise<void> {
  mainWindow = createMainWindow();
  trayWindow = createTrayWindow();
  tray = createTray();

  registerHandlers();
  configureAutoUpdate();
  refreshScheduler();

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
  if (process.platform !== 'darwin') {
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
