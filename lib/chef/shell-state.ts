import { DEFAULT_PALETTE_ID, PALETTE_STORAGE_KEY } from '@/lib/themes/color-palettes'

export const CHEF_SIDEBAR_COLLAPSED_STORAGE_KEY = 'chef-sidebar-collapsed'
export const CHEF_RECENT_PAGES_COLLAPSED_STORAGE_KEY = 'cf:recent-collapsed'
export const CHEF_ALL_FEATURES_COLLAPSED_STORAGE_KEY = 'chef-all-features-collapsed'
export const CHEF_SHELL_RESET_EVENT = 'chef-shell-state-reset'

export const DEFAULT_CHEF_SIDEBAR_COLLAPSED = false
export const DEFAULT_CHEF_RECENT_PAGES_COLLAPSED = false
export const DEFAULT_CHEF_ALL_FEATURES_COLLAPSED = true

export const CHEF_SHELL_LOCAL_STORAGE_KEYS = [
  CHEF_SIDEBAR_COLLAPSED_STORAGE_KEY,
  PALETTE_STORAGE_KEY,
  CHEF_RECENT_PAGES_COLLAPSED_STORAGE_KEY,
  CHEF_ALL_FEATURES_COLLAPSED_STORAGE_KEY,
] as const

type StorageReader = {
  getItem(key: string): string | null
}

type StorageRemover = {
  removeItem(key: string): void
}

export type ChefShellPresentationState = {
  sidebarCollapsed: boolean
  paletteId: string
  recentPagesCollapsed: boolean
  allFeaturesCollapsed: boolean
}

function safeGetItem(storage: StorageReader, key: string): string | null {
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function readStoredBoolean(raw: string | null, defaultValue: boolean): boolean {
  if (raw === null) return defaultValue
  return raw === 'true'
}

export function readChefShellPresentationState(storage: StorageReader): ChefShellPresentationState {
  return {
    sidebarCollapsed: readStoredBoolean(
      safeGetItem(storage, CHEF_SIDEBAR_COLLAPSED_STORAGE_KEY),
      DEFAULT_CHEF_SIDEBAR_COLLAPSED
    ),
    paletteId: safeGetItem(storage, PALETTE_STORAGE_KEY) || DEFAULT_PALETTE_ID,
    recentPagesCollapsed: readStoredBoolean(
      safeGetItem(storage, CHEF_RECENT_PAGES_COLLAPSED_STORAGE_KEY),
      DEFAULT_CHEF_RECENT_PAGES_COLLAPSED
    ),
    allFeaturesCollapsed: readStoredBoolean(
      safeGetItem(storage, CHEF_ALL_FEATURES_COLLAPSED_STORAGE_KEY),
      DEFAULT_CHEF_ALL_FEATURES_COLLAPSED
    ),
  }
}

export function resetChefShellLocalState(storage: StorageRemover) {
  for (const key of CHEF_SHELL_LOCAL_STORAGE_KEYS) {
    try {
      storage.removeItem(key)
    } catch {
      // ignore localStorage failures during best-effort reset
    }
  }
}
