import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast-host',
  imports: [NgClass],
  template: `
    <div class="pointer-events-none fixed right-4 top-4 z-[70] flex w-[320px] max-w-[90vw] flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <article
          class="toast-card pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg"
          [ngClass]="
            toast.kind === 'info'
              ? 'border-sky-200 bg-sky-50'
              : toast.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-rose-200 bg-rose-50'
          "
        >
          <div class="flex items-center justify-between gap-3">
            <p>{{ toast.message }}</p>
            <button type="button" class="mono text-xs text-[var(--text-muted)]" (click)="toastService.dismiss(toast.id)">
              close
            </button>
          </div>
        </article>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);
}
