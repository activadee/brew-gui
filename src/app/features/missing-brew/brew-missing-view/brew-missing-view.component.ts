import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { DiagnosticPanelComponent } from '../../../components/ux/diagnostic-panel/diagnostic-panel.component';

@Component({
  selector: 'app-brew-missing-view',
  imports: [ZardCardComponent, ZardBadgeComponent, ZardButtonComponent, DiagnosticPanelComponent],
  templateUrl: './brew-missing-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './brew-missing-view.component.css',
})
export class BrewMissingViewComponent {
  protected readonly installCommand =
    '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
}
