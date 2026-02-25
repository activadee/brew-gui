import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-keyboard-shortcuts-hint',
  template: `
    <p class="mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
      ⌘K command palette · ⌘R refresh updates · ⌘B go browse
    </p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KeyboardShortcutsHintComponent {}
