import { describe, expect, it } from 'vitest';

import { IPC_CHANNELS } from './ipc-channels';

describe('IPC channel allowlist', () => {
  it('contains only explicit channel names', () => {
    const channels = Object.values(IPC_CHANNELS);

    expect(channels).toContain('brew:getInstalled');
    expect(channels).toContain('brew:getOutdated');
    expect(channels).toContain('brew:getTaps');
    expect(channels).toContain('brew:getServices');
    expect(channels).toContain('brew:getPackageDetails');
    expect(channels).toContain('brew:searchCatalog');
    expect(channels).toContain('app:windowControl');
    expect(channels).toContain('app:getWindowChrome');
    expect(channels).toContain('app:getUpdateState');
    expect(channels).toContain('app:checkForAppUpdate');
    expect(channels).toContain('app:updateStateChanged');
    expect(channels).toContain('brew:installOne');
    expect(channels).toContain('brew:reinstallOne');
    expect(channels).toContain('brew:uninstallOne');
    expect(channels).toContain('brew:pinOne');
    expect(channels).toContain('brew:unpinOne');
    expect(channels).toContain('brew:tapAdd');
    expect(channels).toContain('brew:tapRemove');
    expect(channels).toContain('brew:serviceStart');
    expect(channels).toContain('brew:serviceStop');
    expect(channels).toContain('brew:serviceRestart');
    expect(channels).toContain('brew:cleanupPreview');
    expect(channels).toContain('brew:cleanupRun');
    expect(channels).toContain('brew:doctorRun');
    expect(channels).toContain('brew:upgradeOne');
    expect(channels).toContain('brew:upgradeAll');
    expect(channels).toContain('brew:getSmartUpgradePlan');
    expect(channels).toContain('brew:upgradeSmart');
    expect(channels).toContain('brew:checkNow');
    expect(channels).toContain('brew:syncMetadata');
    expect(channels).toContain('settings:get');
    expect(channels).toContain('settings:update');
    expect(channels).toContain('history:list');
    expect(channels).toContain('history:stats');
    expect(channels).toContain('templates:list');
    expect(channels).toContain('templates:run');
    expect(channels).toContain('brew:upgradeMany');
    expect(channels).toContain('jobs:recover');
    expect(channels).toContain('updates:changed');
    expect(channels).toContain('app:windowChromeChanged');
    expect(channels).not.toContain('ipc:invoke');
  });
});
