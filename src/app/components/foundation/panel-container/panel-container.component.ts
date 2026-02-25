import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ZardCardComponent } from '@/shared/components/card';

@Component({
  selector: 'app-panel-container',
  imports: [ZardCardComponent],
  templateUrl: './panel-container.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './panel-container.component.css',
})
export class PanelContainerComponent {}
