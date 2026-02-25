import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-host',
  imports: [ZardCardComponent, ZardBadgeComponent, ZardButtonComponent],
  template: `
    <div class="pointer-events-none fixed right-4 top-4 z-[70] flex w-[360px] max-w-[90vw] flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <z-card class="pointer-events-auto border-border/70 bg-card/95 shadow-xl">
          <div class="flex items-start justify-between gap-3">
            <div class="space-y-1">
              <z-badge zShape="pill" [zType]="toast.kind === 'error' ? 'destructive' : toast.kind === 'success' ? 'secondary' : 'outline'">
                {{ toast.kind }}
              </z-badge>
              <p class="text-sm">{{ toast.message }}</p>
            </div>

            <button type="button" z-button zType="ghost" zSize="sm" class="shrink-0" (click)="toastService.dismiss(toast.id)">
              Close
            </button>
          </div>
        </z-card>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);
}
