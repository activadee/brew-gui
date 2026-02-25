import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ZardEmptyComponent } from '@/shared/components/empty';

@Component({
  selector: 'app-empty-state',
  imports: [ZardEmptyComponent],
  template: `
    <z-empty
      [zIcon]="'inbox'"
      [zTitle]="label()"
      [zDescription]="description()"
      class="rounded-lg border border-border/70 bg-card/90 py-8"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  readonly label = input('No results');
  readonly description = input('Try changing your filter or search query.');
}
