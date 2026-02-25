import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';

@Component({
  selector: 'app-package-action-button',
  imports: [ZardButtonComponent],
  template: `
    <button
      type="button"
      z-button
      zSize="sm"
      [zType]="variant() === 'primary' ? 'default' : 'outline'"
      [zDisabled]="disabled()"
      (click)="pressed.emit()"
    >
      {{ label() }}
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PackageActionButtonComponent {
  readonly label = input('Action');
  readonly disabled = input(false);
  readonly variant = input<'primary' | 'secondary'>('secondary');

  readonly pressed = output<void>();
}
