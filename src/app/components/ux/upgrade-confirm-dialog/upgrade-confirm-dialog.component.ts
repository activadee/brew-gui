import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';

@Component({
  selector: 'app-upgrade-confirm-dialog',
  imports: [ZardCardComponent, ZardButtonComponent, ZardDividerComponent],
  templateUrl: './upgrade-confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './upgrade-confirm-dialog.component.css',
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
