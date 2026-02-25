import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { EmptyStateComponent } from '../../../components/foundation/empty-state/empty-state.component';
import { LoadingStateComponent } from '../../../components/foundation/loading-state/loading-state.component';
import { CleanupConfirmDialogComponent } from '../../../components/ux/cleanup-confirm-dialog/cleanup-confirm-dialog.component';
import { ToastService } from '../../../core/services/toast.service';
import { CleanupStore } from '../../../core/stores/cleanup.store';

@Component({
  selector: 'app-cleanup-view',
  imports: [
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCardComponent,
    EmptyStateComponent,
    LoadingStateComponent,
    CleanupConfirmDialogComponent
  ],
  templateUrl: './cleanup-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './cleanup-view.component.css',
})
export class CleanupViewComponent {
  protected readonly cleanupStore = inject(CleanupStore);
  private readonly toast = inject(ToastService);

  protected readonly confirmOpen = signal(false);
  protected readonly busy = computed(() => this.cleanupStore.loadingPreview() || this.cleanupStore.running());
  protected readonly reclaimableLabel = computed(() => this.bytesLabel(this.cleanupStore.totalBytes()));
  protected readonly generatedLabel = computed(() => {
    const generatedAt = this.cleanupStore.generatedAt();
    if (!generatedAt) {
      return 'not generated';
    }

    try {
      return `generated ${new Date(generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return `generated ${generatedAt}`;
    }
  });

  constructor() {
    if (!this.cleanupStore.loadingPreview() && !this.cleanupStore.hasPreview()) {
      void this.cleanupStore.refreshPreview();
    }
  }

  protected refreshPreview(): void {
    void this.cleanupStore.refreshPreview();
  }

  protected openConfirm(): void {
    if (this.busy()) {
      return;
    }

    this.confirmOpen.set(true);
  }

  protected closeConfirm(): void {
    if (this.cleanupStore.running()) {
      return;
    }

    this.confirmOpen.set(false);
  }

  protected async confirmCleanup(): Promise<void> {
    const started = await this.cleanupStore.runCleanup();
    if (!started) {
      return;
    }

    this.toast.push('Cleanup command started.', 'success');
    this.confirmOpen.set(false);
  }

  protected bytesLabel(value: number | null): string {
    if (value === null) {
      return 'unknown';
    }

    if (value === 0) {
      return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let current = value;
    let unitIndex = 0;

    while (current >= 1024 && unitIndex < units.length - 1) {
      current /= 1024;
      unitIndex += 1;
    }

    const formatted = unitIndex === 0 ? String(Math.round(current)) : current.toFixed(1);
    return `${formatted} ${units[unitIndex]}`;
  }
}
