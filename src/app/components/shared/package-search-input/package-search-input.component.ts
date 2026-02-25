import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardIconComponent } from '@/shared/components/icon';
import { ZardInputDirective } from '@/shared/components/input';

@Component({
  selector: 'app-package-search-input',
  imports: [ZardIconComponent, ZardInputDirective],
  templateUrl: './package-search-input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './package-search-input.component.css',
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
