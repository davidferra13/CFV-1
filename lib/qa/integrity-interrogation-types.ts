/**
 * System Integrity Interrogation types (P63)
 * Cross-boundary checks for orphan data, broken references, tenant leaks.
 */

export interface IntegrityCheck {
  name: string
  description: string
  status: 'pass' | 'warn' | 'fail'
  details: string
  /** Number of issues found (0 = clean) */
  issueCount: number
}

export interface IntegrityScore {
  /** 0-100 overall health */
  score: number
  /** Timestamp of this measurement */
  measuredAt: string
  /** Breakdown per check */
  checks: IntegrityCheck[]
  /** Count of passes, warnings, failures */
  summary: {
    pass: number
    warn: number
    fail: number
  }
}

export interface IntegrityReport {
  current: IntegrityScore
  history: IntegrityScore[]
}
