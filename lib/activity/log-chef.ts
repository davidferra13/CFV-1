// Chef activity log write utility.
// Non-blocking by design.

import { createServerClient } from '@/lib/db/server'
import type { TablesInsert } from '@/types/database'
import type { ChefActivityAction, ChefActivityDomain } from './chef-types'
import { logActivityEvent } from './observability'

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
    const db = createServerClient({ admin: true })

    // Check if chef has opted out of activity logging.
    // Default to logging (true) if preference row missing or query fails.
    try {
      const { data: prefs } = await db
        .from('chef_preferences')
        .select('activity_log_enabled')
        .eq('tenant_id', input.tenantId)
        .single()

      if (prefs && (prefs as Record<string, unknown>).activity_log_enabled === false) {
        return // Chef has explicitly opted out
      }
    } catch {
      // Preference check failed - default to logging (safe default)
    }

    const payload: TablesInsert<'chef_activity_log'> = {
      tenant_id: input.tenantId,
      actor_id: input.actorId,
      action: input.action,
      domain: input.domain,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      summary: input.summary,
      context: (input.context || {}) as TablesInsert<'chef_activity_log'>['context'],
      client_id: input.clientId || null,
    }

    const { error } = await db.from('chef_activity_log').insert(payload)

    if (error) {
      logActivityEvent('error', 'logChefActivity insert failed', {
        error: error.message,
        action: input.action,
      })
    }
  } catch (err) {
    logActivityEvent('error', 'logChefActivity failed (non-fatal)', {
      action: input.action,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
