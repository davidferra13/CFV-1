// Chef module - public API

// actions.ts - 'use server' (chef preferences)
export {
  getChefPreferences,
  getChefPrimaryNavHrefs,
  getMenuEngineFeatures,
  updateChefPreferences,
  getBusinessMode,
  setBusinessMode,
  getRegionalSettings,
} from './actions'
export type { UpdatePreferencesInput } from './actions'

export {
  requireCannabisInviteAccess,
  getCannabisHostAgreement,
  requireCannabisAgreementSigned,
} from './cannabis-access-guards'
export type { CannabisHostAgreementRecord } from './cannabis-access-guards'

// cannabis-actions.ts - 'use server'
export {
  hasCannabisAccess,
  getCannabisEvents,
  getCannabisEventDetails,
  upsertCannabisEventDetails,
  getCannabisLedger,
  sendCannabisInvite,
  getMySentCannabisInvites,
  getCannabisRSVPDashboardData,
  updateChefCannabisGuestProfile,
} from './cannabis-actions'

// cannabis-control-packet-actions.ts - 'use server'
export {
  getCannabisControlPacketData,
  upsertEventCannabisCourseConfig,
  generateCannabisControlPacketSnapshot,
  uploadControlPacketEvidence,
  deleteControlPacketEvidence,
  upsertControlPacketReconciliation,
  finalizeControlPacket,
} from './cannabis-control-packet-actions'

// cannabis-host-agreement-actions.ts - 'use server'
export { signCannabisHostAgreement } from './cannabis-host-agreement-actions'

// gratuity-actions.ts - 'use server'
export { getGratuitySettings, updateGratuitySettings } from './gratuity-actions'
export type { GratuitySettings } from './gratuity-actions'

export { computeChefHealthScore, CHEF_TIER_LABELS, CHEF_TIER_COLORS } from './health-score'
export type { ChefHealthTier, ChefHealthScore, ChefHealthInput } from './health-score'

export { CHEF_LAYOUT_CACHE_TAG, getChefLayoutData } from './layout-cache'
export type { ChefLayoutData } from './layout-cache'

export {
  getCachedChefPreferences,
  getCachedCannabisAccess,
  getCachedChefArchetype,
  getCachedDeletionStatus,
  getCachedIsAdmin,
  getCachedAnnouncement,
  getCachedIsPrivileged,
} from './layout-data-cache'
export type { CachedChefPrefs, CachedDeletionStatus, CachedAnnouncement } from './layout-data-cache'

// preferences-actions.ts - 'use server'
export { getWorkspaceDensity, setWorkspaceDensity } from './preferences-actions'

// profile-actions.ts - 'use server'
export {
  getChefFullProfile,
  updateChefFullProfile,
  updateRestaurantGroupName,
  getRestaurantGroupName,
  uploadChefLogo,
  removeChefLogo,
  markOnboardingComplete,
  getOnboardingStatus,
} from './profile-actions'
export type {
  ChefSocialLinks,
  UpdateChefFullProfileInput,
  ChefFullProfile,
} from './profile-actions'

// service-config-actions.ts - 'use server'
export {
  getServiceConfig,
  saveServiceConfig,
  formatServiceConfigForPrompt,
} from './service-config-actions'
export type { ChefServiceConfig } from './service-config-actions'

export { getServiceConfigForTenant } from './service-config-internal'

export {
  CHEF_SIDEBAR_COLLAPSED_STORAGE_KEY,
  CHEF_RECENT_PAGES_COLLAPSED_STORAGE_KEY,
  CHEF_ALL_FEATURES_COLLAPSED_STORAGE_KEY,
  CHEF_SHELL_RESET_EVENT,
  DEFAULT_CHEF_SIDEBAR_COLLAPSED,
  DEFAULT_CHEF_RECENT_PAGES_COLLAPSED,
  DEFAULT_CHEF_ALL_FEATURES_COLLAPSED,
  CHEF_SHELL_LOCAL_STORAGE_KEYS,
  readChefShellPresentationState,
  resetChefShellLocalState,
} from './shell-state'
export type { ChefShellPresentationState } from './shell-state'

// streaks.ts - 'use server'
export { getClosureStreak, recordClosureForStreak } from './streaks'
export type { ClosureStreakData } from './streaks'
