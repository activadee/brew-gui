import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-package-search-input',
  template: `
    <label class="relative block">
      <input
        type="search"
        [value]="value()"
        [placeholder]="placeholder()"
        (input)="onInput($event)"
        class="field-ui px-3 py-2 pr-10 text-sm outline-none"
      />
      <span class="pointer-events-none absolute right-3 top-2.5 mono text-xs text-[var(--text-muted)]">⌕</span>
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
