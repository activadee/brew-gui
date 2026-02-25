import { app } from 'electron';
import { autoUpdater } from 'electron-updater';

import { log } from '../utils/logger';

export function configureAutoUpdate(): void {
  if (!app.isPackaged || process.env.ENABLE_AUTO_UPDATES !== '1') {
    log.info('Auto-updater is disabled (set ENABLE_AUTO_UPDATES=1 in packaged builds to enable).');
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on('error', (error) => {
    log.warn('Auto-updater error', error);
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    log.info('No update available');
  });

  void autoUpdater.checkForUpdates();
}
