export const IPC_CHANNELS = {
  APP_OPEN_MAIN: 'app:openMain',
  GET_BREW_AVAILABILITY: 'brew:getAvailability',
  GET_INSTALLED: 'brew:getInstalled',
  GET_OUTDATED: 'brew:getOutdated',
  SEARCH_CATALOG: 'brew:searchCatalog',
  INSTALL_ONE: 'brew:installOne',
  UPGRADE_ONE: 'brew:upgradeOne',
  UPGRADE_ALL: 'brew:upgradeAll',
  CHECK_NOW: 'brew:checkNow',
  SYNC_METADATA: 'brew:syncMetadata',
  GET_SETTINGS: 'settings:get',
  UPDATE_SETTINGS: 'settings:update',
  EVENTS_UPDATES_CHANGED: 'updates:changed',
  EVENTS_JOB_PROGRESS: 'brew:job-progress',
  EVENTS_JOB_COMPLETE: 'brew:job-complete',
  EVENTS_JOB_FAILED: 'brew:job-failed'
} as const;
