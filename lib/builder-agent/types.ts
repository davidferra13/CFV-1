export type MemorySourceType =
  | 'policy'
  | 'durable_memory'
  | 'spec'
  | 'research'
  | 'session_log'
  | 'prompt_asset'
  | 'working_memory'

export type TaskRunMode = 'dry-run' | 'live' | 'maintenance'

export type TaskRunStatus = 'planned' | 'running' | 'blocked' | 'completed' | 'failed'

export type RiskKind =
  | 'loop'
  | 'privacy'
  | 'release_hygiene'
  | 'destructive_action'
  | 'missing_context'

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical'

export type LoopState = {
  tripped: boolean
  threshold: number
  repeatedAction?: string
  failureCount: number
  message?: string
}

export type MemoryRecord = {
  id: string
  sourcePath: string
  sourceType: MemorySourceType
  title: string
  summary: string
  tags: string[]
  fingerprint: string
  updatedAt: string
  precedence: number
}

export type MemoryConflict = {
  id: string
  keptSourcePath: string
  ignoredSourcePath: string
  reason: string
}

export type MemoryIndexManifest = {
  generatedAt: string
  version: 1
  sourcePrecedence: string[]
  records: MemoryRecord[]
  conflicts: MemoryConflict[]
  warnings: string[]
}

export type TaskRun = {
  runId: string
  taskText: string
  mode: TaskRunMode
  status: TaskRunStatus
  startedAt: string
  endedAt?: string
  riskLevel: RiskSeverity
  loopState: LoopState
}

export type JournalEntry = {
  runId: string
  timestamp: string
  phase: string
  message: string
  artifacts: string[]
  warnings: string[]
}

export type RiskEvent = {
  runId: string
  kind: RiskKind
  severity: RiskSeverity
  details: string
}

export type BuilderAgentRunResult = {
  run: TaskRun
  manifestPath?: string
  journalPath: string
  risks: RiskEvent[]
  warnings: string[]
}

