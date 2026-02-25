import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';

@Component({
  selector: 'app-upgrade-confirm-dialog',
  imports: [ZardCardComponent, ZardButtonComponent, ZardDividerComponent],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" (click)="cancel.emit()"></div>
      <section class="fixed left-1/2 top-1/2 z-50 w-[460px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2">
        <z-card class="border-border/70 bg-popover/95 shadow-2xl">
          <div class="space-y-3">
            <div>
              <h3 class="text-base font-semibold">{{ title() }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">{{ message() }}</p>
            </div>

            @if (commandPreview()) {
              <pre class="overflow-x-auto rounded-md border border-border bg-muted/40 p-2 text-[11px] mono">{{ commandPreview() }}</pre>
            }

            <z-divider zSpacing="sm" />

            <div class="flex justify-end gap-2">
              <button type="button" z-button zType="outline" zSize="sm" [zDisabled]="busy()" (click)="cancel.emit()">
                Cancel
              </button>
              <button type="button" z-button zSize="sm" [zDisabled]="busy()" (click)="confirm.emit()">
                {{ busy() ? 'Running…' : confirmLabel() }}
              </button>
            </div>
          </div>
        </z-card>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpgradeConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirm upgrade');
  readonly message = input('Run this operation?');
  readonly commandPreview = input<string | null>(null);
  readonly confirmLabel = input('Run');
  readonly busy = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
