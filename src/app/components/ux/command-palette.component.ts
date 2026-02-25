import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface CommandPaletteAction {
  id: string;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-command-palette',
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-40 bg-black/28 backdrop-blur-[2px]" (click)="closed.emit()"></div>
      <section class="palette-surface ui-shell-enter fixed left-1/2 top-20 z-50 w-[560px] max-w-[92vw] -translate-x-1/2 p-2">
        @for (action of actions(); track action.id) {
          <button
            type="button"
            class="palette-item hover-lift flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition hover:bg-[#ece8df]"
            (click)="selected.emit(action.id)"
          >
            <span class="text-sm text-[var(--text-main)]">{{ action.label }}</span>
            <span class="mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{{ action.hint }}</span>
          </button>
        }
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
}
