import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import {
  ZardCommandComponent,
  ZardCommandEmptyComponent,
  ZardCommandInputComponent,
  ZardCommandListComponent,
  ZardCommandOptionComponent,
  ZardCommandOptionGroupComponent,
  type ZardCommandOption
} from '@/shared/components/command';

export interface CommandPaletteAction {
  id: string;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-command-palette',
  imports: [
    ZardCommandComponent,
    ZardCommandInputComponent,
    ZardCommandListComponent,
    ZardCommandEmptyComponent,
    ZardCommandOptionGroupComponent,
    ZardCommandOptionComponent
  ],
  templateUrl: './command-palette.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './command-palette.component.css',
})
export class CommandPaletteComponent {
  readonly open = input(false);
  readonly actions = input<CommandPaletteAction[]>([]);

  readonly selected = output<string>();
  readonly closed = output<void>();

  protected onCommandSelected(option: ZardCommandOption): void {
    this.selected.emit(String(option.value));
  }
}
