import type {
  CatalogPackage,
  InstalledPackage,
  OutdatedPackage,
  PackageKind
} from '../../src/shared/contracts';

const byName = <T extends { name: string }>(a: T, b: T): number => a.name.localeCompare(b.name);

const packageId = (kind: PackageKind, name: string): string => `${kind}:${name}`;

export interface BrewInfoResponse {
  formulae?: unknown[];
  casks?: unknown[];
}

export interface BrewOutdatedResponse {
  formulae?: unknown[];
  casks?: unknown[];
}

export function normalizeInstalled(raw: BrewInfoResponse): InstalledPackage[] {
  const formulae = Array.isArray(raw.formulae) ? raw.formulae : [];
  const casks = Array.isArray(raw.casks) ? raw.casks : [];

  const normalizedFormulae: InstalledPackage[] = formulae
    .map((item) => normalizeInstalledFormula(item))
    .filter((item): item is InstalledPackage => item !== null);

  const normalizedCasks: InstalledPackage[] = casks
    .map((item) => normalizeInstalledCask(item))
    .filter((item): item is InstalledPackage => item !== null);

  return [...normalizedFormulae, ...normalizedCasks].sort(byName);
}

export function normalizeOutdated(raw: BrewOutdatedResponse): OutdatedPackage[] {
  const formulae = Array.isArray(raw.formulae) ? raw.formulae : [];
  const casks = Array.isArray(raw.casks) ? raw.casks : [];

  const formulaOutdated = formulae
    .map((item) => normalizeOutdatedFormula(item))
    .filter((item): item is OutdatedPackage => item !== null);

  const caskOutdated = casks
    .map((item) => normalizeOutdatedCask(item))
    .filter((item): item is OutdatedPackage => item !== null);

  return [...formulaOutdated, ...caskOutdated].sort(byName);
}

export function normalizeCatalog(formulaCatalog: unknown[], caskCatalog: unknown[]): CatalogPackage[] {
  const formulae = formulaCatalog
    .map((item) => normalizeFormulaCatalogItem(item))
    .filter((item): item is CatalogPackage => item !== null);

  const casks = caskCatalog
    .map((item) => normalizeCaskCatalogItem(item))
    .filter((item): item is CatalogPackage => item !== null);

  return [...formulae, ...casks].sort(byName);
}

function normalizeInstalledFormula(raw: unknown): InstalledPackage | null {
  if (!isObject(raw) || typeof raw.name !== 'string') {
    return null;
  }

  const installed = Array.isArray(raw.installed) ? raw.installed : [];
  const firstInstalled = installed.at(0);

  const installedVersion =
    (isObject(firstInstalled) && typeof firstInstalled.version === 'string' && firstInstalled.version) ||
    (isObject(raw.versions) && typeof raw.versions.stable === 'string' && raw.versions.stable) ||
    'unknown';

  const currentVersion =
    (isObject(raw.versions) && typeof raw.versions.stable === 'string' && raw.versions.stable) || null;

  return {
    id: packageId('formula', raw.name),
    kind: 'formula',
    name: raw.name,
    desc: typeof raw.desc === 'string' ? raw.desc : null,
    installedVersion,
    currentVersion,
    pinned: Boolean(raw.pinned),
    tap: typeof raw.tap === 'string' ? raw.tap : null,
    homepage: typeof raw.homepage === 'string' ? raw.homepage : null
  };
}

function normalizeInstalledCask(raw: unknown): InstalledPackage | null {
  if (!isObject(raw)) {
    return null;
  }

  const name =
    typeof raw.token === 'string'
      ? raw.token
      : typeof raw.full_token === 'string'
        ? raw.full_token
        : null;

  if (!name) {
    return null;
  }

  const installedVersion = getInstalledCaskVersion(raw);
  const currentVersion = typeof raw.version === 'string' ? raw.version : null;

  return {
    id: packageId('cask', name),
    kind: 'cask',
    name,
    desc: typeof raw.desc === 'string' ? raw.desc : null,
    installedVersion,
    currentVersion,
    pinned: false,
    tap: typeof raw.tap === 'string' ? raw.tap : 'homebrew/cask',
    homepage: typeof raw.homepage === 'string' ? raw.homepage : null
  };
}

function normalizeOutdatedFormula(raw: unknown): OutdatedPackage | null {
  if (!isObject(raw) || typeof raw.name !== 'string') {
    return null;
  }

  const installedVersions = Array.isArray(raw.installed_versions)
    ? raw.installed_versions.filter((item): item is string => typeof item === 'string')
    : [];

  if (typeof raw.current_version !== 'string') {
    return null;
  }

  return {
    id: packageId('formula', raw.name),
    kind: 'formula',
    name: raw.name,
    installedVersions,
    currentVersion: raw.current_version,
    pinned: Boolean(raw.pinned)
  };
}

function normalizeOutdatedCask(raw: unknown): OutdatedPackage | null {
  if (!isObject(raw)) {
    return null;
  }

  const name =
    typeof raw.name === 'string'
      ? raw.name
      : typeof raw.token === 'string'
        ? raw.token
        : typeof raw.full_token === 'string'
          ? raw.full_token
          : null;

  if (!name || typeof raw.current_version !== 'string') {
    return null;
  }

  const installedVersions = Array.isArray(raw.installed_versions)
    ? raw.installed_versions.filter((item): item is string => typeof item === 'string')
    : typeof raw.installed_versions === 'string'
      ? [raw.installed_versions]
      : [];

  return {
    id: packageId('cask', name),
    kind: 'cask',
    name,
    installedVersions,
    currentVersion: raw.current_version,
    pinned: false
  };
}

function normalizeFormulaCatalogItem(raw: unknown): CatalogPackage | null {
  if (!isObject(raw) || typeof raw.name !== 'string') {
    return null;
  }

  const fullName = typeof raw.full_name === 'string' ? raw.full_name : raw.name;

  return {
    id: packageId('formula', raw.name),
    kind: 'formula',
    name: raw.name,
    fullName,
    desc: typeof raw.desc === 'string' ? raw.desc : null,
    version:
      isObject(raw.versions) && typeof raw.versions.stable === 'string' ? raw.versions.stable : null,
    homepage: typeof raw.homepage === 'string' ? raw.homepage : null,
    tap: typeof raw.tap === 'string' ? raw.tap : 'homebrew/core',
    deprecated: Boolean(raw.deprecated),
    disabled: Boolean(raw.disabled)
  };
}

function normalizeCaskCatalogItem(raw: unknown): CatalogPackage | null {
  if (!isObject(raw)) {
    return null;
  }

  const name = typeof raw.token === 'string' ? raw.token : null;
  if (!name) {
    return null;
  }

  const fullName = typeof raw.full_token === 'string' ? raw.full_token : name;

  return {
    id: packageId('cask', name),
    kind: 'cask',
    name,
    fullName,
    desc: typeof raw.desc === 'string' ? raw.desc : null,
    version: typeof raw.version === 'string' ? raw.version : null,
    homepage: typeof raw.homepage === 'string' ? raw.homepage : null,
    tap: typeof raw.tap === 'string' ? raw.tap : 'homebrew/cask',
    deprecated: Boolean(raw.deprecated),
    disabled: Boolean(raw.disabled)
  };
}

function getInstalledCaskVersion(raw: Record<string, unknown>): string {
  if (Array.isArray(raw.installed) && typeof raw.installed[0] === 'string') {
    return raw.installed[0];
  }

  if (typeof raw.installed === 'string') {
    return raw.installed;
  }

  if (typeof raw.version === 'string') {
    return raw.version;
  }

  return 'unknown';
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null;
}
