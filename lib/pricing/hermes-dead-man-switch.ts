import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { logHermesAction } from './hermes-actions'

const ONE_HOUR_MS = 60 * 60 * 1000

interface DeadManResult {
  alerted: boolean
  offlineHours: number
}

export async function checkHermesDeadManSwitch(): Promise<DeadManResult> {
  const heartbeats = (await db.execute(sql`
    SELECT timestamp FROM hermes_heartbeats ORDER BY timestamp DESC LIMIT 1
  `)) as unknown as Array<{ timestamp: string }>

  if (heartbeats.length === 0) {
    return await fireAlert(24)
  }

  const ageMs = Date.now() - new Date(heartbeats[0].timestamp).getTime()
  const offlineHours = Math.round((ageMs / ONE_HOUR_MS) * 10) / 10

  if (ageMs < ONE_HOUR_MS) {
    return { alerted: false, offlineHours }
  }

  const taskState = (await db.execute(sql`
    SELECT last_run FROM hermes_task_state WHERE task = 'dead-man-switch'
  `)) as unknown as Array<{ last_run: string }>

  if (taskState.length > 0) {
    const lastRun = new Date(taskState[0].last_run)
    const today = new Date()
    if (lastRun.toDateString() === today.toDateString()) {
      return { alerted: false, offlineHours }
    }
  }

  return await fireAlert(offlineHours)
}

async function fireAlert(offlineHours: number): Promise<DeadManResult> {
  await logHermesAction({
    skill: 'pie-alert',
    source: 'fallback',
    action: `Dead-man-switch: Hermes offline for ${offlineHours}h`,
    reason: 'No heartbeat received within threshold',
    result: 'failed',
  })

  await db.execute(sql`
    INSERT INTO hermes_task_state (task, last_run, result)
    VALUES ('dead-man-switch', NOW(), 'alerted')
    ON CONFLICT (task) DO UPDATE SET last_run = NOW(), result = 'alerted'
  `)

  return { alerted: true, offlineHours }
}
