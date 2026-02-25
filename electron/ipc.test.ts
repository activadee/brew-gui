import { describe, expect, it } from 'vitest';

import { IPC_CHANNELS } from './ipc-channels';

describe('IPC channel allowlist', () => {
  it('contains only explicit channel names', () => {
    const channels = Object.values(IPC_CHANNELS);

    expect(channels).toContain('brew:getInstalled');
    expect(channels).toContain('brew:getOutdated');
    expect(channels).toContain('brew:searchCatalog');
    expect(channels).toContain('app:windowControl');
    expect(channels).toContain('app:getWindowChrome');
    expect(channels).toContain('brew:installOne');
    expect(channels).toContain('brew:reinstallOne');
    expect(channels).toContain('brew:uninstallOne');
    expect(channels).toContain('brew:pinOne');
    expect(channels).toContain('brew:unpinOne');
    expect(channels).toContain('brew:upgradeOne');
    expect(channels).toContain('brew:upgradeAll');
    expect(channels).toContain('brew:checkNow');
    expect(channels).toContain('brew:syncMetadata');
    expect(channels).toContain('settings:get');
    expect(channels).toContain('settings:update');
    expect(channels).toContain('updates:changed');
    expect(channels).toContain('app:windowChromeChanged');
    expect(channels).not.toContain('ipc:invoke');
  });
});
