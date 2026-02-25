import { describe, expect, it } from 'vitest';

import { IPC_CHANNELS } from './ipc-channels';

describe('IPC channel allowlist', () => {
  it('contains only explicit channel names', () => {
    const channels = Object.values(IPC_CHANNELS);

    expect(channels).toContain('brew:getInstalled');
    expect(channels).toContain('brew:getOutdated');
    expect(channels).toContain('brew:searchCatalog');
    expect(channels).toContain('brew:installOne');
    expect(channels).toContain('brew:upgradeOne');
    expect(channels).toContain('brew:upgradeAll');
    expect(channels).toContain('brew:checkNow');
    expect(channels).toContain('settings:get');
    expect(channels).toContain('settings:update');
    expect(channels).toContain('updates:changed');
    expect(channels).not.toContain('ipc:invoke');
  });
});
