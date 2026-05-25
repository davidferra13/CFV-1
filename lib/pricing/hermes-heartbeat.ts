import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

const HEARTBEAT_TIMEOUT_MS = 5 * 60 * 1000

export interface HermesStatus {
  alive: boolean
  mode: 'hermes' | 'fallback'
  lastHeartbeat: string | null
  queueDepth: number
  currentSkill: string | null
  lastAction: string | null
  errorCount: number
}

interface HeartbeatRow {
  timestamp: string
  status: string
  queue_depth: number
  current_skill: string | null
  last_action: string | null
  error_count: number
}

export async function isHermesAlive(): Promise<boolean> {
  const rows = (await db.execute(sql`
    SELECT timestamp, status
    FROM hermes_heartbeats
    ORDER BY timestamp DESC
    LIMIT 1
  `)) as unknown as HeartbeatRow[]

  if (rows.length === 0) return false

  const row = rows[0]
  if (row.status !== 'alive') return false

  const age = Date.now() - new Date(row.timestamp).getTime()
  return age < HEARTBEAT_TIMEOUT_MS
}

export async function getHermesStatus(): Promise<HermesStatus> {
  const rows = (await db.execute(sql`
    SELECT timestamp, status, queue_depth, current_skill, last_action, error_count
    FROM hermes_heartbeats
    ORDER BY timestamp DESC
    LIMIT 1
  `)) as unknown as HeartbeatRow[]

  if (rows.length === 0) {
    return {
      alive: false,
      mode: 'fallback',
      lastHeartbeat: null,
      queueDepth: 0,
      currentSkill: null,
      lastAction: null,
      errorCount: 0,
    }
  }

  const row = rows[0]
  const age = Date.now() - new Date(row.timestamp).getTime()
  const alive = row.status === 'alive' && age < HEARTBEAT_TIMEOUT_MS

  return {
    alive,
    mode: alive ? 'hermes' : 'fallback',
    lastHeartbeat: row.timestamp,
    queueDepth: row.queue_depth,
    currentSkill: row.current_skill,
    lastAction: row.last_action,
    errorCount: row.error_count,
  }
}
