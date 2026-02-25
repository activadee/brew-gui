import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-package-action-button',
  imports: [NgClass],
  template: `
    <button
      type="button"
      class="btn-ui"
      [ngClass]="variant() === 'primary' ? 'btn-ui-primary' : 'btn-ui-ghost'"
      [disabled]="disabled()"
      [class.cursor-not-allowed]="disabled()"
      [class.opacity-55]="disabled()"
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
