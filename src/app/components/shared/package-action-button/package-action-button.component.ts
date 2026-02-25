import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';

@Component({
  selector: 'app-package-action-button',
  imports: [ZardButtonComponent],
  templateUrl: './package-action-button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './package-action-button.component.css',
})
export class PackageActionButtonComponent {
  readonly label = input('Action');
  readonly disabled = input(false);
  readonly variant = input<'primary' | 'secondary'>('secondary');

  readonly pressed = output<void>();
}
