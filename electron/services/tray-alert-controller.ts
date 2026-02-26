import type { AppSettings } from '../../src/shared/contracts';
import { isInQuietHours, msUntilNextQuietBoundary } from './quiet-hours';

type UpdateSignalSource = 'manual' | 'scheduled' | 'startup';

interface QuietHoursConfig {
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface TrayAlertControllerOptions {
  onFlushMutedCount: (count: number) => void;
  now?: () => Date;
  setTimer?: (callback: () => void, ms: number) => NodeJS.Timeout;
  clearTimer?: (timer: NodeJS.Timeout) => void;
}

export class TrayAlertController {
  private quietHours: QuietHoursConfig = {
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00'
  };

  private mutedCount: number | null = null;
  private boundaryTimer: NodeJS.Timeout | null = null;

  private readonly now: () => Date;
  private readonly setTimer: (callback: () => void, ms: number) => NodeJS.Timeout;
  private readonly clearTimer: (timer: NodeJS.Timeout) => void;
  private readonly onFlushMutedCount: (count: number) => void;

  constructor(options: TrayAlertControllerOptions) {
    this.now = options.now ?? (() => new Date());
    this.setTimer = options.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
    this.clearTimer = options.clearTimer ?? ((timer) => clearTimeout(timer));
    this.onFlushMutedCount = options.onFlushMutedCount;
  }

  updateSettings(settings: Pick<AppSettings, 'quietHoursEnabled' | 'quietHoursStart' | 'quietHoursEnd'>): void {
    this.quietHours = {
      quietHoursEnabled: settings.quietHoursEnabled,
      quietHoursStart: settings.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd
    };

    this.flushMutedIfNeeded();
    this.scheduleBoundaryTimer();
  }

  stop(): void {
    this.clearBoundaryTimer();
  }

  shouldMuteUpdateSignal(source: UpdateSignalSource, count: number): boolean {
    this.flushMutedIfNeeded();

    if (source === 'manual') {
      return false;
    }

    if (
      !isInQuietHours(
        this.now(),
        this.quietHours.quietHoursEnabled,
        this.quietHours.quietHoursStart,
        this.quietHours.quietHoursEnd
      )
    ) {
      return false;
    }

    this.mutedCount = count;
    return true;
  }

  private scheduleBoundaryTimer(): void {
    this.clearBoundaryTimer();

    if (!this.quietHours.quietHoursEnabled) {
      return;
    }

    const delayMs = msUntilNextQuietBoundary(
      this.now(),
      this.quietHours.quietHoursStart,
      this.quietHours.quietHoursEnd
    );

    this.boundaryTimer = this.setTimer(() => {
      this.boundaryTimer = null;
      this.flushMutedIfNeeded();
      this.scheduleBoundaryTimer();
    }, delayMs);
  }

  private clearBoundaryTimer(): void {
    if (!this.boundaryTimer) {
      return;
    }

    this.clearTimer(this.boundaryTimer);
    this.boundaryTimer = null;
  }

  private flushMutedIfNeeded(): void {
    if (this.mutedCount === null) {
      return;
    }

    if (
      isInQuietHours(
        this.now(),
        this.quietHours.quietHoursEnabled,
        this.quietHours.quietHoursStart,
        this.quietHours.quietHoursEnd
      )
    ) {
      return;
    }

    const count = this.mutedCount;
    this.mutedCount = null;
    this.onFlushMutedCount(count);
  }
}

export type { UpdateSignalSource };
