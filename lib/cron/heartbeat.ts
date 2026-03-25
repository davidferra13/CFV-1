'use server'

// Cron Heartbeat Utility
// Call recordCronHeartbeat() at the END of each cron handler to log
// a successful execution. The /api/scheduled/monitor route reads these
// records to detect stale or silently failing cron jobs.
//
// Usage:
//   await recordCronHeartbeat('lifecycle', result, durationMs)
//
// Fire-and-forget: this function NEVER throws. If the heartbeat fails
// (e.g. DB connection issue), it logs the error and returns. It must
// never cause a cron job to fail.

import { createServerClient } from '@/lib/db/server'

export async function recordCronHeartbeat(
  cronName: string,
  result?: Record<string, unknown>,
  durationMs?: number
): Promise<void> {
  try {
    const db: any = createServerClient({ admin: true })
    const { error } = await db.from('cron_executions').insert({
      cron_name: cronName,
      status: 'success',
      duration_ms: durationMs ?? null,
      result: result ?? null,
    })
    if (error) {
      console.error(`[CronHeartbeat] Failed to record heartbeat for "${cronName}":`, error)
    }
  } catch (err) {
    console.error(`[CronHeartbeat] Unexpected error recording heartbeat for "${cronName}":`, err)
  }
}

export async function recordCronError(
  cronName: string,
  errorText: string,
  durationMs?: number
): Promise<void> {
  try {
    const db: any = createServerClient({ admin: true })
    const { error } = await db.from('cron_executions').insert({
      cron_name: cronName,
      status: 'error',
      duration_ms: durationMs ?? null,
      error_text: errorText,
    })
    if (error) {
      console.error(`[CronHeartbeat] Failed to record error for "${cronName}":`, error)
    }

    // Fire developer alert for cron failures
    try {
      const { sendDeveloperAlert } = require('../email/developer-alerts')
      sendDeveloperAlert({
        severity: 'warning' as const,
        system: `cron-${cronName}`,
        title: `Cron job failed: ${cronName}`,
        description: errorText,
        context: {
          cronName,
          durationMs: durationMs ? String(durationMs) : 'unknown',
        },
      })
    } catch {
      // Alert must never crash heartbeat recording
    }
  } catch (err) {
    console.error(`[CronHeartbeat] Unexpected error recording error for "${cronName}":`, err)
  }
}
