import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { DEFAULT_WINDOW_CHROME_STATE } from '../../../shared/contracts';
import { BrewBridgeService } from './brew-bridge.service';

describe('BrewBridgeService fallback bridge', () => {
  it('uses fallback bridge when window.brewGui is unavailable', async () => {
    const originalBridge = window.brewGui;

    try {
      window.brewGui = undefined;

      TestBed.configureTestingModule({
        providers: [BrewBridgeService]
      });

      const service = TestBed.inject(BrewBridgeService);
      expect(service.isElectron).toBe(false);

      await expect(service.api.windowControl('close')).resolves.toBeUndefined();
      await expect(service.api.getWindowChromeState()).resolves.toEqual(DEFAULT_WINDOW_CHROME_STATE);
    } finally {
      window.brewGui = originalBridge;
    }
  });
});
