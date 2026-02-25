import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-upgrade-confirm-dialog',
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]" (click)="cancel.emit()"></div>
      <section class="palette-surface ui-shell-enter fixed left-1/2 top-1/2 z-50 w-[420px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 p-4">
        <h3 class="text-base font-semibold">{{ title() }}</h3>
        <p class="mt-2 text-sm text-[var(--text-muted)]">{{ message() }}</p>

        <div class="mt-4 flex justify-end gap-2">
          <button type="button" class="btn-ui btn-ui-ghost" [disabled]="busy()" (click)="cancel.emit()">
            Cancel
          </button>
          <button type="button" class="btn-ui btn-ui-primary" [disabled]="busy()" (click)="confirm.emit()">
            {{ busy() ? 'Running…' : confirmLabel() }}
          </button>
        </div>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpgradeConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirm upgrade');
  readonly message = input('Run this operation?');
  readonly confirmLabel = input('Run');
  readonly busy = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
