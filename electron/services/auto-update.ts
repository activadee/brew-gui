import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import type { AppUpdateAvailableEvent } from '../../src/shared/contracts';
import { log } from '../utils/logger';

export function configureAutoUpdate(onUpdateAvailable?: (event: AppUpdateAvailableEvent) => void): void {
  if (!app.isPackaged || process.env.ENABLE_AUTO_UPDATES !== '1') {
    log.info('Auto-updater is disabled (set ENABLE_AUTO_UPDATES=1 in packaged builds to enable).');
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('error', (error) => {
    log.warn('Auto-updater error', error, { correlationId: 'auto-update' });
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available', { version: info.version, correlationId: 'auto-update' });
    onUpdateAvailable?.({
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null
    });
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available', { correlationId: 'auto-update' });
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded; restart to apply', { version: info.version, correlationId: 'auto-update' });
  });

  void autoUpdater.checkForUpdates();
}

export async function quitAndInstallUpdate(): Promise<void> {
  if (!app.isPackaged || process.env.ENABLE_AUTO_UPDATES !== '1') {
    return;
  }

  autoUpdater.quitAndInstall();
}
