/**
 * Types for guided settings completeness, checklist, and go-live readiness.
 * Reads from existing chefs, chef_profiles, chef_preferences,
 * and integration_connections tables. No new schema.
 */

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export type SettingsCategoryId =
  | 'daily_workflow'
  | 'your_business'
  | 'client_facing'
  | 'integrations'
  | 'ai_and_system'

export interface SettingsCategory {
  id: SettingsCategoryId
  label: string
  description: string
  /** Ordered list of items the chef should configure in this category */
  items: SettingItem[]
}

// ---------------------------------------------------------------------------
// Individual setting item
// ---------------------------------------------------------------------------

export type SettingStatus = 'set' | 'unset' | 'default'

export interface SettingItem {
  /** Stable key for this check, e.g. "business_name" */
  key: string
  /** Human label shown in checklist */
  label: string
  /** One-line guidance for the chef */
  hint: string
  /** Current status */
  status: SettingStatus
  /** Deep link into the settings page that owns this field */
  href: string
  /** Category this item belongs to */
  categoryId: SettingsCategoryId
  /**
   * Priority weight (higher = more important for go-live).
   * Used for "next setting to complete" ordering.
   */
  priority: number
}

// ---------------------------------------------------------------------------
// Completeness roll-up
// ---------------------------------------------------------------------------

export interface SettingsCompleteness {
  /** Number of items with status "set" */
  configured: number
  /** Total items tracked */
  total: number
  /** 0-100 percentage */
  percent: number
  /** Per-category breakdown */
  byCategory: {
    categoryId: SettingsCategoryId
    label: string
    configured: number
    total: number
    percent: number
  }[]
}

// ---------------------------------------------------------------------------
// Go-live readiness
// ---------------------------------------------------------------------------

export interface GoLiveBlocker {
  key: string
  label: string
  hint: string
  href: string
}

export interface GoLiveReadiness {
  /** True when every required blocker is resolved */
  ready: boolean
  /** Items that must be configured before accepting bookings */
  blockers: GoLiveBlocker[]
  /** Items that are recommended but not strictly required */
  warnings: GoLiveBlocker[]
}
