import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';

@Component({
  selector: 'app-batch-confirm-dialog',
  imports: [ZardCardComponent, ZardButtonComponent, ZardDividerComponent],
  templateUrl: './batch-confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './batch-confirm-dialog.component.css',
})
export class BatchConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Confirm batch action');
  readonly message = input('Run this operation on the selected packages?');
  readonly packageNames = input<string[]>([]);
  readonly commandPreview = input<string | null>(null);
  readonly confirmLabel = input('Run');
  readonly busy = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
