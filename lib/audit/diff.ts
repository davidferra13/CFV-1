/**
 * Diff utility for operation audit log.
 *
 * Computes field-level changes between old and new state.
 * Used by logOperation() callers to auto-generate diffs.
 *
 * Usage:
 *   const diff = computeDiff(oldEvent, newEvent)
 *   await logOperation({ ..., diff })
 */

import type { OperationDiff } from './types'

/**
 * Compare two objects and return field-level changes.
 * Only top-level fields are compared (shallow diff).
 * Ignores undefined values and internal fields (updated_at, etc.).
 */
export function computeDiff(
  oldState: Record<string, unknown>,
  newState: Record<string, unknown>,
  opts?: { ignoreFields?: string[] }
): OperationDiff {
  const ignore = new Set([
    'updated_at',
    'modified_at',
    ...(opts?.ignoreFields ?? []),
  ])

  const changes: Record<string, { old: unknown; new: unknown }> = {}

  for (const key of Object.keys(newState)) {
    if (ignore.has(key)) continue
    if (newState[key] === undefined) continue

    const oldVal = oldState[key]
    const newVal = newState[key]

    if (!shallowEqual(oldVal, newVal)) {
      changes[key] = { old: oldVal ?? null, new: newVal }
    }
  }

  if (Object.keys(changes).length === 0) return {}

  return { changes }
}

/**
 * Build a diff for a create operation (full initial state).
 */
export function createDiff(state: Record<string, unknown>): OperationDiff {
  return { created: sanitizeForLog(state) }
}

/**
 * Build a diff for a state transition (FSM).
 */
export function transitionDiff(from: string, to: string): OperationDiff {
  return { from, to }
}

// ─── Internal ────────────────────────────────────────────────────────────────

function shallowEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true

  // Compare dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime()
  }

  // Compare arrays/objects via JSON (good enough for shallow diff)
  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b)
    } catch {
      return false
    }
  }

  return false
}

/**
 * Strip large/sensitive fields before storing in the log.
 * Keeps the log lean.
 */
function sanitizeForLog(state: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(state)) {
    // Skip binary/blob fields
    if (value instanceof Uint8Array || value instanceof ArrayBuffer) continue
    // Truncate very long strings (e.g., full contract text)
    if (typeof value === 'string' && value.length > 2000) {
      result[key] = value.slice(0, 2000) + '...[truncated]'
      continue
    }
    result[key] = value
  }
  return result
}
