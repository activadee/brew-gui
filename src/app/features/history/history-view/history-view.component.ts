import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { DiagnosticPanelComponent } from '../../../components/ux/diagnostic-panel/diagnostic-panel.component';
import { HistoryStore } from '../../../core/stores/history.store';

@Component({
  selector: 'app-history-view',
  imports: [ZardCardComponent, ZardButtonComponent, ZardBadgeComponent, DiagnosticPanelComponent],
  templateUrl: './history-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HistoryViewComponent implements OnInit {
  protected readonly historyStore = inject(HistoryStore);
  protected readonly selectedOutput = signal<string | null>(null);

  ngOnInit(): void {
    void this.historyStore.load();
  }

  protected showOutput(output: string | null | undefined): void {
    this.selectedOutput.set(output ?? 'No output captured for this job.');
  }

  protected formatDay(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
}
