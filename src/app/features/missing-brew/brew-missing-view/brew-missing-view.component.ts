import { ChangeDetectionStrategy, Component } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';

@Component({
  selector: 'app-brew-missing-view',
  imports: [ZardCardComponent, ZardBadgeComponent, ZardButtonComponent],
  templateUrl: './brew-missing-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './brew-missing-view.component.css',
})
export class BrewMissingViewComponent {}
