import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardIconComponent } from '@/shared/components/icon';
import { ZardInputDirective } from '@/shared/components/input';

@Component({
  selector: 'app-package-search-input',
  imports: [ZardIconComponent, ZardInputDirective],
  template: `
    <label class="relative block">
      <z-icon zType="search" class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
      <input
        z-input
        type="search"
        [value]="value()"
        [placeholder]="placeholder()"
        (input)="onInput($event)"
        class="h-9 pl-9"
      />
    </label>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PackageSearchInputComponent {
  readonly value = input('');
  readonly placeholder = input('Search packages');
  readonly valueChange = output<string>();

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }
}
