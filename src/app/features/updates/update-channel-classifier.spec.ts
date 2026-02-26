import { describe, expect, it } from 'vitest';

import type { InstalledPackage, OutdatedPackage } from '../../../shared/contracts';
import {
  buildUpdateChannelCounts,
  buildUpdateChannelMap,
  classifyUpdateChannel
} from './update-channel-classifier';

function makeFormulaOutdated(overrides: Partial<OutdatedPackage> = {}): OutdatedPackage {
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

function makeInstalled(overrides: Partial<InstalledPackage> = {}): InstalledPackage {
  return {
    id: 'formula:ripgrep',
    kind: 'formula',
    name: 'ripgrep',
    desc: null,
    installedVersion: '14.0.0',
    currentVersion: '14.0.1',
    pinned: false,
    tap: 'homebrew/core',
    homepage: null,
    deprecated: false,
    disabled: false,
    deprecationReason: null,
    disableReason: null,
    replacement: null,
    ...overrides
  };
}

describe('update-channel-classifier', () => {
  it('classifies disabled packages as critical', () => {
    const outdated = makeFormulaOutdated();
    const installed = makeInstalled({ disabled: true });

    expect(classifyUpdateChannel(outdated, installed)).toBe('critical');
  });

  it('classifies formula major-version upgrades as critical', () => {
    const outdated = makeFormulaOutdated({
      installedVersions: ['1.9.0'],
      currentVersion: '2.0.0'
    });

    expect(classifyUpdateChannel(outdated, makeInstalled())).toBe('critical');
  });

  it('classifies formulae with unparseable versions as critical', () => {
    const outdated = makeFormulaOutdated({
      installedVersions: ['HEAD'],
      currentVersion: 'stable'
    });

    expect(classifyUpdateChannel(outdated, makeInstalled())).toBe('critical');
  });

  it('classifies security reason signals as security', () => {
    const outdated = makeFormulaOutdated();
    const installed = makeInstalled({
      deprecationReason: 'Formula has known CVE exposure and is insecure'
    });

    expect(classifyUpdateChannel(outdated, installed)).toBe('security');
  });

  it('classifies openssl variants as security-sensitive', () => {
    const outdated = makeFormulaOutdated({
      id: 'formula:openssl@3',
      name: 'openssl@3'
    });

    expect(classifyUpdateChannel(outdated, null)).toBe('security');
  });

  it('classifies routine patch/minor updates as normal', () => {
    const patch = makeFormulaOutdated({
      id: 'formula:bat',
      name: 'bat',
      installedVersions: ['0.24.0'],
      currentVersion: '0.24.1'
    });
    const minor = makeFormulaOutdated({
      id: 'formula:fd',
      name: 'fd',
      installedVersions: ['9.0.0'],
      currentVersion: '9.1.0'
    });

    expect(classifyUpdateChannel(patch, makeInstalled({ id: patch.id, name: patch.name }))).toBe('normal');
    expect(classifyUpdateChannel(minor, makeInstalled({ id: minor.id, name: minor.name }))).toBe('normal');
  });

  it('uses critical-over-security precedence when both match', () => {
    const outdated = makeFormulaOutdated({
      id: 'formula:openssl',
      name: 'openssl',
      installedVersions: ['1.0.0'],
      currentVersion: '2.0.0'
    });
    const installed = makeInstalled({
      id: outdated.id,
      name: outdated.name,
      disabled: true,
      disableReason: 'Security issue detected'
    });

    expect(classifyUpdateChannel(outdated, installed)).toBe('critical');
  });

  it('builds channel map and counts from outdated items', () => {
    const critical = makeFormulaOutdated({
      id: 'formula:node',
      name: 'node',
      installedVersions: ['20.0.0'],
      currentVersion: '21.0.0'
    });
    const security = makeFormulaOutdated({
      id: 'formula:openssl@3',
      name: 'openssl@3'
    });
    const normal = makeFormulaOutdated({
      id: 'formula:ripgrep',
      name: 'ripgrep'
    });

    const outdated = [critical, security, normal];
    const installedById = new Map<string, InstalledPackage>([
      [critical.id, makeInstalled({ id: critical.id, name: critical.name })],
      [normal.id, makeInstalled({ id: normal.id, name: normal.name })]
    ]);

    const channelById = buildUpdateChannelMap(outdated, installedById);
    const counts = buildUpdateChannelCounts(outdated, channelById);

    expect(channelById.get(critical.id)).toBe('critical');
    expect(channelById.get(security.id)).toBe('security');
    expect(channelById.get(normal.id)).toBe('normal');
    expect(counts).toEqual({
      critical: 1,
      security: 1,
      normal: 1
    });
  });
});
