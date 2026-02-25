import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal
} from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ContentComponent, FooterComponent, LayoutComponent } from '@/shared/components/layout';
import {
  DEFAULT_WINDOW_CHROME_STATE,
  type WindowChromeState
} from '../../shared/contracts';
import { PanelContainerComponent } from '../components/foundation/panel-container.component';
import { SidebarNavComponent } from '../components/foundation/sidebar-nav.component';
import { TopStatusBarComponent } from '../components/foundation/top-status-bar.component';
import { KeyboardShortcutsHintComponent } from '../components/polish/keyboard-shortcuts-hint.component';
import { CommandPaletteComponent, type CommandPaletteAction } from '../components/ux/command-palette.component';
import { PackageDetailsDrawerComponent } from '../components/ux/package-details-drawer.component';
import { CommandProgressDrawerComponent } from '../components/ux/command-progress-drawer.component';
import { ToastHostComponent } from '../components/ux/toast-host.component';
import { BrewFacadeService } from '../core/services/brew-facade.service';
import { ToastService } from '../core/services/toast.service';
import { AppStatusStore } from '../core/stores/app-status.store';
import { CatalogStore } from '../core/stores/catalog.store';
import { InstalledStore } from '../core/stores/installed.store';
import { JobsStore } from '../core/stores/jobs.store';
import { SettingsStore } from '../core/stores/settings.store';
import { UpdatesStore } from '../core/stores/updates.store';
import { BrewMissingViewComponent } from '../features/missing-brew/brew-missing-view.component';

const ROUTE_LABELS: Record<string, string> = {
  '/updates': 'Updates',
  '/installed': 'Installed',
  '/browse': 'Browse',
  '/settings': 'Settings',
  '/tray': 'Tray'
};

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    LayoutComponent,
    ContentComponent,
    FooterComponent,
    ZardButtonComponent,
    ZardBadgeComponent,
    SidebarNavComponent,
    TopStatusBarComponent,
    PanelContainerComponent,
    BrewMissingViewComponent,
    KeyboardShortcutsHintComponent,
    CommandPaletteComponent,
    PackageDetailsDrawerComponent,
    CommandProgressDrawerComponent,
    ToastHostComponent
  ],
  template: `
    <div class="brew-shell ui-shell-enter">
      <header
        class="brew-titlebar window-titlebar drag-region"
        [class.brew-titlebar-unfocused]="!windowChromeState().isFocused"
      >
        <div class="brew-titlebar-left">
          <span class="brew-native-inset brew-native-inset-empty"></span>
        </div>

        <div class="brew-titlebar-center">
          <span class="brew-titlebar-app">Brew Sidebar</span>
          <z-badge zType="secondary" zShape="pill" class="brew-titlebar-route">{{ activeRouteLabel() }}</z-badge>
        </div>

        <div class="brew-titlebar-right no-drag">
          <button
            type="button"
            z-button
            zType="ghost"
            zSize="sm"
            class="no-drag"
            data-testid="titlebar-palette"
            (click)="paletteOpen.set(true)"
          >
            Palette
          </button>
          <button type="button" z-button zType="ghost" zSize="sm" class="no-drag" (click)="syncMetadata()">
            Sync
          </button>
          <button type="button" z-button zSize="sm" class="no-drag" (click)="checkNow()">Check</button>
        </div>
      </header>

      <z-layout zDirection="horizontal" class="brew-layout">
        <app-sidebar-nav [updateCount]="updatesStore.updateCount()" />

        <z-content class="brew-content-area">
          <app-top-status-bar
            [updateCount]="updatesStore.updateCount()"
            [lastCheckedAt]="updatesStore.lastCheckedAt()"
            [brewAvailable]="appStatusStore.availability()?.available ?? false"
            [brewVersion]="appStatusStore.availability()?.version ?? null"
          />

          <div class="brew-main-pane">
            @if (appStatusStore.availability() && !(appStatusStore.availability()?.available ?? false)) {
              <div class="h-full overflow-y-auto">
                <app-brew-missing-view />
              </div>
            } @else {
              <app-panel-container class="block h-full">
                <router-outlet />
              </app-panel-container>
            }
          </div>

          <z-footer class="brew-footer" [zHeight]="42">
            <app-keyboard-shortcuts-hint />
          </z-footer>
        </z-content>
      </z-layout>
    </div>

    <app-command-palette
      [open]="paletteOpen()"
      [actions]="paletteActions"
      (selected)="runPaletteAction($event)"
      (closed)="paletteOpen.set(false)"
    />

    <app-package-details-drawer />
    <app-command-progress-drawer />
    <app-toast-host />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  protected readonly appStatusStore = inject(AppStatusStore);
  protected readonly catalogStore = inject(CatalogStore);
  protected readonly installedStore = inject(InstalledStore);
  protected readonly jobsStore = inject(JobsStore);
  protected readonly settingsStore = inject(SettingsStore);
  protected readonly updatesStore = inject(UpdatesStore);

  private readonly destroyRef = inject(DestroyRef);
  private readonly facade = inject(BrewFacadeService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly paletteOpen = signal(false);
  protected readonly routePath = signal('/updates');
  protected readonly windowChromeState = signal<WindowChromeState>(DEFAULT_WINDOW_CHROME_STATE);

  protected readonly activeRouteLabel = computed(
    () => ROUTE_LABELS[this.routePath()] ?? 'Brew Sidebar'
  );

  protected readonly paletteActions: CommandPaletteAction[] = [
    { id: 'check', label: 'Check for updates now', hint: '⌘R' },
    { id: 'sync', label: 'Sync Homebrew metadata', hint: 'brew update' },
    { id: 'updates', label: 'Go to Updates', hint: '/updates' },
    { id: 'installed', label: 'Go to Installed', hint: '/installed' },
    { id: 'browse', label: 'Go to Browse', hint: '/browse' },
    { id: 'settings', label: 'Go to Settings', hint: '/settings' }
  ];

  constructor() {
    this.routePath.set(this.normalizeRoute(this.router.url));
    void this.initialize();
    this.bindSystemTheme();
    void this.refreshWindowChromeState();
    this.registerRouterTracking();
    this.registerEventBridges();
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (this.isEditingTarget(event.target)) {
      if (event.key === 'Escape' && this.paletteOpen()) {
        this.paletteOpen.set(false);
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.paletteOpen.set(!this.paletteOpen());
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'r') {
      event.preventDefault();
      void this.checkNow();
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
      event.preventDefault();
      void this.router.navigate(['/browse']);
      return;
    }

    if (event.key === 'Escape') {
      this.paletteOpen.set(false);
    }
  }

  protected async checkNow(): Promise<void> {
    await this.updatesStore.checkNow();
    this.toast.push('Update check complete.', 'success');
  }

  protected async syncMetadata(): Promise<void> {
    try {
      await this.facade.syncMetadata();
      await this.updatesStore.checkNow();
      this.toast.push('Homebrew metadata synced.', 'success');
    } catch (error) {
      this.toast.push((error as Error).message, 'error');
    }
  }

  protected runPaletteAction(actionId: string): void {
    this.paletteOpen.set(false);

    switch (actionId) {
      case 'check':
        void this.checkNow();
        break;
      case 'sync':
        void this.syncMetadata();
        break;
      case 'updates':
        void this.router.navigate(['/updates']);
        break;
      case 'installed':
        void this.router.navigate(['/installed']);
        break;
      case 'browse':
        void this.router.navigate(['/browse']);
        break;
      case 'settings':
        void this.router.navigate(['/settings']);
        break;
      default:
        break;
    }
  }

  private async initialize(): Promise<void> {
    try {
      await this.settingsStore.load();
      await this.appStatusStore.initialize();

      if (!(this.appStatusStore.availability()?.available ?? false)) {
        return;
      }

      await Promise.all([
        this.installedStore.refresh(),
        this.updatesStore.refresh(),
        this.catalogStore.refresh()
      ]);
    } catch (error) {
      this.toast.push((error as Error).message, 'error');
    }
  }

  private bindSystemTheme(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = (matches: boolean): void => {
      document.documentElement.classList.toggle('dark', matches);
    };

    apply(media.matches);

    const handler = (event: MediaQueryListEvent): void => {
      apply(event.matches);
    };

    media.addEventListener('change', handler);
    this.destroyRef.onDestroy(() => media.removeEventListener('change', handler));
  }

  private registerRouterTracking(): void {
    const subscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.routePath.set(this.normalizeRoute(event.urlAfterRedirects));
      });

    this.destroyRef.onDestroy(() => subscription.unsubscribe());
  }

  private async refreshWindowChromeState(): Promise<void> {
    try {
      this.windowChromeState.set(await this.facade.getWindowChromeState());
    } catch {
      this.windowChromeState.set(DEFAULT_WINDOW_CHROME_STATE);
    }
  }

  private registerEventBridges(): void {
    const unsubscribers = [
      this.facade.onUpdatesChanged((event) => {
        this.appStatusStore.applyUpdatesChanged(event);
        this.updatesStore.setExternalUpdate(event);
        void this.updatesStore.refresh();
      }),
      this.facade.onWindowChromeChanged((event) => {
        this.windowChromeState.set(event);
      }),
      this.facade.onJobProgress((event) => {
        this.jobsStore.pushProgress(event);
      }),
      this.facade.onJobComplete((event) => {
        this.jobsStore.markComplete(event);
      }),
      this.facade.onJobFailed((event) => {
        this.jobsStore.markFailed(event);
        if (event.action !== 'syncMetadata') {
          this.toast.push(`Homebrew command failed: ${event.error}`, 'error', 6_000);
        }
      })
    ];

    this.destroyRef.onDestroy(() => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    });
  }

  private normalizeRoute(url: string): string {
    const path = url.startsWith('/') ? url : `/${url}`;
    const [withoutQuery] = path.split('?');
    return withoutQuery || '/updates';
  }

  private isEditingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
  }
}
