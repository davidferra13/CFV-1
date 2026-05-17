'use server'

import { requireChef } from '@/lib/auth/get-user'
import { promises as fs } from 'fs'
import path from 'path'

export type HealthSnapshotEntry = {
  date: string
  meanScore: number
  percentHealthy: number
  totalClients: number
  alertCount: number
  tierDistribution: Record<string, number>
}

const SNAPSHOTS_DIR = path.join(process.cwd(), 'data', 'health-snapshots')
const MAX_ENTRIES = 52

function snapshotPath(tenantId: string): string {
  return path.join(SNAPSHOTS_DIR, `${tenantId}.json`)
}

export async function getHealthScoreTrend(): Promise<HealthSnapshotEntry[]> {
  const user = await requireChef()
  try {
    const raw = await fs.readFile(snapshotPath(user.tenantId!), 'utf-8')
    return JSON.parse(raw) as HealthSnapshotEntry[]
  } catch {
    return []
  }
}

export async function writeHealthSnapshot(
  tenantId: string,
  entry: Omit<HealthSnapshotEntry, 'date'>
): Promise<void> {
  await fs.mkdir(SNAPSHOTS_DIR, { recursive: true })
  const filePath = snapshotPath(tenantId)

  let entries: HealthSnapshotEntry[] = []
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    entries = JSON.parse(raw)
  } catch {}

  entries.push({ date: new Date().toISOString().slice(0, 10), ...entry })

  if (entries.length > MAX_ENTRIES) {
    entries = entries.slice(entries.length - MAX_ENTRIES)
  }

  await fs.writeFile(filePath, JSON.stringify(entries, null, 2), 'utf-8')
}
