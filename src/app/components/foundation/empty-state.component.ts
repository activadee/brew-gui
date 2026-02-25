import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <section class="card-surface panel-reveal flex flex-col items-start gap-2 px-5 py-4">
      <p class="mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">{{ label() }}</p>
      <p class="text-sm text-[var(--text-main)]">{{ description() }}</p>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  readonly label = input('No results');
  readonly description = input('Try changing your filter or search query.');
}
