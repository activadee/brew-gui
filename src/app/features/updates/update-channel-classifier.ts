import type { InstalledPackage, OutdatedPackage } from '../../../shared/contracts';

export type UpdateChannel = 'critical' | 'security' | 'normal';
export type UpdateChannelFilter = 'all' | UpdateChannel;

export interface UpdateChannelCounts {
  critical: number;
  security: number;
  normal: number;
}

const SECURITY_REASON_PATTERN = /cve|vuln|security|insecure/i;

const SECURITY_SENSITIVE_PACKAGE_NAMES = new Set([
  'openssl',
  'libressl',
  'ca-certificates',
  'gnupg',
  'openssh'
]);

interface VersionTuple {
  major: number;
  minor: number;
  patch: number;
}

export function classifyUpdateChannel(
  outdated: OutdatedPackage,
  installed: InstalledPackage | null
): UpdateChannel {
  if (isCritical(outdated, installed)) {
    return 'critical';
  }

  if (isSecurity(outdated, installed)) {
    return 'security';
  }

  return 'normal';
}

export function buildUpdateChannelMap(
  outdated: OutdatedPackage[],
  installedById: Map<string, InstalledPackage>
): Map<string, UpdateChannel> {
  const channelById = new Map<string, UpdateChannel>();

  for (const item of outdated) {
    channelById.set(item.id, classifyUpdateChannel(item, installedById.get(item.id) ?? null));
  }

  return channelById;
}

export function buildUpdateChannelCounts(
  outdated: OutdatedPackage[],
  channelById: Map<string, UpdateChannel>
): UpdateChannelCounts {
  const counts: UpdateChannelCounts = {
    critical: 0,
    security: 0,
    normal: 0
  };

  for (const item of outdated) {
    const channel = channelById.get(item.id) ?? 'normal';
    counts[channel] += 1;
  }

  return counts;
}

function isCritical(outdated: OutdatedPackage, installed: InstalledPackage | null): boolean {
  if (installed?.disabled) {
    return true;
  }

  if (outdated.kind !== 'formula') {
    return false;
  }

  const installedVersion = outdated.installedVersions.at(0);
  const installedTuple = parseLeadingVersion(installedVersion);
  const currentTuple = parseLeadingVersion(outdated.currentVersion);

  if (!installedTuple || !currentTuple) {
    return true;
  }

  return currentTuple.major > installedTuple.major;
}

function isSecurity(outdated: OutdatedPackage, installed: InstalledPackage | null): boolean {
  const deprecationReason = installed?.deprecationReason ?? '';
  const disableReason = installed?.disableReason ?? '';

  if (SECURITY_REASON_PATTERN.test(deprecationReason) || SECURITY_REASON_PATTERN.test(disableReason)) {
    return true;
  }

  return isSecuritySensitivePackageName(outdated.name);
}

function isSecuritySensitivePackageName(name: string): boolean {
  const lower = name.toLocaleLowerCase();
  return lower.startsWith('openssl@') || SECURITY_SENSITIVE_PACKAGE_NAMES.has(lower);
}

function parseLeadingVersion(raw: string | undefined): VersionTuple | null {
  if (!raw) {
    return null;
  }

  const match = raw.trim().match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) {
    return null;
  }

  const major = Number(match[1]);
  const minor = Number(match[2] ?? '0');
  const patch = Number(match[3] ?? '0');

  if (![major, minor, patch].every((value) => Number.isFinite(value) && value >= 0)) {
    return null;
  }

  return {
    major,
    minor,
    patch
  };
}
