import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ZardCardComponent } from '@/shared/components/card';
import { ZardLoaderComponent } from '@/shared/components/loader';

@Component({
  selector: 'app-loading-state',
  imports: [ZardCardComponent, ZardLoaderComponent],
  templateUrl: './loading-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './loading-state.component.css',
})
export class LoadingStateComponent {
  readonly label = input('Loading…');
}
