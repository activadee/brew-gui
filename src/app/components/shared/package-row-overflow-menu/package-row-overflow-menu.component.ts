import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardButtonComponent } from '@/shared/components/button';
import { ZardDropdownMenuItemComponent, ZardDropdownMenuComponent } from '@/shared/components/dropdown';
import { ZardIconComponent } from '@/shared/components/icon';

export interface PackageRowOverflowAction {
  id: string;
  label: string;
  disabled?: boolean;
  destructive?: boolean;
}

@Component({
  selector: 'app-package-row-overflow-menu',
  imports: [
    ZardButtonComponent,
    ZardDropdownMenuComponent,
    ZardDropdownMenuItemComponent,
    ZardIconComponent
  ],
  templateUrl: './package-row-overflow-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './package-row-overflow-menu.component.css',
})
export class PackageRowOverflowMenuComponent {
  readonly actions = input<PackageRowOverflowAction[]>([]);
  readonly ariaLabel = input('More package actions');

  readonly selected = output<string>();

  protected onSelect(action: PackageRowOverflowAction): void {
    if (action.disabled) {
      return;
    }

    this.selected.emit(action.id);
  }
}
