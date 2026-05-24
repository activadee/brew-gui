import { describe, expect, it } from 'vitest';

import { compileTimeAutoUpdatesEnabled } from './build-flags';

describe('compile-time auto-update flag', () => {
  it('defaults to enabled when ENABLE_AUTO_UPDATES is unset', () => {
    expect(compileTimeAutoUpdatesEnabled({})).toBe(true);
  });

  it('is enabled when ENABLE_AUTO_UPDATES=1', () => {
    expect(compileTimeAutoUpdatesEnabled({ ENABLE_AUTO_UPDATES: '1' })).toBe(true);
  });

  it('is disabled only when ENABLE_AUTO_UPDATES=0', () => {
    expect(compileTimeAutoUpdatesEnabled({ ENABLE_AUTO_UPDATES: '0' })).toBe(false);
  });
});
