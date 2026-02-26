import { describe, expect, it } from 'vitest';

import type { OutdatedPackage } from '../../src/shared/contracts';
import { buildSmartUpgradeBlockedKey, buildSmartUpgradePlan } from './smart-upgrade-planner';

function makeFormula(overrides: Partial<OutdatedPackage> = {}): OutdatedPackage {
  return {
    id: 'formula:ripgrep',
    kind: 'formula',
    name: 'ripgrep',
    installedVersions: ['14.0.0'],
    currentVersion: '14.0.1',
    pinned: false,
    ...overrides
  };
}

function makeCask(overrides: Partial<OutdatedPackage> = {}): OutdatedPackage {
  return {
    id: 'cask:firefox',
    kind: 'cask',
    name: 'firefox',
    installedVersions: ['120.0.0'],
    currentVersion: '121.0.0',
    pinned: false,
    ...overrides
  };
}

describe('buildSmartUpgradePlan', () => {
  it('excludes pinned formulae with precedence over blocked list', () => {
    const pinned = makeFormula({
      id: 'formula:openssl@3',
      name: 'openssl@3',
      pinned: true
    });
    const blockedKeys = new Set([buildSmartUpgradeBlockedKey({ kind: 'formula', name: 'openssl@3' })]);

    const plan = buildSmartUpgradePlan([pinned], blockedKeys);

    expect(plan.excludedPinned).toHaveLength(1);
    expect(plan.excludedPinned[0]?.name).toBe('openssl@3');
    expect(plan.excludedBlocked).toHaveLength(0);
  });

  it('excludes blocked packages from eligible risk groups', () => {
    const blocked = makeFormula({ id: 'formula:wget', name: 'wget' });
    const blockedKeys = new Set([buildSmartUpgradeBlockedKey({ kind: 'formula', name: 'wget' })]);

    const plan = buildSmartUpgradePlan([blocked], blockedKeys);

    expect(plan.excludedBlocked).toHaveLength(1);
    expect(plan.excludedBlocked[0]?.name).toBe('wget');
    expect(plan.totals.eligible).toBe(0);
  });

  it('classifies patch/minor/major formula updates into low/medium/high risk', () => {
    const patch = makeFormula({
      id: 'formula:jq',
      name: 'jq',
      installedVersions: ['1.7.0'],
      currentVersion: '1.7.1'
    });
    const minor = makeFormula({
      id: 'formula:fd',
      name: 'fd',
      installedVersions: ['9.0.0'],
      currentVersion: '9.1.0'
    });
    const major = makeFormula({
      id: 'formula:node',
      name: 'node',
      installedVersions: ['20.9.0'],
      currentVersion: '21.0.0'
    });

    const plan = buildSmartUpgradePlan([patch, minor, major], new Set());

    expect(plan.low.map((item) => item.name)).toEqual(['jq']);
    expect(plan.medium.map((item) => item.name)).toEqual(['fd']);
    expect(plan.high.map((item) => item.name)).toEqual(['node']);
  });

  it('treats casks as high risk and unparseable formula versions as high risk', () => {
    const cask = makeCask();
    const unknownVersionFormula = makeFormula({
      id: 'formula:weirdpkg',
      name: 'weirdpkg',
      installedVersions: ['HEAD'],
      currentVersion: 'stable'
    });

    const plan = buildSmartUpgradePlan([cask, unknownVersionFormula], new Set());

    expect(plan.high.map((item) => item.name)).toEqual(['weirdpkg', 'firefox']);
  });

  it('uses stable ordering inside each risk group (formula then cask, then name)', () => {
    const lowB = makeFormula({ id: 'formula:zstd', name: 'zstd' });
    const lowA = makeFormula({ id: 'formula:bat', name: 'bat' });
    const lowCask = makeCask({
      id: 'cask:arc',
      name: 'arc',
      installedVersions: ['1.2.2'],
      currentVersion: '1.2.3'
    });

    const plan = buildSmartUpgradePlan([lowB, lowCask, lowA], new Set());

    expect(plan.low.map((item) => `${item.kind}:${item.name}`)).toEqual([
      'formula:bat',
      'formula:zstd'
    ]);
    expect(plan.high.map((item) => `${item.kind}:${item.name}`)).toEqual(['cask:arc']);
  });

  it('elevates patch updates to medium risk when multiple installed versions are present', () => {
    const multiInstalled = makeFormula({
      id: 'formula:python@3.12',
      name: 'python@3.12',
      installedVersions: ['3.12.1', '3.12.0'],
      currentVersion: '3.12.2'
    });

    const plan = buildSmartUpgradePlan([multiInstalled], new Set());

    expect(plan.medium.map((item) => item.name)).toEqual(['python@3.12']);
    expect(plan.low).toHaveLength(0);
  });
});
