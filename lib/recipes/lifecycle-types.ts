// Recipe Lifecycle Types
// Canonical type definitions for recipe status, transitions, and history.
// Used by lifecycle-actions.ts, gap-tracking.ts, and UI components.

/**
 * Every recipe lives in exactly one of these states.
 * stub: placeholder created from menu context, name only
 * draft: work in progress, chef is building it
 * active: complete and ready for use in menus
 * archived: preserved but no longer actively used
 * retired: permanently retired, kept for historical lineage only
 */
export type RecipeLifecycleStatus = 'stub' | 'draft' | 'active' | 'archived' | 'retired'

/**
 * A single allowed transition between lifecycle states.
 * from/to define the edge; label is a human-readable description.
 */
export type RecipeLifecycleTransition = {
  from: RecipeLifecycleStatus
  to: RecipeLifecycleStatus
  label: string
}

/**
 * A recorded lifecycle transition event (audit trail).
 * Stored in the recipe_lifecycle_history table.
 */
export type RecipeLifecycleHistory = {
  id: string
  recipeId: string
  fromStatus: RecipeLifecycleStatus
  toStatus: RecipeLifecycleStatus
  changedBy: string
  changedByName: string | null
  reason: string | null
  createdAt: string
}

/**
 * Full map of allowed transitions. Each status maps to valid target statuses.
 * stub -> draft (fill in the placeholder)
 * draft -> active, archived (ready for use or shelve it)
 * active -> archived (stop using it)
 * archived -> active, retired (restore or permanently retire)
 */
export const LIFECYCLE_TRANSITIONS: Record<RecipeLifecycleStatus, RecipeLifecycleStatus[]> = {
  stub: ['draft'],
  draft: ['active', 'archived'],
  active: ['archived'],
  archived: ['active', 'retired'],
  retired: [],
}

/**
 * Human-readable labels for each status.
 */
export const LIFECYCLE_STATUS_LABELS: Record<RecipeLifecycleStatus, string> = {
  stub: 'Stub',
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
  retired: 'Retired',
}

/**
 * All valid transitions as a flat list, useful for UI rendering.
 */
export const ALL_LIFECYCLE_TRANSITIONS: RecipeLifecycleTransition[] = [
  { from: 'stub', to: 'draft', label: 'Fill in details' },
  { from: 'draft', to: 'active', label: 'Mark as ready' },
  { from: 'draft', to: 'archived', label: 'Archive draft' },
  { from: 'active', to: 'archived', label: 'Archive recipe' },
  { from: 'archived', to: 'active', label: 'Restore recipe' },
  { from: 'archived', to: 'retired', label: 'Retire permanently' },
]
