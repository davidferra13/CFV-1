'use server'

/**
 * Server actions for the operation audit log.
 * Read-only queries exposed to client components.
 */

import { requireChef } from '@/lib/auth/get-user'
import {
  getEntityTimeline,
  getEntityOperationCount,
  getEntitySnapshots,
  getTenantActivityLog,
} from './log-operation'
import type { OperationLogEntry, EntitySnapshot, EntityType } from './types'

export async function fetchEntityTimeline(
  entityType: EntityType,
  entityId: string,
  opts?: { limit?: number; offset?: number }
): Promise<{ entries: OperationLogEntry[]; total: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const [entries, total] = await Promise.all([
    getEntityTimeline(tenantId, entityType, entityId, opts),
    getEntityOperationCount(tenantId, entityType, entityId),
  ])

  return { entries, total }
}

export async function fetchEntitySnapshots(
  entityType: EntityType,
  entityId: string,
  opts?: { limit?: number }
): Promise<EntitySnapshot[]> {
  const user = await requireChef()
  return getEntitySnapshots(user.tenantId!, entityType, entityId, opts)
}

export async function fetchActivityLog(
  opts?: { limit?: number; offset?: number; entityType?: string }
): Promise<OperationLogEntry[]> {
  const user = await requireChef()
  return getTenantActivityLog(user.tenantId!, opts)
}
