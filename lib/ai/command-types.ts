// Ask Remy — Shared Types
// No 'use server' — safe to import from any context (client, server, tests)

export type ApprovalTier = 1 | 2 | 3

export type TaskStatus =
  | 'pending' // tier 2 — draft ready, awaiting chef approval
  | 'running'
  | 'done' // tier 1 — completed automatically
  | 'held' // tier 3 — parked, awaiting clarification
  | 'error' // execution failed
  | 'approved' // chef approved a tier 2 draft
  | 'rejected' // chef dismissed this result

export interface PlannedTask {
  /** Unique ID within this run (e.g. "t1", "t2") */
  id: string
  /** Matches a key in the task registry */
  taskType: string
  tier: ApprovalTier
  confidence: number // 0–1
  inputs: Record<string, unknown>
  dependsOn: string[] // IDs of tasks that must complete first
  holdReason?: string // tier 3: why this is held
}

export interface CommandPlan {
  rawInput: string
  overallConfidence: number
  tasks: PlannedTask[]
}

export interface TaskResult {
  taskId: string
  taskType: string
  tier: ApprovalTier
  name: string
  status: TaskStatus
  /** tier 1: result data to display; tier 2: draft content for review */
  data?: unknown
  error?: string
  /** tier 3: explanation of what needs clarification */
  holdReason?: string
  /** tier 3: disambiguation options (e.g. multiple matching clients) */
  alternatives?: Array<{ label: string; value: string }>
}

export interface CommandRun {
  runId: string
  rawInput: string
  startedAt: string
  results: TaskResult[]
  ollamaOffline?: boolean
}
