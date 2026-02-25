import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardInputDirective } from '@/shared/components/input';
import type { BrewTap } from '../../../../shared/contracts';
import { EmptyStateComponent } from '../../../components/foundation/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../components/foundation/loading-state/loading-state.component';
import { PackageFilterChipsComponent } from '../../../components/shared/package-filter-chips/package-filter-chips.component';
import {
  PackageRowOverflowMenuComponent,
  type PackageRowOverflowAction
} from '../../../components/shared/package-row-overflow-menu/package-row-overflow-menu.component';
import { PackageSearchInputComponent } from '../../../components/shared/package-search-input/package-search-input.component';
import { ToastService } from '../../../core/services/toast.service';
import { CatalogStore } from '../../../core/stores/catalog.store';
import { InstalledStore } from '../../../core/stores/installed.store';
import { TapsStore } from '../../../core/stores/taps.store';
import { UpdatesStore } from '../../../core/stores/updates.store';

@Component({
  selector: 'app-taps-view',
  imports: [
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    ZardInputDirective,
    EmptyStateComponent,
    LoadingStateComponent,
    PackageFilterChipsComponent,
    PackageRowOverflowMenuComponent,
    PackageSearchInputComponent
  ],
  templateUrl: './taps-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './taps-view.component.css',
})
export class TapsViewComponent {
  protected readonly tapsStore = inject(TapsStore);
  protected readonly installedStore = inject(InstalledStore);
  protected readonly updatesStore = inject(UpdatesStore);
  protected readonly catalogStore = inject(CatalogStore);
  private readonly toast = inject(ToastService);

  protected readonly scopeFilterOptions = [
    { value: 'all', label: 'All taps' },
    { value: 'official', label: 'Official' },
    { value: 'thirdParty', label: 'Third-party' }
  ];

  protected readonly healthFilterOptions = [
    { value: 'all', label: 'All health' },
    { value: 'healthy', label: 'Healthy' },
    { value: 'attention', label: 'Attention' },
    { value: 'error', label: 'Error' }
  ];

  protected readonly addDialogOpen = signal(false);
  protected readonly pendingTapName = signal('');
  protected readonly removeTarget = signal<BrewTap | null>(null);
  protected readonly busy = computed(() => this.tapsStore.mutating());
  protected readonly canSubmitAdd = computed(() => /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(this.pendingTapName().trim()));
  protected readonly addCommandPreview = computed(() => {
    const name = this.pendingTapName().trim();
    return name ? `brew tap ${name}` : 'brew tap owner/repo';
  });

  constructor() {
    if (!this.tapsStore.loading() && this.tapsStore.items().length === 0) {
      void this.tapsStore.refresh();
    }
  }

  protected onScopeFilterChange(value: string): void {
    this.tapsStore.setScopeFilter(value as 'all' | 'official' | 'thirdParty');
  }

  protected onHealthFilterChange(value: string): void {
    this.tapsStore.setHealthFilter(value as 'all' | 'healthy' | 'attention' | 'error');
  }

  protected healthBadgeType(health: BrewTap['health']): 'secondary' | 'outline' | 'destructive' {
    switch (health) {
      case 'healthy':
        return 'secondary';
      case 'attention':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  }

  protected syncStateLabel(state: BrewTap['syncState']): string {
    switch (state) {
      case 'upToDate':
        return 'up to date';
      case 'noUpstream':
        return 'no upstream';
      default:
        return state;
    }
  }

  protected overflowActionsFor(tap: BrewTap): PackageRowOverflowAction[] {
    return [
      {
        id: 'remove',
        label: tap.protected ? 'Protected tap cannot be removed' : 'Remove tap',
        disabled: tap.protected || this.busy(),
        destructive: !tap.protected
      }
    ];
  }

  protected onOverflowAction(tap: BrewTap, action: string): void {
    if (action !== 'remove' || tap.protected || this.busy()) {
      return;
    }

    this.removeTarget.set(tap);
  }

  protected openAddDialog(): void {
    if (this.busy()) {
      return;
    }

    this.removeTarget.set(null);
    this.pendingTapName.set('');
    this.addDialogOpen.set(true);
  }

  protected closeAddDialog(): void {
    if (this.busy()) {
      return;
    }

    this.addDialogOpen.set(false);
  }

  protected onPendingTapNameChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.pendingTapName.set(target.value);
  }

  protected async confirmAdd(): Promise<void> {
    if (!this.canSubmitAdd()) {
      return;
    }

    const name = this.pendingTapName().trim();
    const started = await this.tapsStore.tapAdd({ name });
    if (!started) {
      return;
    }

    await Promise.all([
      this.installedStore.refresh(),
      this.updatesStore.refresh(),
      this.catalogStore.refresh(true)
    ]);

    this.toast.push(`Added tap ${name}.`, 'success');
    this.addDialogOpen.set(false);
    this.pendingTapName.set('');
  }

  protected closeRemoveDialog(): void {
    if (this.busy()) {
      return;
    }

    this.removeTarget.set(null);
  }

  protected async confirmRemove(): Promise<void> {
    const target = this.removeTarget();
    if (!target || target.protected) {
      return;
    }

    const started = await this.tapsStore.tapRemove({ name: target.name });
    if (!started) {
      return;
    }

    await Promise.all([
      this.installedStore.refresh(),
      this.updatesStore.refresh(),
      this.catalogStore.refresh(true)
    ]);

    this.toast.push(`Removed tap ${target.name}.`, 'success');
    this.removeTarget.set(null);
  }
}
