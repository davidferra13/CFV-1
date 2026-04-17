// Completion Contract - Core Types
// Shared types for the unified completion evaluation system.
// No 'use server' directive - these are pure type definitions.

export type CompletionStatus = 'incomplete' | 'partial' | 'complete'
export type EntityType = 'event' | 'client' | 'menu' | 'recipe' | 'ingredient'

export type RequirementCategory =
  | 'safety'
  | 'financial'
  | 'culinary'
  | 'logistics'
  | 'communication'
  | 'profile'

export interface CompletionRequirement {
  key: string
  label: string
  met: boolean
  blocking: boolean
  weight: number
  category: RequirementCategory
  actionUrl?: string
  actionLabel?: string
}

export interface CompletionResult {
  entityType: EntityType
  entityId: string
  entityLabel?: string
  status: CompletionStatus
  score: number
  requirements: CompletionRequirement[]
  missingRequirements: CompletionRequirement[]
  blockingRequirements: CompletionRequirement[]
  nextAction: { label: string; url: string } | null
  children?: CompletionResult[]
}

export function deriveStatus(score: number, blockingCount: number): CompletionStatus {
  if (score === 100 && blockingCount === 0) return 'complete'
  if (score > 0) return 'partial'
  return 'incomplete'
}

export function buildResult(
  entityType: EntityType,
  entityId: string,
  requirements: CompletionRequirement[],
  opts?: { entityLabel?: string; children?: CompletionResult[] }
): CompletionResult {
  const score = requirements.reduce((sum, r) => sum + (r.met ? r.weight : 0), 0)
  const missingRequirements = requirements.filter((r) => !r.met)
  const blockingRequirements = missingRequirements.filter((r) => r.blocking)

  const topMissing = missingRequirements
    .sort((a, b) => b.weight - a.weight)
    .find((r) => r.actionUrl)

  return {
    entityType,
    entityId,
    entityLabel: opts?.entityLabel,
    status: deriveStatus(score, blockingRequirements.length),
    score,
    requirements,
    missingRequirements,
    blockingRequirements,
    nextAction: topMissing
      ? { label: topMissing.actionLabel || topMissing.label, url: topMissing.actionUrl! }
      : null,
    children: opts?.children,
  }
}
