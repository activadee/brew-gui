import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ZardEmptyComponent } from '@/shared/components/empty';

@Component({
  selector: 'app-empty-state',
  imports: [ZardEmptyComponent],
  templateUrl: './empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './empty-state.component.css',
})
export class EmptyStateComponent {
  readonly label = input('No results');
  readonly description = input('Try changing your filter or search query.');
}
