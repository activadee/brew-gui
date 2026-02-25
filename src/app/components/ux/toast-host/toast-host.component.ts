import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ZardBadgeComponent } from '@/shared/components/badge';
import { ZardButtonComponent } from '@/shared/components/button';
import { ZardCardComponent } from '@/shared/components/card';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-host',
  imports: [ZardCardComponent, ZardBadgeComponent, ZardButtonComponent],
  templateUrl: './toast-host.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './toast-host.component.css',
})
export class ToastHostComponent {
  protected readonly toastService = inject(ToastService);
}
