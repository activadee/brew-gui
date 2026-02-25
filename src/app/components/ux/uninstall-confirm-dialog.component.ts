import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardCheckboxComponent } from '@/shared/components/checkbox';
import { ZardDividerComponent } from '@/shared/components/divider';
import type { PackageKind } from '../../../shared/contracts';

@Component({
  selector: 'app-uninstall-confirm-dialog',
  imports: [FormsModule, ZardCardComponent, ZardButtonComponent, ZardCheckboxComponent, ZardDividerComponent],
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-40 bg-black/35 backdrop-blur-sm" (click)="cancel.emit()"></div>
      <section class="fixed left-1/2 top-1/2 z-50 w-[480px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2">
        <z-card class="border-border/70 bg-popover/95 shadow-2xl">
          <div class="space-y-3">
            <div>
              <h3 class="text-base font-semibold">{{ title() }}</h3>
              <p class="mt-1 text-sm text-muted-foreground">{{ message() }}</p>
            </div>

            @if (kind() === 'cask') {
              <z-checkbox [ngModel]="zapSelected()" (ngModelChange)="zapSelectedChange.emit($event)">
                <span class="text-sm">Remove related cask files with <span class="mono">--zap</span></span>
              </z-checkbox>
            }

            @if (commandPreview()) {
              <pre class="overflow-x-auto rounded-md border border-border bg-muted/40 p-2 text-[11px] mono">{{ commandPreview() }}</pre>
            }

            <z-divider zSpacing="sm" />

            <div class="flex justify-end gap-2">
              <button type="button" z-button zType="outline" zSize="sm" [zDisabled]="busy()" (click)="cancel.emit()">
                Cancel
              </button>
              <button type="button" z-button zType="destructive" zSize="sm" [zDisabled]="busy()" (click)="confirm.emit()">
                {{ busy() ? 'Running…' : 'Uninstall package' }}
              </button>
            </div>
          </div>
        </z-card>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UninstallConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Uninstall package?');
  readonly message = input('This will remove the selected package from Homebrew.');
  readonly commandPreview = input<string | null>(null);
  readonly kind = input<PackageKind | null>(null);
  readonly zapSelected = input(false);
  readonly busy = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
  readonly zapSelectedChange = output<boolean>();
}
