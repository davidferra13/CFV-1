export const WORK_CONTINUITY_CATEGORIES = [
  'abandoned_work',
  'built_unverified',
  'buried_decision',
  'overlap',
  'forgotten_leverage',
  'openclaw_gap',
  'release_gap',
  'handoff_drift',
] as const

export const WORK_CONTINUITY_LANES = [
  'website-owned',
  'runtime-owned',
  'host-owned',
  'bridge-owned',
  'docs-owned',
] as const

export const WORK_CONTINUITY_STATUSES = [
  'ready_spec',
  'built_unverified',
  'verified',
  'blocked',
  'stale',
  'research_backed_unspecced',
  'needs_triage',
] as const

export type WorkContinuityCategory = (typeof WORK_CONTINUITY_CATEGORIES)[number]

export type WorkContinuityLane = (typeof WORK_CONTINUITY_LANES)[number]

export type WorkContinuityStatus = (typeof WORK_CONTINUITY_STATUSES)[number]

export type WorkContinuitySourcePath = {
  path: string
  line?: number
  label?: string
}

export type WorkContinuityItem = {
  id: string
  title: string
  category: WorkContinuityCategory
  lane: WorkContinuityLane
  status: WorkContinuityStatus
  sourcePaths: WorkContinuitySourcePath[]
  sourceConversation?: WorkContinuitySourcePath
  canonicalDecision?: string
  contradiction?: string
  nextAction: string
  lastSeen?: string
}

export type WorkContinuityWarning = {
  path: string
  message: string
}

export type WorkContinuityCounts = {
  category: Record<WorkContinuityCategory, number>
  lane: Record<WorkContinuityLane, number>
  status: Record<WorkContinuityStatus, number>
}

export type WorkContinuityIndex = {
  schemaVersion: 1
  sourcePaths: string[]
  warnings: WorkContinuityWarning[]
  counts: WorkContinuityCounts
  startHere: Pick<WorkContinuityItem, 'id' | 'title' | 'nextAction'>
  items: WorkContinuityItem[]
}

export type LoadedContinuitySource = {
  path: string
  text: string
  lines: string[]
}
