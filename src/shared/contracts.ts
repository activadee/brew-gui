import { z } from 'zod';

export const packageKindSchema = z.enum(['formula', 'cask']);
export type PackageKind = z.infer<typeof packageKindSchema>;

export const packageReplacementSchema = z.object({
  kind: packageKindSchema,
  name: z.string().min(1)
});
export type PackageReplacement = z.infer<typeof packageReplacementSchema>;

export const installedPackageSchema = z.object({
  id: z.string(),
  kind: packageKindSchema,
  name: z.string(),
  desc: z.string().nullable(),
  installedVersion: z.string(),
  currentVersion: z.string().nullable(),
  pinned: z.boolean(),
  tap: z.string().nullable(),
  homepage: z.string().nullable(),
  deprecated: z.boolean(),
  disabled: z.boolean(),
  deprecationReason: z.string().nullable(),
  disableReason: z.string().nullable(),
  replacement: packageReplacementSchema.nullable()
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

export const smartUpgradeRiskLevelSchema = z.union([
  z.literal('low'),
  z.literal('medium'),
  z.literal('high')
]);
export type SmartUpgradeRiskLevel = z.infer<typeof smartUpgradeRiskLevelSchema>;

export const smartUpgradeBlockedPackageSchema = z.object({
  kind: packageKindSchema,
  name: z.string().min(1)
});
export type SmartUpgradeBlockedPackage = z.infer<typeof smartUpgradeBlockedPackageSchema>;

export const smartUpgradePlanItemSchema = z.object({
  id: z.string(),
  kind: packageKindSchema,
  name: z.string(),
  installedVersion: z.string(),
  currentVersion: z.string(),
  risk: smartUpgradeRiskLevelSchema,
  reason: z.string().min(1)
});
export type SmartUpgradePlanItem = z.infer<typeof smartUpgradePlanItemSchema>;

export const smartUpgradePlanSchema = z.object({
  generatedAt: z.string(),
  low: z.array(smartUpgradePlanItemSchema),
  medium: z.array(smartUpgradePlanItemSchema),
  high: z.array(smartUpgradePlanItemSchema),
  excludedPinned: z.array(smartUpgradePlanItemSchema),
  excludedBlocked: z.array(smartUpgradePlanItemSchema),
  totals: z.object({
    outdated: z.number().int().nonnegative(),
    eligible: z.number().int().nonnegative(),
    low: z.number().int().nonnegative(),
    medium: z.number().int().nonnegative(),
    high: z.number().int().nonnegative(),
    excludedPinned: z.number().int().nonnegative(),
    excludedBlocked: z.number().int().nonnegative()
  })
});
export type SmartUpgradePlan = z.infer<typeof smartUpgradePlanSchema>;

export const smartUpgradeRunRequestSchema = z.object({
  risks: z.array(smartUpgradeRiskLevelSchema).min(1)
});
export type SmartUpgradeRunRequest = z.infer<typeof smartUpgradeRunRequestSchema>;

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

const tapNamePattern = /^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;

export const tapNameSchema = z
  .string()
  .trim()
  .regex(tapNamePattern, 'tap name must match owner/repo');

export const brewTapSyncStateSchema = z.union([
  z.literal('upToDate'),
  z.literal('ahead'),
  z.literal('behind'),
  z.literal('diverged'),
  z.literal('noUpstream'),
  z.literal('unknown')
]);
export type BrewTapSyncState = z.infer<typeof brewTapSyncStateSchema>;

export const brewTapHealthSchema = z.union([
  z.literal('healthy'),
  z.literal('attention'),
  z.literal('error')
]);
export type BrewTapHealth = z.infer<typeof brewTapHealthSchema>;

export const brewTapSchema = z.object({
  name: z.string(),
  official: z.boolean(),
  protected: z.boolean(),
  userTapped: z.boolean(),
  path: z.string().nullable(),
  remote: z.string().nullable(),
  branch: z.string().nullable(),
  upstream: z.string().nullable(),
  ahead: z.number().int().nonnegative().nullable(),
  behind: z.number().int().nonnegative().nullable(),
  dirty: z.boolean(),
  syncState: brewTapSyncStateSchema,
  health: brewTapHealthSchema,
  lastCheckedAt: z.string(),
  warning: z.string().nullable()
});
export type BrewTap = z.infer<typeof brewTapSchema>;

export const getTapsResponseSchema = z.array(brewTapSchema);
export type GetTapsResponse = z.infer<typeof getTapsResponseSchema>;

export const brewServiceStatusSchema = z.union([
  z.literal('started'),
  z.literal('stopped'),
  z.literal('none'),
  z.literal('scheduled'),
  z.literal('error'),
  z.literal('unknown')
]);
export type BrewServiceStatus = z.infer<typeof brewServiceStatusSchema>;

export const brewServiceSchema = z.object({
  name: z.string(),
  status: brewServiceStatusSchema,
  user: z.string().nullable(),
  file: z.string().nullable(),
  exitCode: z.number().int().nullable()
});
export type BrewService = z.infer<typeof brewServiceSchema>;

export const getServicesResponseSchema = z.array(brewServiceSchema);
export type GetServicesResponse = z.infer<typeof getServicesResponseSchema>;

export const tapAddRequestSchema = z.object({
  name: tapNameSchema
});
export type TapAddRequest = z.infer<typeof tapAddRequestSchema>;

export const tapRemoveRequestSchema = z.object({
  name: tapNameSchema
});
export type TapRemoveRequest = z.infer<typeof tapRemoveRequestSchema>;

export const serviceRequestSchema = z.object({
  name: z.string().trim().min(1)
});
export type ServiceRequest = z.infer<typeof serviceRequestSchema>;

export const quietHoursTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'time must match HH:mm');

export const appSettingsSchema = z.object({
  checkIntervalMinutes: z.union([z.literal(60), z.literal(360), z.literal(1440)]),
  autoCheckOnLaunch: z.boolean(),
  trayNotifyOnUpdates: z.boolean(),
  smartUpgradeBlockedPackages: z.array(smartUpgradeBlockedPackageSchema),
  scheduledMetadataSyncEnabled: z.boolean(),
  scheduledCleanupEnabled: z.boolean(),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: quietHoursTimeSchema,
  quietHoursEnd: quietHoursTimeSchema,
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
  deprecationReason: z.string().nullable(),
  disableReason: z.string().nullable(),
  replacement: packageReplacementSchema.nullable(),
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

export const cleanupPreviewItemSchema = z.object({
  path: z.string(),
  sizeBytes: z.number().int().nonnegative().nullable(),
  fileCount: z.number().int().nonnegative().nullable(),
  metadata: z.string().nullable()
});
export type CleanupPreviewItem = z.infer<typeof cleanupPreviewItemSchema>;

export const cleanupPreviewResultSchema = z.object({
  command: z.string().min(1),
  items: z.array(cleanupPreviewItemSchema),
  totalBytes: z.number().int().nonnegative().nullable(),
  rawOutput: z.string(),
  generatedAt: z.string()
});
export type CleanupPreviewResult = z.infer<typeof cleanupPreviewResultSchema>;

export const brewDoctorSeveritySchema = z.union([
  z.literal('error'),
  z.literal('warning'),
  z.literal('info')
]);
export type BrewDoctorSeverity = z.infer<typeof brewDoctorSeveritySchema>;

export const brewDoctorFindingSchema = z.object({
  id: z.string().min(1),
  severity: brewDoctorSeveritySchema,
  title: z.string().min(1),
  details: z.array(z.string()),
  suggestedFix: z.string().nullable()
});
export type BrewDoctorFinding = z.infer<typeof brewDoctorFindingSchema>;

export const brewDoctorResultSchema = z.object({
  command: z.string().min(1),
  exitCode: z.number().int(),
  findings: z.array(brewDoctorFindingSchema),
  counts: z.object({
    error: z.number().int().nonnegative(),
    warning: z.number().int().nonnegative(),
    info: z.number().int().nonnegative()
  }),
  rawOutput: z.string(),
  generatedAt: z.string()
});
export type BrewDoctorResult = z.infer<typeof brewDoctorResultSchema>;

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
  z.literal('upgradeSmart'),
  z.literal('cleanup'),
  z.literal('doctor'),
  z.literal('pin'),
  z.literal('unpin'),
  z.literal('tapAdd'),
  z.literal('tapRemove'),
  z.literal('serviceStart'),
  z.literal('serviceStop'),
  z.literal('serviceRestart'),
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
  getTaps(): Promise<GetTapsResponse>;
  getServices(): Promise<GetServicesResponse>;
  getCleanupPreview(): Promise<CleanupPreviewResult>;
  runDoctor(): Promise<BrewDoctorResult>;
  getPackageDetails(request: PackageDetailsRequest): Promise<PackageDetails>;
  searchCatalog(request: SearchCatalogRequest): Promise<SearchCatalogResponse>;
  installOne(request: InstallOneRequest): Promise<BrewJobCompleteEvent>;
  reinstallOne(request: ReinstallOneRequest): Promise<BrewJobCompleteEvent>;
  uninstallOne(request: UninstallOneRequest): Promise<BrewJobCompleteEvent>;
  pinOne(request: PinOneRequest): Promise<BrewJobCompleteEvent>;
  unpinOne(request: UnpinOneRequest): Promise<BrewJobCompleteEvent>;
  tapAdd(request: TapAddRequest): Promise<BrewJobCompleteEvent>;
  tapRemove(request: TapRemoveRequest): Promise<BrewJobCompleteEvent>;
  serviceStart(request: ServiceRequest): Promise<BrewJobCompleteEvent>;
  serviceStop(request: ServiceRequest): Promise<BrewJobCompleteEvent>;
  serviceRestart(request: ServiceRequest): Promise<BrewJobCompleteEvent>;
  upgradeOne(request: UpgradeOneRequest): Promise<BrewJobCompleteEvent>;
  upgradeAll(): Promise<BrewJobCompleteEvent>;
  getSmartUpgradePlan(): Promise<SmartUpgradePlan>;
  upgradeSmart(request: SmartUpgradeRunRequest): Promise<BrewJobCompleteEvent>;
  runCleanup(): Promise<BrewJobCompleteEvent>;
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
  smartUpgradeBlockedPackages: [],
  scheduledMetadataSyncEnabled: true,
  scheduledCleanupEnabled: false,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
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
