import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';

@Component({
  selector: 'app-cleanup-confirm-dialog',
  imports: [ZardCardComponent, ZardButtonComponent, ZardDividerComponent],
  templateUrl: './cleanup-confirm-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './cleanup-confirm-dialog.component.css',
})
export class CleanupConfirmDialogComponent {
  readonly open = input(false);
  readonly title = input('Run Homebrew cleanup?');
  readonly message = input('This removes stale Homebrew cache/download files and old versions.');
  readonly commandPreview = input('brew cleanup');
  readonly estimatedReclaim = input<string | null>(null);
  readonly busy = input(false);

  readonly confirm = output<void>();
  readonly cancel = output<void>();
}
