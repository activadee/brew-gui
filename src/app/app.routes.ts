import { Routes } from '@angular/router';

import { BrowseCatalogViewComponent } from './features/browse/browse-catalog-view/browse-catalog-view.component';
import { InstalledPackagesViewComponent } from './features/installed/installed-packages-view/installed-packages-view.component';
import { SettingsViewComponent } from './features/settings/settings-view/settings-view.component';
import { ServicesViewComponent } from './features/services/services-view/services-view.component';
import { TapsViewComponent } from './features/taps/taps-view/taps-view.component';
import { TrayPopoverComponent } from './features/tray/tray-popover/tray-popover.component';
import { UpdatesViewComponent } from './features/updates/updates-view/updates-view.component';
import { AppShellComponent } from './layout/app-shell/app-shell.component';
import { CleanupViewComponent } from './features/cleanup/cleanup-view/cleanup-view.component';
import { DoctorViewComponent } from './features/doctor/doctor-view/doctor-view.component';
import { HistoryViewComponent } from './features/history/history-view/history-view.component';

export const routes: Routes = [
  {
    path: 'tray',
    component: TrayPopoverComponent
  },
  {
    path: '',
    component: AppShellComponent,
    children: [
      { path: 'updates', component: UpdatesViewComponent },
      { path: 'installed', component: InstalledPackagesViewComponent },
      { path: 'browse', component: BrowseCatalogViewComponent },
      { path: 'taps', component: TapsViewComponent },
      { path: 'cleanup', component: CleanupViewComponent },
      { path: 'doctor', component: DoctorViewComponent },
      { path: 'history', component: HistoryViewComponent },
      { path: 'services', component: ServicesViewComponent },
      { path: 'settings', component: SettingsViewComponent },
      { path: '', pathMatch: 'full', redirectTo: 'updates' }
    ]
  },
  { path: '**', redirectTo: '' }
];
