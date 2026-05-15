'use server'

import type { UniversalRailRole } from './universal-rail-types'
import type { UniversalRailAssemblyResult } from './universal-rail-types'
import type { RailDismissType, RailAuditEventType } from './universal-rail-state'
import { assembleUniversalRail } from './universal-rail-assembly'
import {
  recordImpression,
  recordImpressionBatch,
  dismissRailItem,
  undismissRailItem,
  saveRailItem,
  unsaveRailItem,
  recordRailAuditEvent,
} from './universal-rail-state'

// ---------------------------------------------------------------------------
// Rail assembly action
// ---------------------------------------------------------------------------

export async function getUniversalRail(
  role: UniversalRailRole,
  pageContext: string,
  userId?: string,
  tenantId?: string
): Promise<UniversalRailAssemblyResult> {
  return assembleUniversalRail({
    role,
    userId,
    tenantId,
    pageContext,
    limit: role === 'admin' ? 100 : 50,
  })
}

// ---------------------------------------------------------------------------
// Interaction actions
// ---------------------------------------------------------------------------

export async function trackRailImpression(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string
): Promise<void> {
  await recordImpression(userId, tenantId, itemDefinitionId, role)
}

export async function trackRailImpressionBatch(
  userId: string,
  tenantId: string | null,
  role: string,
  itemDefinitionIds: string[]
): Promise<void> {
  await recordImpressionBatch(userId, tenantId, role, itemDefinitionIds)
}

export async function dismissRailItemAction(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string,
  dismissType: RailDismissType = 'permanent'
): Promise<void> {
  await dismissRailItem(userId, tenantId, itemDefinitionId, role, dismissType)
  await recordRailAuditEvent({
    userId,
    tenantId: tenantId ?? undefined,
    itemDefinitionId,
    role,
    event: dismissType === 'permanent' ? 'dismiss' : 'snooze',
  })
}

export async function undismissRailItemAction(
  userId: string,
  itemDefinitionId: string
): Promise<void> {
  await undismissRailItem(userId, itemDefinitionId)
}

export async function saveRailItemAction(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string,
  pinned = false
): Promise<void> {
  await saveRailItem(userId, tenantId, itemDefinitionId, role, pinned)
  await recordRailAuditEvent({
    userId,
    tenantId: tenantId ?? undefined,
    itemDefinitionId,
    role,
    event: pinned ? 'pin' : 'save',
  })
}

export async function unsaveRailItemAction(
  userId: string,
  itemDefinitionId: string,
  role: string
): Promise<void> {
  await unsaveRailItem(userId, itemDefinitionId)
  await recordRailAuditEvent({
    userId,
    itemDefinitionId,
    role,
    event: 'unsave',
  })
}

export async function trackRailClick(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string,
  pageContext?: string
): Promise<void> {
  await recordRailAuditEvent({
    userId,
    tenantId: tenantId ?? undefined,
    itemDefinitionId,
    role,
    event: 'click',
    pageContext,
  })
}

export async function trackRailInteraction(
  userId: string,
  tenantId: string | null,
  itemDefinitionId: string,
  role: string,
  event: RailAuditEventType,
  pageContext?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await recordRailAuditEvent({
    userId,
    tenantId: tenantId ?? undefined,
    itemDefinitionId,
    role,
    event,
    pageContext,
    metadata,
  })
}
