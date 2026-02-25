import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  template: `
    <div class="card-surface panel-reveal flex items-center gap-3 px-4 py-3 text-sm text-[var(--text-muted)]">
      <span class="inline-block h-3 w-3 animate-pulse rounded-full bg-[var(--accent)]"></span>
      <span>{{ label() }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoadingStateComponent {
  readonly label = input('Loading…');
}
