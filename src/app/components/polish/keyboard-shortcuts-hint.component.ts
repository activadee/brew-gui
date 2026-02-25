import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ZardKbdComponent, ZardKbdGroupComponent } from '@/shared/components/kbd';

@Component({
  selector: 'app-keyboard-shortcuts-hint',
  imports: [ZardKbdGroupComponent, ZardKbdComponent],
  template: `
    <z-kbd-group class="items-center text-[10px] text-muted-foreground">
      <span class="mono uppercase tracking-[0.08em]">Shortcuts</span>
      <z-kbd>⌘K</z-kbd>
      <span>Palette</span>
      <z-kbd>⌘R</z-kbd>
      <span>Refresh</span>
      <z-kbd>⌘B</z-kbd>
      <span>Browse</span>
    </z-kbd-group>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KeyboardShortcutsHintComponent {}
