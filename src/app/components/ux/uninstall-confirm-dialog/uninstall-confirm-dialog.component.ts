import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardCheckboxComponent } from '@/shared/components/checkbox';
import { ZardDividerComponent } from '@/shared/components/divider';
import type { PackageKind } from '../../../../shared/contracts';

@Component({
  selector: 'app-uninstall-confirm-dialog',
  imports: [FormsModule, ZardCardComponent, ZardButtonComponent, ZardCheckboxComponent, ZardDividerComponent],
  templateUrl: './uninstall-confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './uninstall-confirm-dialog.component.css',
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
