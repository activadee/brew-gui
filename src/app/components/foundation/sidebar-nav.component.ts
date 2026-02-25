import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="panel-reveal border-b border-[var(--stroke)] bg-[var(--bg-elevated)] px-3 py-3 md:h-full md:border-b-0 md:border-r md:py-4">
      <p class="mono px-2 text-[10px] uppercase tracking-[0.22em] text-[var(--text-muted)]">Brew Sidebar</p>
      <nav class="mt-3 flex flex-wrap gap-1 md:mt-4 md:flex-col">
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            routerLinkActive="nav-link-active bg-[var(--accent-soft)] text-[var(--accent)]"
            class="nav-link hover-lift flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[var(--text-main)] transition-colors hover:bg-[#eeebe4] md:w-full"
          >
            <span>{{ item.label }}</span>
            @if (item.route === '/updates' && updateCount() > 0) {
              <span class="pulse-badge mono rounded-full border border-[var(--accent)] bg-white px-2 py-0.5 text-[10px] text-[var(--accent)]">{{ updateCount() }}</span>
            }
          </a>
        }
      </nav>
    </aside>
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
