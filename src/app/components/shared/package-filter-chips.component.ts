import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ZardSegmentedComponent, type SegmentedOption } from '@/shared/components/segmented/segmented.component';

export interface PackageFilterOption {
  value: string;
  label: string;
  count?: number;
}

@Component({
  selector: 'app-package-filter-chips',
  imports: [FormsModule, ZardSegmentedComponent],
  template: `
    <z-segmented
      zSize="sm"
      [zOptions]="segmentedOptions()"
      [ngModel]="selected()"
      (ngModelChange)="select($event)"
      zAriaLabel="Package filters"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PackageFilterChipsComponent {
  readonly options = input<PackageFilterOption[]>([]);
  readonly selected = input('all');
  readonly selectedChange = output<string>();

  protected readonly segmentedOptions = computed<SegmentedOption[]>(() =>
    this.options().map((option) => ({
      value: option.value,
      label: option.count !== undefined ? `${option.label} (${option.count})` : option.label
    }))
  );

  select(value: string): void {
    this.selectedChange.emit(value);
  }
}
