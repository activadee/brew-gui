import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TrayAlertController } from './tray-alert-controller';

describe('TrayAlertController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mutes scheduled signals during quiet hours and flushes the latest muted count at boundary', async () => {
    vi.setSystemTime(new Date('2026-02-26T23:00:00'));
    const onFlush = vi.fn();
    const controller = new TrayAlertController({ onFlushMutedCount: onFlush });

    controller.updateSettings({
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00'
    });

    expect(controller.shouldMuteUpdateSignal('scheduled', 3)).toBe(true);
    expect(controller.shouldMuteUpdateSignal('startup', 7)).toBe(true);
    expect(onFlush).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(8 * 60 * 60 * 1000 + 1);

    expect(onFlush).toHaveBeenCalledTimes(1);
    expect(onFlush).toHaveBeenCalledWith(7);
    controller.stop();
  });

  it('does not mute manual update signals', () => {
    vi.setSystemTime(new Date('2026-02-26T23:00:00'));
    const onFlush = vi.fn();
    const controller = new TrayAlertController({ onFlushMutedCount: onFlush });

    controller.updateSettings({
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00'
    });

    expect(controller.shouldMuteUpdateSignal('manual', 5)).toBe(false);
    expect(onFlush).not.toHaveBeenCalled();
    controller.stop();
  });

  it('flushes muted counts immediately when quiet hours are disabled', () => {
    vi.setSystemTime(new Date('2026-02-26T23:00:00'));
    const onFlush = vi.fn();
    const controller = new TrayAlertController({ onFlushMutedCount: onFlush });

    controller.updateSettings({
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00'
    });
    expect(controller.shouldMuteUpdateSignal('scheduled', 4)).toBe(true);

    controller.updateSettings({
      quietHoursEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00'
    });

    expect(onFlush).toHaveBeenCalledWith(4);
    controller.stop();
  });
});
