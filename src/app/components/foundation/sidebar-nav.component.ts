import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardIconComponent, type ZardIcon } from '@/shared/components/icon';
import {
  SidebarComponent,
  SidebarGroupComponent
} from '@/shared/components/layout';

@Component({
  selector: 'app-sidebar-nav',
  imports: [
    RouterLink,
    RouterLinkActive,
    SidebarComponent,
    SidebarGroupComponent,
    ZardButtonComponent,
    ZardBadgeComponent,
    ZardIconComponent
  ],
  template: `
    <z-sidebar class="brew-sidebar-surface" [zCollapsible]="false">
      <z-sidebar-group>
        <div class="brew-nav-stack">
          <nav class="mt-0 flex flex-col gap-1" aria-label="Primary">
            @for (item of primaryNavItems; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="brew-nav-active"
                z-button
                zType="ghost"
                zSize="sm"
                class="brew-nav-link"
              >
                <span class="brew-nav-leading">
                  <z-icon [zType]="item.icon" zSize="sm" class="brew-nav-icon" aria-hidden="true" />
                  <span>{{ item.label }}</span>
                </span>
                @if (item.route === '/updates' && updateCount() > 0) {
                  <z-badge zType="secondary" zShape="pill">{{ updateCount() }}</z-badge>
                }
              </a>
            }
          </nav>

          <a
            [routerLink]="settingsItem.route"
            routerLinkActive="brew-nav-active"
            z-button
            zType="ghost"
            zSize="sm"
            class="brew-nav-link brew-nav-bottom"
          >
            <span class="brew-nav-leading">
              <z-icon [zType]="settingsItem.icon" zSize="sm" class="brew-nav-icon" aria-hidden="true" />
              <span>{{ settingsItem.label }}</span>
            </span>
          </a>
        </div>
      </z-sidebar-group>
    </z-sidebar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarNavComponent {
  readonly updateCount = input(0);

  protected readonly primaryNavItems: ReadonlyArray<{ label: string; route: string; icon: ZardIcon }> = [
    { label: 'Updates', route: '/updates', icon: 'arrow-up' },
    { label: 'Installed', route: '/installed', icon: 'square-library' },
    { label: 'Browse', route: '/browse', icon: 'search' },
    { label: 'Taps', route: '/taps', icon: 'layers-2' }
  ];

  protected readonly settingsItem: { label: string; route: string; icon: ZardIcon } = {
    label: 'Settings',
    route: '/settings',
    icon: 'settings'
  };
}
