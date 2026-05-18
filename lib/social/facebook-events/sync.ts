import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'
import type { FBEventSyncRecord } from './types'

const SYNC_DIR = join(process.cwd(), 'data', 'fb-event-sync')

function ensureDir() {
  if (!existsSync(SYNC_DIR)) {
    mkdirSync(SYNC_DIR, { recursive: true })
  }
}

function syncPath(tenantId: string, eventId: string): string {
  return join(SYNC_DIR, `${tenantId}_${eventId}.json`)
}

export function getSyncRecord(eventId: string, tenantId: string): FBEventSyncRecord | null {
  const path = syncPath(tenantId, eventId)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as FBEventSyncRecord
  } catch {
    return null
  }
}

export function saveSyncRecord(record: FBEventSyncRecord): void {
  ensureDir()
  writeFileSync(syncPath(record.tenantId, record.eventId), JSON.stringify(record, null, 2))
}

export function deleteSyncRecord(tenantId: string, eventId: string): void {
  const path = syncPath(tenantId, eventId)
  if (existsSync(path)) unlinkSync(path)
}
