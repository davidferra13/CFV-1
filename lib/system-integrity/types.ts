// System Integrity Interrogation - Type System
// Types for the self-diagnostic engine.

/** Category of integrity check */
export type CheckCategory =
  | 'event_lifecycle'
  | 'financial'
  | 'client_data'
  | 'hub_surfaces'
  | 'cascade_safety'
  | 'data_consistency'

/** Severity of a finding */
export type FindingSeverity = 'critical' | 'warning' | 'info'

/** Status of a check */
export type CheckStatus = 'pass' | 'fail' | 'warn' | 'skip'

/** A single diagnostic check result */
export interface IntegrityCheck {
  /** Unique check ID (e.g. 'orphaned_events') */
  id: string
  /** Human-readable name */
  name: string
  /** Category */
  category: CheckCategory
  /** What this check verifies */
  description: string
  /** Result status */
  status: CheckStatus
  /** Severity if not passing */
  severity: FindingSeverity
  /** Count of issues found (0 = clean) */
  issueCount: number
  /** Human-readable detail about findings */
  detail: string | null
  /** Optional: affected record IDs for drill-down */
  affectedIds: string[]
  /** How long this check took in ms */
  durationMs: number
}

/** Full interrogation result */
export interface IntegrityReport {
  /** All checks run */
  checks: IntegrityCheck[]
  /** Overall health score (0-100) */
  healthScore: number
  /** Total issues found */
  totalIssues: number
  /** Critical issues */
  criticalCount: number
  /** Warning issues */
  warningCount: number
  /** When this report was generated */
  generatedAt: string
  /** How long the full scan took */
  totalDurationMs: number
}
