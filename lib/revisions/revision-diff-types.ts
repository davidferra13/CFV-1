// Revision Comparison Types
// Types for revision tracking and comparison across menus, quotes, events, recipes, and contracts.

export type RevisionEntityType = 'menu' | 'quote' | 'event' | 'recipe' | 'contract'

export type RevisionEntry = {
  id: string
  tenantId: string
  entityType: RevisionEntityType
  entityId: string
  version: number
  snapshot: Record<string, unknown>
  changedBy: string
  changedByName: string | null
  changedAt: string
  changeNote: string | null
}

export type FieldDiff = {
  field: string
  oldValue: unknown
  newValue: unknown
  diffType: 'added' | 'removed' | 'modified' | 'unchanged'
}

export type RevisionComparison = {
  entityType: RevisionEntityType
  entityId: string
  fromVersion: number
  toVersion: number
  diffs: FieldDiff[]
  fromSnapshot: Record<string, unknown>
  toSnapshot: Record<string, unknown>
  comparedAt: string
}

export type RevisionSummary = {
  entityType: RevisionEntityType
  entityId: string
  totalVersions: number
  latestVersion: number
  lastChangedBy: string | null
  lastChangedAt: string | null
}

export type RevisionTimeline = {
  entries: RevisionEntry[]
  entityType: RevisionEntityType
  entityId: string
}
