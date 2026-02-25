import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-connection-status-pill',
  template: `
    <div
      class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs mono transition-colors duration-200"
      [class.border-emerald-300]="available()"
      [class.bg-emerald-50]="available()"
      [class.text-emerald-700]="available()"
      [class.border-amber-300]="!available()"
      [class.bg-amber-50]="!available()"
      [class.text-amber-800]="!available()"
    >
      <span
        class="h-1.5 w-1.5 rounded-full"
        [class.bg-emerald-500]="available()"
        [class.bg-amber-500]="!available()"
        [class.animate-pulse]="available()"
      ></span>
      <span>{{ label() }}</span>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConnectionStatusPillComponent {
  readonly available = input(false);
  readonly version = input<string | null>(null);

  readonly label = computed(() =>
    this.available() ? `brew detected${this.version() ? ` · ${this.version()}` : ''}` : 'brew missing'
  );
}
