import type {
  OutdatedPackage,
  SmartUpgradeBlockedPackage,
  SmartUpgradePlan,
  SmartUpgradePlanItem,
  SmartUpgradeRiskLevel
} from '../../src/shared/contracts';

const RISK_ORDER: SmartUpgradeRiskLevel[] = ['low', 'medium', 'high'];

interface VersionTuple {
  major: number;
  minor: number;
  patch: number;
}

interface RiskClassification {
  risk: SmartUpgradeRiskLevel;
  reason: string;
}

export function buildSmartUpgradeBlockedKey(pkg: SmartUpgradeBlockedPackage): string {
  return `${pkg.kind}:${pkg.name}`;
}

export function buildSmartUpgradePlan(
  outdated: OutdatedPackage[],
  blockedKeys: Set<string>
): SmartUpgradePlan {
  const low: SmartUpgradePlanItem[] = [];
  const medium: SmartUpgradePlanItem[] = [];
  const high: SmartUpgradePlanItem[] = [];
  const excludedPinned: SmartUpgradePlanItem[] = [];
  const excludedBlocked: SmartUpgradePlanItem[] = [];

  for (const item of outdated) {
    const classification = classifyRisk(item);
    const planItem = toPlanItem(item, classification);

    if (item.kind === 'formula' && item.pinned) {
      excludedPinned.push({
        ...planItem,
        reason: 'Formula is pinned and excluded from smart upgrades.'
      });
      continue;
    }

    if (blockedKeys.has(buildSmartUpgradeBlockedKey({ kind: item.kind, name: item.name }))) {
      excludedBlocked.push({
        ...planItem,
        reason: 'Package is excluded by user preference.'
      });
      continue;
    }

    switch (classification.risk) {
      case 'low':
        low.push(planItem);
        break;
      case 'medium':
        medium.push(planItem);
        break;
      case 'high':
        high.push(planItem);
        break;
      default:
        break;
    }
  }

  const sorted = {
    low: sortPlanItems(low),
    medium: sortPlanItems(medium),
    high: sortPlanItems(high),
    excludedPinned: sortPlanItems(excludedPinned),
    excludedBlocked: sortPlanItems(excludedBlocked)
  };

  return {
    generatedAt: new Date().toISOString(),
    ...sorted,
    totals: {
      outdated: outdated.length,
      eligible: sorted.low.length + sorted.medium.length + sorted.high.length,
      low: sorted.low.length,
      medium: sorted.medium.length,
      high: sorted.high.length,
      excludedPinned: sorted.excludedPinned.length,
      excludedBlocked: sorted.excludedBlocked.length
    }
  };
}

export function flattenSmartUpgradePlan(plan: SmartUpgradePlan): SmartUpgradePlanItem[] {
  return RISK_ORDER.flatMap((risk) => plan[risk]);
}

function toPlanItem(item: OutdatedPackage, classification: RiskClassification): SmartUpgradePlanItem {
  return {
    id: item.id,
    kind: item.kind,
    name: item.name,
    installedVersion: item.installedVersions.at(0) ?? 'unknown',
    currentVersion: item.currentVersion,
    risk: classification.risk,
    reason: classification.reason
  };
}

function classifyRisk(item: OutdatedPackage): RiskClassification {
  if (item.kind === 'cask') {
    return {
      risk: 'high',
      reason: 'Cask upgrades are treated as high risk for review.'
    };
  }

  const installed = item.installedVersions.at(0);
  const installedTuple = parseLeadingVersion(installed);
  const currentTuple = parseLeadingVersion(item.currentVersion);

  if (!installedTuple || !currentTuple) {
    return {
      risk: 'high',
      reason: 'Version delta could not be parsed automatically.'
    };
  }

  if (currentTuple.major > installedTuple.major) {
    return {
      risk: 'high',
      reason: 'Major version upgrade detected.'
    };
  }

  if (
    currentTuple.major === installedTuple.major
    && currentTuple.minor > installedTuple.minor
  ) {
    return {
      risk: 'medium',
      reason: 'Minor version upgrade detected.'
    };
  }

  if (
    currentTuple.major === installedTuple.major
    && currentTuple.minor === installedTuple.minor
    && currentTuple.patch > installedTuple.patch
  ) {
    if (item.installedVersions.length > 1) {
      return {
        risk: 'medium',
        reason: 'Multiple installed versions found; risk elevated for caution.'
      };
    }

    return {
      risk: 'low',
      reason: 'Patch version upgrade detected.'
    };
  }

  return {
    risk: 'medium',
    reason: 'Version change is ambiguous and requires review.'
  };
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

function sortPlanItems(items: SmartUpgradePlanItem[]): SmartUpgradePlanItem[] {
  return [...items].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === 'formula' ? -1 : 1;
    }

    return left.name.localeCompare(right.name);
  });
}
