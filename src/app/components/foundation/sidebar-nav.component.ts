import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
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
    ZardBadgeComponent
  ],
  template: `
    <z-sidebar class="brew-sidebar-surface" [zCollapsible]="false">
      <z-sidebar-group>
        <nav class="mt-0 flex flex-col gap-1">
          @for (item of navItems; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="brew-nav-active"
              z-button
              zType="ghost"
              zSize="sm"
              class="brew-nav-link"
            >
              <span>{{ item.label }}</span>
              @if (item.route === '/updates' && updateCount() > 0) {
                <z-badge zType="secondary" zShape="pill">{{ updateCount() }}</z-badge>
              }
            </a>
          }
        </nav>
      </z-sidebar-group>
    </z-sidebar>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarNavComponent {
  readonly updateCount = input(0);

  protected readonly navItems = [
    { label: 'Updates', route: '/updates' },
    { label: 'Installed', route: '/installed' },
    { label: 'Browse', route: '/browse' },
    { label: 'Settings', route: '/settings' }
  ];
}
