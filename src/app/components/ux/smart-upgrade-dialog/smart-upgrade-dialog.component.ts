import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ZardDividerComponent } from '@/shared/components/divider';
import type { SmartUpgradePlan, SmartUpgradeRiskLevel } from '../../../../shared/contracts';

interface SmartRiskRow {
  value: SmartUpgradeRiskLevel;
  label: string;
  count: number;
}

@Component({
  selector: 'app-smart-upgrade-dialog',
  imports: [ZardCardComponent, ZardButtonComponent, ZardBadgeComponent, ZardDividerComponent],
  templateUrl: './smart-upgrade-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './smart-upgrade-dialog.component.css',
})
export class SmartUpgradeDialogComponent {
  readonly open = input(false);
  readonly plan = input<SmartUpgradePlan | null>(null);
  readonly selectedRisks = input<SmartUpgradeRiskLevel[]>([]);
  readonly busy = input(false);
  readonly error = input<string | null>(null);

  readonly selectedRisksChange = output<SmartUpgradeRiskLevel[]>();
  readonly cancel = output<void>();
  readonly confirm = output<void>();

  protected readonly riskRows = computed<SmartRiskRow[]>(() => {
    const plan = this.plan();
    if (!plan) {
      return [];
    }

    return [
      { value: 'low', label: 'Low risk', count: plan.totals.low },
      { value: 'medium', label: 'Medium risk', count: plan.totals.medium },
      { value: 'high', label: 'High risk', count: plan.totals.high }
    ];
  });

  protected readonly canConfirm = computed(
    () => this.selectedRisks().length > 0 && !this.busy() && Boolean(this.plan())
  );

  protected isRiskSelected(risk: SmartUpgradeRiskLevel): boolean {
    return this.selectedRisks().includes(risk);
  }

  protected onRiskToggle(risk: SmartUpgradeRiskLevel, checked: boolean): void {
    const current = this.selectedRisks();
    const next = checked ? [...new Set([...current, risk])] : current.filter((value) => value !== risk);

    this.selectedRisksChange.emit(next);
  }
}
