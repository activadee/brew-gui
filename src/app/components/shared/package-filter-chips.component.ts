import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface PackageFilterOption {
  value: string;
  label: string;
  count?: number;
}

@Component({
  selector: 'app-package-filter-chips',
  imports: [NgClass],
  template: `
    <div class="flex flex-wrap gap-2">
      @for (option of options(); track option.value) {
        <button
          type="button"
          class="filter-chip px-3 py-1 text-xs mono"
          [ngClass]="selected() === option.value ? 'filter-chip-active' : ''"
          (click)="select(option.value)"
        >
          {{ option.label }}
          @if (option.count !== undefined) {
            <span class="ml-1">{{ option.count }}</span>
          }
        </button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PackageFilterChipsComponent {
  readonly options = input<PackageFilterOption[]>([]);
  readonly selected = input('all');
  readonly selectedChange = output<string>();

  select(value: string): void {
    this.selectedChange.emit(value);
  }
}
