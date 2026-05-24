import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-settings-setting-row',
  templateUrl: './settings-setting-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './settings-setting-row.component.css'
})
export class SettingsSettingRowComponent {}
