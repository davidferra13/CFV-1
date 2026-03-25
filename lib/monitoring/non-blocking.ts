'use server'

// Non-Blocking Side Effect Wrapper
// Replaces console.error-only patterns with structured failure capture.
// Failures are written to side_effect_failures table and surfaced on /admin/silent-failures.
//
// Usage:
//   import { nonBlocking } from '@/lib/monitoring/non-blocking'
//
//   await nonBlocking({
//     source: 'quote-transition',
//     operation: 'send_email',
//     severity: 'high',
//     entityType: 'quote',
//     entityId: id,
//     tenantId: user.tenantId,
//   }, async () => {
//     await sendEmail(...)
//   })
//
// The wrapper NEVER throws. If the side effect fails, the failure is recorded
// and the main operation continues. If recording the failure also fails,
// it falls back to console.error (last resort).

import { createServerClient } from '@/lib/db/server'

export type Severity = 'critical' | 'high' | 'medium' | 'low'

export interface NonBlockingOptions {
  source: string
  operation: string
  severity?: Severity
  entityType?: string
  entityId?: string
  tenantId?: string | null
  context?: Record<string, unknown>
}

/**
 * Execute a non-blocking side effect with structured failure capture.
 * Returns true if the operation succeeded, false if it failed.
 */
export async function nonBlocking(
  opts: NonBlockingOptions,
  fn: () => Promise<void>
): Promise<boolean> {
  try {
    await fn()
    return true
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error'

    console.error(
      `[non-blocking:${opts.source}/${opts.operation}] ${errorMessage}`,
      opts.entityType && opts.entityId ? `${opts.entityType}:${opts.entityId}` : ''
    )

    // Record to side_effect_failures table (fire-and-forget, never throws)
    try {
      const db: any = createServerClient({ admin: true })
      await db.from('side_effect_failures').insert({
        source: opts.source,
        operation: opts.operation,
        severity: opts.severity ?? 'medium',
        entity_type: opts.entityType ?? null,
        entity_id: opts.entityId ?? null,
        tenant_id: opts.tenantId ?? null,
        error_message: errorMessage,
        context: opts.context ?? {},
      })
    } catch (recordErr) {
      // Last resort: if we can't even record the failure, log it
      console.error('[non-blocking] Failed to record side effect failure:', recordErr)
    }

    return false
  }
}

/**
 * Record a side effect failure directly (for cases where the error is already caught).
 * Same fire-and-forget guarantee: never throws.
 */
export async function recordSideEffectFailure(
  opts: NonBlockingOptions & { errorMessage: string }
): Promise<void> {
  console.error(
    `[side-effect-failure:${opts.source}/${opts.operation}] ${opts.errorMessage}`,
    opts.entityType && opts.entityId ? `${opts.entityType}:${opts.entityId}` : ''
  )

  try {
    const db: any = createServerClient({ admin: true })
    await db.from('side_effect_failures').insert({
      source: opts.source,
      operation: opts.operation,
      severity: opts.severity ?? 'medium',
      entity_type: opts.entityType ?? null,
      entity_id: opts.entityId ?? null,
      tenant_id: opts.tenantId ?? null,
      error_message: opts.errorMessage,
      context: opts.context ?? {},
    })
  } catch (recordErr) {
    console.error('[side-effect-failure] Failed to record:', recordErr)
  }
}
