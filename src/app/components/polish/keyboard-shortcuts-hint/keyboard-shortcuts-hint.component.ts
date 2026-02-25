import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ZardKbdComponent, ZardKbdGroupComponent } from '@/shared/components/kbd';

@Component({
  selector: 'app-keyboard-shortcuts-hint',
  imports: [ZardKbdGroupComponent, ZardKbdComponent],
  templateUrl: './keyboard-shortcuts-hint.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './keyboard-shortcuts-hint.component.css',
})
export class KeyboardShortcutsHintComponent {}
