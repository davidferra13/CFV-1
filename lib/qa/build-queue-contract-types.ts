// lib/qa/build-queue-contract-types.ts
// Types for build queue contract validation tooling

export type QueueStatus =
  | 'SPEC-READY'
  | 'PARTIAL'
  | 'DRAFT'
  | 'UNSPECCED'
  | 'BLOCKED'
  | 'IN-FLIGHT'
  | 'DONE'

export interface QueueItem {
  /** Raw line from the queue markdown */
  rawLine: string
  /** Extracted title/description */
  title: string
  /** Current status tag */
  status: QueueStatus | 'UNKNOWN'
  /** Category/section heading the item falls under */
  category: string
  /** Line number in the markdown file */
  lineNumber: number
  /** Spec file path if referenced */
  specPath: string | null
  /** Whether a blocking reason is documented (for BLOCKED items) */
  hasBlockReason: boolean
}

export interface QueueIntegrityIssue {
  type:
    | 'orphaned-item'
    | 'missing-status'
    | 'blocked-no-reason'
    | 'inflight-stale'
    | 'invalid-status'
    | 'missing-spec-ref'
  item: QueueItem
  description: string
  severity: 'error' | 'warning' | 'info'
}

export interface QueueIntegrityReport {
  runAt: string
  totalItems: number
  issues: QueueIntegrityIssue[]
  statusBreakdown: Record<string, number>
  errorCount: number
  warningCount: number
  infoCount: number
}

export interface QueueReconciliationEntry {
  item: QueueItem
  /** Whether code artifacts matching this item were found */
  codeExists: boolean
  /** Matching file paths found in the codebase */
  matchingPaths: string[]
  /** Whether status aligns with code reality */
  statusAccurate: boolean
  /** Suggested corrective action, if any */
  suggestion: string | null
}

export interface QueueReconciliation {
  runAt: string
  totalChecked: number
  accurateCount: number
  mismatchCount: number
  entries: QueueReconciliationEntry[]
}

export interface QueueHealthReport {
  runAt: string
  totalItems: number
  validStatusCount: number
  healthPercentage: number
  statusBreakdown: Record<string, number>
  /** Items with the most issues */
  topIssues: QueueIntegrityIssue[]
}
