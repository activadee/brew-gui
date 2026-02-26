import { describe, expect, it } from 'vitest';

import { isInQuietHours, msUntilNextQuietBoundary } from './quiet-hours';

describe('isInQuietHours', () => {
  it('returns false when quiet hours are disabled', () => {
    expect(isInQuietHours(new Date('2026-02-26T23:00:00.000Z'), false, '22:00', '07:00')).toBe(false);
  });

  it('handles same-day quiet windows', () => {
    expect(isInQuietHours(new Date('2026-02-26T11:00:00'), true, '09:00', '17:00')).toBe(true);
    expect(isInQuietHours(new Date('2026-02-26T08:59:00'), true, '09:00', '17:00')).toBe(false);
    expect(isInQuietHours(new Date('2026-02-26T17:00:00'), true, '09:00', '17:00')).toBe(false);
  });

  it('handles overnight quiet windows', () => {
    expect(isInQuietHours(new Date('2026-02-26T23:15:00'), true, '22:00', '07:00')).toBe(true);
    expect(isInQuietHours(new Date('2026-02-26T06:30:00'), true, '22:00', '07:00')).toBe(true);
    expect(isInQuietHours(new Date('2026-02-26T12:00:00'), true, '22:00', '07:00')).toBe(false);
  });
});

describe('msUntilNextQuietBoundary', () => {
  it('returns the next boundary for same-day windows', () => {
    const now = new Date('2026-02-26T10:30:00');
    const ms = msUntilNextQuietBoundary(now, '09:00', '17:00');

    expect(ms).toBe(6.5 * 60 * 60 * 1000);
  });

  it('returns quiet-end boundary while currently in an overnight window', () => {
    const now = new Date('2026-02-26T23:00:00');
    const ms = msUntilNextQuietBoundary(now, '22:00', '07:00');

    expect(ms).toBe(8 * 60 * 60 * 1000);
  });

  it('returns quiet-start boundary while currently outside an overnight window', () => {
    const now = new Date('2026-02-26T12:00:00');
    const ms = msUntilNextQuietBoundary(now, '22:00', '07:00');

    expect(ms).toBe(10 * 60 * 60 * 1000);
  });
});
