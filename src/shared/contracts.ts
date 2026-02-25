import { z } from 'zod';

export const packageKindSchema = z.enum(['formula', 'cask']);
export type PackageKind = z.infer<typeof packageKindSchema>;

export const installedPackageSchema = z.object({
  id: z.string(),
  kind: packageKindSchema,
  name: z.string(),
  desc: z.string().nullable(),
  installedVersion: z.string(),
  currentVersion: z.string().nullable(),
  pinned: z.boolean(),
  tap: z.string().nullable(),
  homepage: z.string().nullable()
});
export type InstalledPackage = z.infer<typeof installedPackageSchema>;

export const outdatedPackageSchema = z.object({
  id: z.string(),
  kind: packageKindSchema,
  name: z.string(),
  installedVersions: z.array(z.string()),
  currentVersion: z.string(),
  pinned: z.boolean()
});
export type OutdatedPackage = z.infer<typeof outdatedPackageSchema>;

export const catalogPackageSchema = z.object({
  id: z.string(),
  kind: packageKindSchema,
  name: z.string(),
  fullName: z.string(),
  desc: z.string().nullable(),
  version: z.string().nullable(),
  homepage: z.string().nullable(),
  tap: z.string(),
  deprecated: z.boolean(),
  disabled: z.boolean()
});
export type CatalogPackage = z.infer<typeof catalogPackageSchema>;

export const appSettingsSchema = z.object({
  checkIntervalMinutes: z.union([z.literal(60), z.literal(360), z.literal(1440)]),
  autoCheckOnLaunch: z.boolean(),
  trayNotifyOnUpdates: z.boolean(),
  defaultView: z.union([z.literal('updates'), z.literal('installed'), z.literal('browse')])
});
export type AppSettings = z.infer<typeof appSettingsSchema>;

export const appSettingsUpdateSchema = appSettingsSchema.partial();
export type AppSettingsUpdate = z.infer<typeof appSettingsUpdateSchema>;

export const searchCatalogRequestSchema = z.object({
  query: z.string().trim().default(''),
  kinds: z.array(packageKindSchema).default(['formula', 'cask']),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(10).max(200).default(50),
  refresh: z.boolean().default(false)
});
export type SearchCatalogRequest = z.infer<typeof searchCatalogRequestSchema>;

export const searchCatalogResponseSchema = z.object({
  items: z.array(catalogPackageSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  stale: z.boolean(),
  source: z.union([z.literal('network'), z.literal('cache')]),
  lastUpdatedAt: z.string().nullable()
});
export type SearchCatalogResponse = z.infer<typeof searchCatalogResponseSchema>;

export const packageDetailsRequestSchema = z.object({
  kind: packageKindSchema,
  name: z.string().min(1)
});
export type PackageDetailsRequest = z.infer<typeof packageDetailsRequestSchema>;

export const packageDependencyGroupKeySchema = z.union([
  z.literal('runtime'),
  z.literal('build'),
  z.literal('recommended'),
  z.literal('optional'),
  z.literal('requirements'),
  z.literal('constraints')
]);
export type PackageDependencyGroupKey = z.infer<typeof packageDependencyGroupKeySchema>;

export const packageDependencyGroupSchema = z.object({
  key: packageDependencyGroupKeySchema,
  label: z.string(),
  items: z.array(z.string())
});
export type PackageDependencyGroup = z.infer<typeof packageDependencyGroupSchema>;

export const packageVersionSnapshotSchema = z.object({
  installedVersions: z.array(z.string()),
  currentVersion: z.string().nullable(),
  stableVersion: z.string().nullable(),
  headVersion: z.string().nullable()
});
export type PackageVersionSnapshot = z.infer<typeof packageVersionSnapshotSchema>;

export const packageDetailsSourceSchema = z.union([
  z.literal('local'),
  z.literal('remote'),
  z.literal('hybrid'),
  z.literal('cache')
]);
export type PackageDetailsSource = z.infer<typeof packageDetailsSourceSchema>;

export const packageDetailsSchema = z.object({
  id: z.string(),
  kind: packageKindSchema,
  name: z.string(),
  fullName: z.string(),
  desc: z.string().nullable(),
  homepage: z.string().nullable(),
  tap: z.string().nullable(),
  license: z.string().nullable(),
  dependencies: z.array(packageDependencyGroupSchema),
  caveats: z.string().nullable(),
  versionSnapshot: packageVersionSnapshotSchema,
  deprecated: z.boolean(),
  disabled: z.boolean(),
  pinned: z.boolean(),
  warnings: z.array(z.string()),
  source: packageDetailsSourceSchema,
  fetchedAt: z.string()
});
export type PackageDetails = z.infer<typeof packageDetailsSchema>;

export const upgradeOneRequestSchema = z.object({
  kind: packageKindSchema,
  name: z.string().min(1)
});
export type UpgradeOneRequest = z.infer<typeof upgradeOneRequestSchema>;

export const installOneRequestSchema = z.object({
  kind: packageKindSchema,
  name: z.string().min(1)
});
export type InstallOneRequest = z.infer<typeof installOneRequestSchema>;

export const reinstallOneRequestSchema = z
  .object({
    kind: packageKindSchema,
    name: z.string().min(1),
    zap: z.boolean().optional()
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'formula' && value.zap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'zap is only supported for cask reinstall requests',
        path: ['zap']
      });
    }
  });
export type ReinstallOneRequest = z.infer<typeof reinstallOneRequestSchema>;

export const uninstallOneRequestSchema = z
  .object({
    kind: packageKindSchema,
    name: z.string().min(1),
    zap: z.boolean().optional()
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'formula' && value.zap) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'zap is only supported for cask uninstall requests',
        path: ['zap']
      });
    }
  });
export type UninstallOneRequest = z.infer<typeof uninstallOneRequestSchema>;

const formulaRequestKindSchema = z.literal('formula');

export const pinOneRequestSchema = z.object({
  kind: formulaRequestKindSchema,
  name: z.string().min(1)
});
export type PinOneRequest = z.infer<typeof pinOneRequestSchema>;

export const unpinOneRequestSchema = z.object({
  kind: formulaRequestKindSchema,
  name: z.string().min(1)
});
export type UnpinOneRequest = z.infer<typeof unpinOneRequestSchema>;

export const checkNowResultSchema = z.object({
  count: z.number().int().nonnegative(),
  checkedAt: z.string()
});
export type CheckNowResult = z.infer<typeof checkNowResultSchema>;

export const syncMetadataResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
  syncedAt: z.string()
});
export type SyncMetadataResult = z.infer<typeof syncMetadataResultSchema>;

export const brewAvailabilitySchema = z.object({
  available: z.boolean(),
  path: z.string().nullable(),
  version: z.string().nullable(),
  checkedAt: z.string()
});
export type BrewAvailability = z.infer<typeof brewAvailabilitySchema>;

export const windowControlActionSchema = z.union([
  z.literal('close'),
  z.literal('minimize'),
  z.literal('toggleZoom'),
  z.literal('toggleFullScreen')
]);
export type WindowControlAction = z.infer<typeof windowControlActionSchema>;

export const windowPlatformSchema = z.union([
  z.literal('darwin'),
  z.literal('win32'),
  z.literal('linux'),
  z.literal('unknown')
]);
export type WindowPlatform = z.infer<typeof windowPlatformSchema>;

export const windowChromeStateSchema = z.object({
  platform: windowPlatformSchema,
  isFocused: z.boolean(),
  isMaximized: z.boolean(),
  isFullScreen: z.boolean(),
  canClose: z.boolean(),
  canMinimize: z.boolean(),
  canZoom: z.boolean(),
  canFullScreen: z.boolean()
});
export type WindowChromeState = z.infer<typeof windowChromeStateSchema>;

export const windowChromeChangedEventSchema = windowChromeStateSchema;
export type WindowChromeChangedEvent = z.infer<typeof windowChromeChangedEventSchema>;

export const updatesChangedEventSchema = z.object({
  count: z.number().int().nonnegative(),
  checkedAt: z.string()
});
export type UpdatesChangedEvent = z.infer<typeof updatesChangedEventSchema>;

export const brewJobActionSchema = z.union([
  z.literal('install'),
  z.literal('uninstall'),
  z.literal('reinstall'),
  z.literal('upgradeOne'),
  z.literal('upgradeAll'),
  z.literal('pin'),
  z.literal('unpin'),
  z.literal('syncMetadata')
]);
export type BrewJobAction = z.infer<typeof brewJobActionSchema>;

export const brewJobKindSchema = z.union([
  packageKindSchema,
  z.literal('system')
]);
export type BrewJobKind = z.infer<typeof brewJobKindSchema>;

export const brewJobStreamSchema = z.union([
  z.literal('stdout'),
  z.literal('stderr'),
  z.literal('system')
]);
export type BrewJobStream = z.infer<typeof brewJobStreamSchema>;

export const brewJobStageSchema = z.union([
  z.literal('queued'),
  z.literal('running'),
  z.literal('output'),
  z.literal('completed'),
  z.literal('failed')
]);
export type BrewJobStage = z.infer<typeof brewJobStageSchema>;

export const brewJobProgressEventSchema = z.object({
  jobId: z.string(),
  action: brewJobActionSchema,
  command: z.string().min(1),
  stage: brewJobStageSchema,
  stream: brewJobStreamSchema,
  message: z.string(),
  packageName: z.string().nullable(),
  kind: brewJobKindSchema,
  timestamp: z.string()
});
export type BrewJobProgressEvent = z.infer<typeof brewJobProgressEventSchema>;

export const brewJobCompleteEventSchema = z.object({
  jobId: z.string(),
  action: brewJobActionSchema,
  command: z.string().min(1),
  kind: brewJobKindSchema,
  packageName: z.string().nullable(),
  success: z.boolean(),
  exitCode: z.number().int(),
  durationMs: z.number().int().nonnegative(),
  output: z.string(),
  timestamp: z.string()
});
export type BrewJobCompleteEvent = z.infer<typeof brewJobCompleteEventSchema>;

export const brewJobFailedEventSchema = z.object({
  jobId: z.string(),
  action: brewJobActionSchema,
  command: z.string().min(1),
  kind: brewJobKindSchema,
  packageName: z.string().nullable(),
  exitCode: z.number().int(),
  durationMs: z.number().int().nonnegative(),
  error: z.string(),
  output: z.string(),
  timestamp: z.string()
});
export type BrewJobFailedEvent = z.infer<typeof brewJobFailedEventSchema>;

export interface BrewGuiBridge {
  openMainWindow(): Promise<void>;
  windowControl(action: WindowControlAction): Promise<void>;
  getWindowChromeState(): Promise<WindowChromeState>;
  getBrewAvailability(): Promise<BrewAvailability>;
  getInstalled(): Promise<InstalledPackage[]>;
  getOutdated(): Promise<OutdatedPackage[]>;
  getPackageDetails(request: PackageDetailsRequest): Promise<PackageDetails>;
  searchCatalog(request: SearchCatalogRequest): Promise<SearchCatalogResponse>;
  installOne(request: InstallOneRequest): Promise<BrewJobCompleteEvent>;
  reinstallOne(request: ReinstallOneRequest): Promise<BrewJobCompleteEvent>;
  uninstallOne(request: UninstallOneRequest): Promise<BrewJobCompleteEvent>;
  pinOne(request: PinOneRequest): Promise<BrewJobCompleteEvent>;
  unpinOne(request: UnpinOneRequest): Promise<BrewJobCompleteEvent>;
  upgradeOne(request: UpgradeOneRequest): Promise<BrewJobCompleteEvent>;
  upgradeAll(): Promise<BrewJobCompleteEvent>;
  checkNow(): Promise<CheckNowResult>;
  syncMetadata(): Promise<SyncMetadataResult>;
  getSettings(): Promise<AppSettings>;
  updateSettings(update: AppSettingsUpdate): Promise<AppSettings>;
  onUpdatesChanged(handler: (event: UpdatesChangedEvent) => void): () => void;
  onWindowChromeChanged(handler: (event: WindowChromeChangedEvent) => void): () => void;
  onJobProgress(handler: (event: BrewJobProgressEvent) => void): () => void;
  onJobComplete(handler: (event: BrewJobCompleteEvent) => void): () => void;
  onJobFailed(handler: (event: BrewJobFailedEvent) => void): () => void;
}

export const DEFAULT_SETTINGS: AppSettings = {
  checkIntervalMinutes: 360,
  autoCheckOnLaunch: true,
  trayNotifyOnUpdates: true,
  defaultView: 'updates'
};

export const DEFAULT_WINDOW_CHROME_STATE: WindowChromeState = {
  platform: 'unknown',
  isFocused: true,
  isMaximized: false,
  isFullScreen: false,
  canClose: false,
  canMinimize: false,
  canZoom: false,
  canFullScreen: false
};
