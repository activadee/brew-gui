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
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" (click)="closed.emit()"></div>

      <section class="fixed left-1/2 top-20 z-50 w-[600px] max-w-[92vw] -translate-x-1/2" (click)="$event.stopPropagation()">
        <z-command class="overflow-hidden rounded-xl border border-border bg-popover shadow-2xl" (zCommandSelected)="onCommandSelected($event)">
          <z-command-input placeholder="Type a command or search..." />
          <z-command-list>
            <z-command-empty>No matching actions.</z-command-empty>

            <z-command-option-group zLabel="Actions">
              @for (action of actions(); track action.id) {
                <z-command-option
                  [zValue]="action.id"
                  [zLabel]="action.label"
                  [zCommand]="action.label + ' ' + action.hint"
                  [zShortcut]="action.hint"
                />
              }
            </z-command-option-group>
          </z-command-list>
        </z-command>
      </section>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
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
