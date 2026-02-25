import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal
} from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { BrewMissingViewComponent } from '../features/missing-brew/brew-missing-view.component';
import { CommandProgressDrawerComponent } from '../components/ux/command-progress-drawer.component';
import {
  CommandPaletteComponent,
  type CommandPaletteAction
} from '../components/ux/command-palette.component';
import { ToastHostComponent } from '../components/ux/toast-host.component';
import { KeyboardShortcutsHintComponent } from '../components/polish/keyboard-shortcuts-hint.component';
import { PanelContainerComponent } from '../components/foundation/panel-container.component';
import { SidebarNavComponent } from '../components/foundation/sidebar-nav.component';
import { TopStatusBarComponent } from '../components/foundation/top-status-bar.component';
import { BrewFacadeService } from '../core/services/brew-facade.service';
import { ToastService } from '../core/services/toast.service';
import { AppStatusStore } from '../core/stores/app-status.store';
import { CatalogStore } from '../core/stores/catalog.store';
import { InstalledStore } from '../core/stores/installed.store';
import { JobsStore } from '../core/stores/jobs.store';
import { SettingsStore } from '../core/stores/settings.store';
import { UpdatesStore } from '../core/stores/updates.store';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    BrewMissingViewComponent,
    CommandPaletteComponent,
    CommandProgressDrawerComponent,
    KeyboardShortcutsHintComponent,
    PanelContainerComponent,
    SidebarNavComponent,
    TopStatusBarComponent,
    ToastHostComponent
  ],
  template: `
    <div class="ui-shell-enter grid h-full grid-rows-[auto_1fr] md:grid-cols-[220px_1fr] md:grid-rows-none">
      <app-sidebar-nav [updateCount]="updatesStore.updateCount()" />

      <div class="flex min-h-0 flex-col">
        <app-top-status-bar
          [updateCount]="updatesStore.updateCount()"
          [lastCheckedAt]="updatesStore.lastCheckedAt()"
          [brewAvailable]="appStatusStore.availability()?.available ?? false"
          [brewVersion]="appStatusStore.availability()?.version ?? null"
          (checkRequested)="checkNow()"
          (syncRequested)="syncMetadata()"
          (paletteRequested)="paletteOpen.set(true)"
        />

        <div class="min-h-0 flex-1 p-3">
          @if (appStatusStore.availability() && !(appStatusStore.availability()?.available ?? false)) {
            <div class="h-full overflow-y-auto">
              <app-brew-missing-view />
            </div>
          } @else {
            <app-panel-container>
              <router-outlet />
            </app-panel-container>
          }
        </div>

        <footer class="border-t border-[var(--stroke)] px-4 py-2">
          <app-keyboard-shortcuts-hint />
        </footer>
      </div>
    </div>

    <app-command-palette
      [open]="paletteOpen()"
      [actions]="paletteActions"
      (selected)="runPaletteAction($event)"
      (closed)="paletteOpen.set(false)"
    />

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
  protected readonly paletteActions: CommandPaletteAction[] = [
    { id: 'check', label: 'Check for updates now', hint: '⌘R' },
    { id: 'sync', label: 'Sync Homebrew metadata', hint: 'brew update' },
    { id: 'updates', label: 'Go to Updates', hint: '/updates' },
    { id: 'installed', label: 'Go to Installed', hint: '/installed' },
    { id: 'browse', label: 'Go to Browse', hint: '/browse' },
    { id: 'settings', label: 'Go to Settings', hint: '/settings' }
  ];

  constructor() {
    void this.initialize();
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

  private registerEventBridges(): void {
    const unsubscribers = [
      this.facade.onUpdatesChanged((event) => {
        this.appStatusStore.applyUpdatesChanged(event);
        this.updatesStore.setExternalUpdate(event);
        void this.updatesStore.refresh();
      }),
      this.facade.onJobProgress((event) => {
        this.jobsStore.pushProgress(event);
      }),
      this.facade.onJobComplete((event) => {
        this.jobsStore.markComplete(event);
        this.toast.push('Upgrade command completed.', 'success');
      }),
      this.facade.onJobFailed((event) => {
        this.jobsStore.markFailed(event);
        this.toast.push(`Upgrade failed: ${event.error}`, 'error', 6_000);
      })
    ];

    this.destroyRef.onDestroy(() => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    });
  }

  private isEditingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const tag = target.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || target.isContentEditable;
  }
}
