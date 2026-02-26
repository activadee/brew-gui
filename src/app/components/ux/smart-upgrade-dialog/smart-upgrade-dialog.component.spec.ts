import { TestBed } from '@angular/core/testing';

import { SmartUpgradeDialogComponent } from './smart-upgrade-dialog.component';

describe('SmartUpgradeDialogComponent', () => {
  it('should create', async () => {
    await TestBed.configureTestingModule({
      imports: [SmartUpgradeDialogComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(SmartUpgradeDialogComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });
});
