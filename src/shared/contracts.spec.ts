import { describe, expect, it } from 'vitest';

import {
  windowChromeStateSchema,
  windowControlActionSchema,
  type WindowChromeState
} from './contracts';

describe('window chrome contracts', () => {
  it('parses supported window control actions', () => {
    expect(windowControlActionSchema.parse('close')).toBe('close');
    expect(windowControlActionSchema.parse('minimize')).toBe('minimize');
    expect(windowControlActionSchema.parse('toggleZoom')).toBe('toggleZoom');
    expect(windowControlActionSchema.parse('toggleFullScreen')).toBe('toggleFullScreen');
  });

  it('rejects unsupported window control actions', () => {
    const result = windowControlActionSchema.safeParse('zoom');
    expect(result.success).toBe(false);
  });

  it('parses window chrome state payloads', () => {
    const sample: WindowChromeState = {
      platform: 'darwin',
      isFocused: true,
      isMaximized: false,
      isFullScreen: false,
      canClose: true,
      canMinimize: true,
      canZoom: true,
      canFullScreen: true
    };

    expect(windowChromeStateSchema.parse(sample)).toEqual(sample);
  });

  it('rejects invalid platform values in chrome state payloads', () => {
    const result = windowChromeStateSchema.safeParse({
      platform: 'solaris',
      isFocused: false,
      isMaximized: false,
      isFullScreen: false,
      canClose: false,
      canMinimize: false,
      canZoom: false,
      canFullScreen: false
    });

    expect(result.success).toBe(false);
  });
});
