// Chef Activity Log — Write Utility
// Non-blocking, fire-and-forget logging of chef actions.
// Uses admin client so it works from any server context.
// Failures are logged but never thrown — activity logging must never break primary workflows.

import { createServerClient } from '@/lib/supabase/server'
import type { ChefActivityAction, ChefActivityDomain } from './chef-types'

export async function logChefActivity(input: {
  tenantId: string
  actorId: string
  action: ChefActivityAction
  domain: ChefActivityDomain
  entityType: string
  entityId?: string
  summary: string
  context?: Record<string, unknown>
  clientId?: string
}): Promise<void> {
  try {
    const supabase = createServerClient({ admin: true })

    await supabase.from('chef_activity_log' as any).insert({
      tenant_id: input.tenantId,
      actor_id: input.actorId,
      action: input.action,
      domain: input.domain,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      summary: input.summary,
      context: input.context || {},
      client_id: input.clientId || null,
    })
  } catch (err) {
    // Non-blocking: activity logging should never break the main flow
    console.error('[logChefActivity] Failed (non-fatal):', err)
  }
}
