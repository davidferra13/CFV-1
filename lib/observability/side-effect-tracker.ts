import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type { SideEffectCategory } from './side-effect-types'

export async function trackSideEffect(entry: {
  tenantId: string
  category: SideEffectCategory
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, unknown>
  triggeredBy: string
}): Promise<void> {
  await db.execute(sql`
    INSERT INTO side_effects (tenant_id, category, action, entity_type, entity_id, metadata, triggered_by)
    VALUES (
      ${entry.tenantId},
      ${entry.category},
      ${entry.action},
      ${entry.entityType ?? null},
      ${entry.entityId ?? null},
      ${JSON.stringify(entry.metadata ?? {})}::jsonb,
      ${entry.triggeredBy}
    )
  `)
}

export async function trackEmail(
  tenantId: string,
  triggeredBy: string,
  to: string,
  subject: string,
  entityType?: string,
  entityId?: string
): Promise<void> {
  await trackSideEffect({
    tenantId,
    category: 'email',
    action: `send_email:${subject}`,
    entityType,
    entityId,
    metadata: { to, subject },
    triggeredBy,
  })
}

export async function trackStateChange(
  tenantId: string,
  triggeredBy: string,
  entityType: string,
  entityId: string,
  fromState: string,
  toState: string
): Promise<void> {
  await trackSideEffect({
    tenantId,
    category: 'state_change',
    action: `${entityType}:${fromState}->${toState}`,
    entityType,
    entityId,
    metadata: { fromState, toState },
    triggeredBy,
  })
}
