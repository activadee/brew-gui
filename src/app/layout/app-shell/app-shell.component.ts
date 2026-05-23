import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  inject,
  signal
} from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ContentComponent, FooterComponent, LayoutComponent } from '@/shared/components/layout';
import {
  DEFAULT_WINDOW_CHROME_STATE,
  type PackageKind,
  type RecoveredJob,
  type WindowChromeState
} from '../../../shared/contracts';
import { PanelContainerComponent } from '../../components/foundation/panel-container/panel-container.component';
import { SidebarNavComponent } from '../../components/foundation/sidebar-nav/sidebar-nav.component';
import { TopStatusBarComponent } from '../../components/foundation/top-status-bar/top-status-bar.component';
import { KeyboardShortcutsHintComponent } from '../../components/polish/keyboard-shortcuts-hint/keyboard-shortcuts-hint.component';
import {
  CommandPaletteComponent,
  type CommandPaletteAction,
  type CommandPaletteMode,
  type PackagePickerItem
} from '../../components/ux/command-palette/command-palette.component';
import { PackageDetailsDrawerComponent } from '../../components/ux/package-details-drawer/package-details-drawer.component';
import { CommandProgressDrawerComponent } from '../../components/ux/command-progress-drawer/command-progress-drawer.component';
import { ToastHostComponent } from '../../components/ux/toast-host/toast-host.component';
import { BrewFacadeService } from '../../core/services/brew-facade.service';
import { PackageActionsService } from '../../core/services/package-actions.service';
import { ToastService } from '../../core/services/toast.service';
import { AppStatusStore } from '../../core/stores/app-status.store';
import { CatalogStore } from '../../core/stores/catalog.store';
import { InstalledStore } from '../../core/stores/installed.store';
import { JobsStore } from '../../core/stores/jobs.store';
import { PackageSelectionStore } from '../../core/stores/package-selection.store';
import { PackageDetailsStore } from '../../core/stores/package-details.store';
import { SettingsStore } from '../../core/stores/settings.store';
import { TemplatesStore } from '../../core/stores/templates.store';
import { UpdatesStore } from '../../core/stores/updates.store';
import { BrewMissingViewComponent } from '../../features/missing-brew/brew-missing-view/brew-missing-view.component';

const ROUTE_LABELS: Record<string, string> = {
  '/updates': 'Updates',
  '/installed': 'Installed',
  '/browse': 'Browse',
  '/cleanup': 'Cleanup',
  '/services': 'Services',
  '/doctor': 'Doctor',
  '/history': 'History',
  '/taps': 'Taps',
  '/settings': 'Settings',
  '/tray': 'Tray'
};

type PalettePickerContext = 'browse' | 'installed' | 'updates';
type PendingPackageAction =
  | 'install-package'
  | 'uninstall-package'
  | 'pin-package'
  | 'view-package-details'
  | 'run-template';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
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
  templateUrl: './app-shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './app-shell.component.css',
})
export class AppShellComponent {
  protected readonly appStatusStore = inject(AppStatusStore);
  protected readonly catalogStore = inject(CatalogStore);
  protected readonly installedStore = inject(InstalledStore);
  protected readonly jobsStore = inject(JobsStore);
  protected readonly settingsStore = inject(SettingsStore);
  protected readonly updatesStore = inject(UpdatesStore);
  protected readonly templatesStore = inject(TemplatesStore);
  protected readonly selectionStore = inject(PackageSelectionStore);
  protected readonly packageDetailsStore = inject(PackageDetailsStore);

  private readonly destroyRef = inject(DestroyRef);
  private readonly facade = inject(BrewFacadeService);
  private readonly packageActions = inject(PackageActionsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly paletteOpen = signal(false);
  protected readonly paletteMode = signal<CommandPaletteMode>('root');
  protected readonly pendingPackageAction = signal<PendingPackageAction | null>(null);
  private readonly pendingTemplateId = signal<string | null>(null);
  protected readonly pickerContext = signal<PalettePickerContext>('installed');
  protected readonly routePath = signal('/updates');
  protected readonly windowChromeState = signal<WindowChromeState>(DEFAULT_WINDOW_CHROME_STATE);
  protected readonly recoveredJobs = signal<RecoveredJob[]>([]);
  protected readonly recoveryBannerDismissed = signal(false);

  protected readonly activeRouteLabel = computed(
    () => ROUTE_LABELS[this.routePath()] ?? 'Brewdeck'
  );

  protected readonly showRecoveryBanner = computed(
    () => !this.recoveryBannerDismissed() && this.recoveredJobs().length > 0
  );

  protected readonly palettePlaceholder = computed(() => {
    if (this.paletteMode() === 'pickPackage') {
      return 'Search packages…';
    }
    if (this.paletteMode() === 'pickTemplate') {
      return 'Search templates…';
    }
    return 'Type a command…';
  });

  protected readonly palettePackageItems = computed<PackagePickerItem[]>(() => {
    const context = this.pickerContext();
    if (context === 'browse') {
      return this.catalogStore.items().map((item) => ({
        id: item.id,
        label: item.name,
        hint: item.kind
      }));
    }
    if (context === 'updates') {
      return this.updatesStore.items().map((item) => ({
        id: item.id,
        label: item.name,
        hint: item.kind
      }));
    }
    return this.installedStore.items().map((item) => ({
      id: item.id,
      label: item.name,
      hint: item.kind
    }));
  });

  protected readonly paletteTemplateItems = computed<PackagePickerItem[]>(() =>
    this.templatesStore.templates().map((template) => ({
      id: template.id,
      label: template.name,
      hint: `${template.steps.length} steps`
    }))
  );

  protected readonly paletteActions = computed<CommandPaletteAction[]>(() => {
    const actions: CommandPaletteAction[] = [
      { id: 'check', label: 'Check for updates now', hint: '⌘R', group: 'Commands' },
      { id: 'sync', label: 'Sync Homebrew metadata', hint: 'brew update', group: 'Commands' },
      { id: 'install-package', label: 'Install package…', hint: 'Browse catalog', group: 'Package actions' },
      { id: 'uninstall-package', label: 'Uninstall package…', hint: 'Pick package', group: 'Package actions' },
      { id: 'pin-package', label: 'Pin package…', hint: 'Formulae only', group: 'Package actions' },
      { id: 'view-package-details', label: 'View package details…', hint: 'Pick package', group: 'Package actions' },
      { id: 'run-template', label: 'Run template…', hint: 'Pick template', group: 'Package actions' },
      { id: 'history', label: 'Go to History', hint: '/history', group: 'Navigation' },
      { id: 'updates', label: 'Go to Updates', hint: '/updates', group: 'Navigation' },
      { id: 'installed', label: 'Go to Installed', hint: '/installed', group: 'Navigation' },
      { id: 'browse', label: 'Go to Browse', hint: '/browse', group: 'Navigation' },
      { id: 'taps', label: 'Go to Taps', hint: '/taps', group: 'Navigation' },
      { id: 'cleanup', label: 'Go to Cleanup', hint: '/cleanup', group: 'Navigation' },
      { id: 'services', label: 'Go to Services', hint: '/services', group: 'Navigation' },
      { id: 'doctor', label: 'Go to Doctor', hint: '/doctor', group: 'Navigation' },
      { id: 'settings', label: 'Go to Settings', hint: '/settings', group: 'Navigation' }
    ];

    if (this.selectionStore.count() > 0) {
      actions.unshift(
        { id: 'batch-upgrade', label: 'Upgrade selected', hint: `${this.selectionStore.count()} selected`, group: 'Selection' },
        { id: 'batch-uninstall', label: 'Uninstall selected', hint: `${this.selectionStore.count()} selected`, group: 'Selection' },
        { id: 'batch-pin', label: 'Pin selected', hint: `${this.selectionStore.count()} selected`, group: 'Selection' }
      );
    }

    return actions;
  });

  constructor() {
    this.routePath.set(this.normalizeRoute(this.router.url));
    void this.initialize();
    void this.refreshWindowChromeState();
    this.registerRouterTracking();
    this.registerEventBridges();
  }

  @HostListener('window:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (this.isEditingTarget(event.target)) {
      if (event.key === 'Escape' && this.paletteOpen()) {
        this.closePalette();
      }
      return;
    }

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      if (this.paletteOpen()) {
        this.closePalette();
      } else {
        this.openPaletteRoot();
      }
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
      this.closePalette();
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

  protected openPaletteRoot(): void {
    this.paletteMode.set('root');
    this.pendingPackageAction.set(null);
    this.paletteOpen.set(true);
  }

  protected closePalette(): void {
    this.paletteOpen.set(false);
    this.paletteMode.set('root');
    this.pendingPackageAction.set(null);
    this.pendingTemplateId.set(null);
  }

  protected onPaletteBack(): void {
    if (this.paletteMode() === 'pickPackage' && this.pendingTemplateId()) {
      this.paletteMode.set('pickTemplate');
      this.pendingPackageAction.set(null);
      return;
    }
    this.paletteMode.set('root');
    this.pendingPackageAction.set(null);
    this.pendingTemplateId.set(null);
  }

  protected dismissRecoveryBanner(): void {
    this.recoveryBannerDismissed.set(true);
  }

  protected openActivityDrawer(): void {
    this.jobsStore.openDrawer();
  }

  protected runPaletteAction(actionId: string): void {
    if (actionId === 'install-package') {
      this.pickerContext.set('browse');
      this.pendingPackageAction.set('install-package');
      this.paletteMode.set('pickPackage');
      return;
    }

    if (actionId === 'uninstall-package' || actionId === 'pin-package' || actionId === 'view-package-details') {
      this.pickerContext.set(this.routePickerContext());
      this.pendingPackageAction.set(actionId);
      this.paletteMode.set('pickPackage');
      return;
    }

    if (actionId === 'run-template') {
      this.pendingTemplateId.set(null);
      this.paletteMode.set('pickTemplate');
      return;
    }

    this.closePalette();

    switch (actionId) {
      case 'check':
        void this.checkNow();
        break;
      case 'sync':
        void this.syncMetadata();
        break;
      case 'batch-upgrade':
        void this.runBatchFromPalette('upgrade');
        break;
      case 'batch-uninstall':
        void this.runBatchFromPalette('uninstall');
        break;
      case 'batch-pin':
        void this.runBatchFromPalette('pin');
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
      case 'history':
        void this.router.navigate(['/history']);
        break;
      case 'taps':
        void this.router.navigate(['/taps']);
        break;
      case 'cleanup':
        void this.router.navigate(['/cleanup']);
        break;
      case 'services':
        void this.router.navigate(['/services']);
        break;
      case 'doctor':
        void this.router.navigate(['/doctor']);
        break;
      case 'settings':
        void this.router.navigate(['/settings']);
        break;
      default:
        break;
    }
  }

  protected async onPalettePackageSelected(packageId: string): Promise<void> {
    const action = this.pendingPackageAction();
    const target = this.resolvePackageTarget(packageId);
    if (!target || !action) {
      return;
    }

    this.closePalette();

    if (action === 'view-package-details') {
      await this.packageDetailsStore.openFor({ kind: target.kind, name: target.name });
      return;
    }

    if (action === 'pin-package') {
      if (target.kind !== 'formula') {
        this.toast.push('Pin is only supported for formulae.', 'error');
        return;
      }
      const started = await this.facade.pinOne({ kind: 'formula', name: target.name });
      if (started.success) {
        await this.installedStore.refresh();
        this.packageActions.notifyPinSuccess({ kind: 'formula', name: target.name });
      }
      return;
    }

    if (action === 'uninstall-package') {
      const started = await this.packageActions.uninstallOne({ kind: target.kind, name: target.name });
      if (started) {
        await Promise.all([
          this.installedStore.refresh(),
          this.updatesStore.refresh(),
          this.catalogStore.refresh()
        ]);
      }
      return;
    }

    if (action === 'install-package') {
      const started = await this.packageActions.installOne({ kind: target.kind, name: target.name });
      if (started) {
        await Promise.all([
          this.installedStore.refresh(),
          this.updatesStore.refresh(),
          this.catalogStore.refresh()
        ]);
      }
      return;
    }

    if (action === 'run-template') {
      const templateId = this.pendingTemplateId();
      const template = this.templatesStore.templates().find((item) => item.id === templateId);
      if (!template) {
        return;
      }
      await this.packageActions.runTemplate(
        { templateId: template.id, kind: target.kind, name: target.name },
        template.name
      );
      await Promise.all([this.installedStore.refresh(), this.updatesStore.refresh()]);
    }
  }

  protected onPaletteTemplateSelected(templateId: string): void {
    const template = this.templatesStore.templates().find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    this.pendingTemplateId.set(template.id);
    this.pendingPackageAction.set('run-template');
    this.pickerContext.set(this.routePickerContext());
    this.paletteMode.set('pickPackage');
  }

  protected onPaletteSelected(value: string): void {
    if (this.paletteMode() === 'pickPackage') {
      void this.onPalettePackageSelected(value);
      return;
    }

    if (this.paletteMode() === 'pickTemplate') {
      void this.onPaletteTemplateSelected(value);
      return;
    }

    this.runPaletteAction(value);
  }

  private async runBatchFromPalette(action: 'upgrade' | 'uninstall' | 'pin'): Promise<void> {
    const route = this.routePath();
    const ids = new Set(this.selectionStore.selectedIds());
    let items: { kind: PackageKind; name: string }[] = [];

    if (route === '/updates') {
      items = this.updatesStore
        .items()
        .filter((item) => ids.has(item.id))
        .map((item) => ({ kind: item.kind, name: item.name }));
    } else {
      items = this.installedStore
        .items()
        .filter((item) => ids.has(item.id))
        .map((item) => ({ kind: item.kind, name: item.name }));
    }

    if (items.length === 0) {
      return;
    }

    if (action === 'upgrade') {
      await this.packageActions.upgradeMany({ items });
    } else if (action === 'uninstall') {
      await this.packageActions.uninstallMany({ items });
    } else {
      await this.packageActions.pinMany({ items: items.filter((item) => item.kind === 'formula') });
    }

    this.selectionStore.clear();
    await Promise.all([this.updatesStore.refresh(), this.installedStore.refresh()]);
  }

  private resolvePackageTarget(packageId: string): { kind: PackageKind; name: string } | null {
    const context = this.pickerContext();
    if (context === 'browse') {
      const item = this.catalogStore.items().find((entry) => entry.id === packageId);
      return item ? { kind: item.kind, name: item.name } : null;
    }
    if (context === 'updates') {
      const item = this.updatesStore.items().find((entry) => entry.id === packageId);
      return item ? { kind: item.kind, name: item.name } : null;
    }
    const item = this.installedStore.items().find((entry) => entry.id === packageId);
    return item ? { kind: item.kind, name: item.name } : null;
  }

  private routePickerContext(): PalettePickerContext {
    const route = this.routePath();
    if (route === '/browse') {
      return 'browse';
    }
    if (route === '/updates') {
      return 'updates';
    }
    return 'installed';
  }

  private async initialize(): Promise<void> {
    try {
      await this.settingsStore.load();
      await this.appStatusStore.initialize();
      void this.templatesStore.load();

      // Informational only: recovery does not re-run brew commands.
      const recovered = await this.facade.recoverJobs();
      this.recoveredJobs.set(recovered);

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
      }),
      this.facade.onUpdateAvailable((event) => {
        this.toast.pushWithAction(
          `Brewdeck ${event.version} is ready to install.`,
          'info',
          {
            label: 'Restart to update',
            run: () => this.facade.quitAndInstallUpdate()
          },
          30_000
        );
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
