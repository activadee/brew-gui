import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import {
  SidebarComponent,
  SidebarGroupComponent
} from '@/shared/components/layout';
import { AppUpdateStore } from '../../../core/stores/app-update.store';

@Component({
  selector: 'app-sidebar-nav',
  imports: [
    RouterLink,
    RouterLinkActive,
    SidebarComponent,
    SidebarGroupComponent,
    ZardButtonComponent,
    ZardBadgeComponent
  ],
  templateUrl: './sidebar-nav.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './sidebar-nav.component.css',
})
export class SidebarNavComponent {
  readonly updateCount = input(0);

  protected readonly appUpdateStore = inject(AppUpdateStore);

  protected readonly versionLabel = computed(() => {
    const version = this.appUpdateStore.currentVersion();
    return version ? `v${version}` : '';
  });

  protected readonly navItems = [
    { label: 'Updates', route: '/updates' },
    { label: 'Installed', route: '/installed' },
    { label: 'Browse', route: '/browse' },
    { label: 'Taps', route: '/taps' },
    { label: 'Cleanup', route: '/cleanup' },
    { label: 'Services', route: '/services' },
    { label: 'Doctor', route: '/doctor' },
    { label: 'History', route: '/history' },
    { label: 'Settings', route: '/settings' }
  ];
}
