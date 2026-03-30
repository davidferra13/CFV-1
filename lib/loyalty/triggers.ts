// Loyalty Trigger System
// Automatic point awards for client interactions beyond event completion.
// Internal module (NOT 'use server'). Called from server action files.
// Uses admin client for all DB operations (fires in cross-boundary auth contexts).

import { createServerClient } from '@/lib/db/server'

// ── Types ────────────────────────────────────────────────────────────────

export type TriggerFrequency = 'per_event' | 'per_action' | 'one_time'

export type TriggerCategory = 'engagement' | 'event_lifecycle' | 'financial' | 'social'

export type TriggerDefinition = {
  key: string
  label: string
  description: string
  defaultPoints: number
  frequency: TriggerFrequency
  category: TriggerCategory
  idempotencyTable?: 'clients' | 'events'
  idempotencyColumn?: string
}

export type TriggerConfigOverride = {
  enabled: boolean
  points: number
}

// ── Registry ─────────────────────────────────────────────────────────────

export const TRIGGER_REGISTRY: TriggerDefinition[] = [
  // Engagement
  {
    key: 'profile_completed',
    label: 'Profile completed',
    description: 'Client fills in name, email, and phone',
    defaultPoints: 15,
    frequency: 'one_time',
    category: 'engagement',
    idempotencyTable: 'clients',
    idempotencyColumn: 'loyalty_profile_complete_awarded',
  },
  {
    key: 'fun_qa_completed',
    label: 'Fun Q&A answered',
    description: 'Client answers the fun questionnaire',
    defaultPoints: 10,
    frequency: 'one_time',
    category: 'engagement',
    idempotencyTable: 'clients',
    idempotencyColumn: 'loyalty_fun_qa_awarded',
  },
  {
    key: 'chat_engagement',
    label: 'First message in event chat',
    description: 'Client sends their first message in a conversation',
    defaultPoints: 5,
    frequency: 'per_event',
    category: 'engagement',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_chat_engagement_awarded',
  },
  {
    key: 'meal_feedback_given',
    label: 'Meal feedback given',
    description: 'Client submits a dish reaction',
    defaultPoints: 5,
    frequency: 'per_action',
    category: 'engagement',
  },

  // Event Lifecycle
  {
    key: 'review_submitted',
    label: 'Review submitted',
    description: 'Client leaves a review after an event',
    defaultPoints: 20,
    frequency: 'per_event',
    category: 'event_lifecycle',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_review_awarded',
  },
  {
    key: 'quote_accepted',
    label: 'Quote accepted',
    description: 'Client accepts a quote',
    defaultPoints: 10,
    frequency: 'per_event',
    category: 'event_lifecycle',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_quote_accepted_awarded',
  },
  {
    key: 'menu_approved',
    label: 'Menu approved',
    description: 'Client approves their event menu',
    defaultPoints: 10,
    frequency: 'per_event',
    category: 'event_lifecycle',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_menu_approved_awarded',
  },

  // Financial
  {
    key: 'payment_on_time',
    label: 'On-time payment',
    description: 'Payment recorded for a sale',
    defaultPoints: 15,
    frequency: 'per_event',
    category: 'financial',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_ontime_payment_awarded',
  },
  {
    key: 'tip_added',
    label: 'Tip added',
    description: 'Client includes a tip with payment',
    defaultPoints: 10,
    frequency: 'per_event',
    category: 'financial',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_tip_awarded',
  },

  // Social
  {
    key: 'google_review_clicked',
    label: 'Google review clicked',
    description: 'Client clicks the Google Review link',
    defaultPoints: 25,
    frequency: 'per_event',
    category: 'social',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_google_review_awarded',
  },
  {
    key: 'public_review_consent',
    label: 'Public review consent',
    description: 'Client consents to display their review publicly',
    defaultPoints: 10,
    frequency: 'per_event',
    category: 'social',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_public_consent_awarded',
  },
  {
    key: 'rsvp_collected',
    label: 'Guest RSVP collected',
    description: "A guest submits an RSVP for the client's event",
    defaultPoints: 5,
    frequency: 'per_action',
    category: 'social',
  },
  {
    key: 'hub_group_created',
    label: 'Hub group created',
    description: 'Client creates a new group',
    defaultPoints: 10,
    frequency: 'per_action',
    category: 'social',
  },
  {
    key: 'friend_invited',
    label: 'Friend connection accepted',
    description: 'A friend request is accepted',
    defaultPoints: 15,
    frequency: 'per_action',
    category: 'social',
  },
]

const REGISTRY_MAP = new Map(TRIGGER_REGISTRY.map((t) => [t.key, t]))

// ── Category Labels ──────────────────────────────────────────────────────

export const TRIGGER_CATEGORY_LABELS: Record<TriggerCategory, string> = {
  engagement: 'Engagement',
  event_lifecycle: 'Event Lifecycle',
  financial: 'Financial',
  social: 'Social',
}

// ── Core: fireTrigger ────────────────────────────────────────────────────

/**
 * Fire a loyalty trigger. Awards points if:
 * 1. Program mode is 'full'
 * 2. The trigger is enabled (default or override)
 * 3. Idempotency guard not already set (for per_event/one_time)
 *
 * Uses admin client. Never derives auth from session.
 * All side effects (SSE, notifications) are non-blocking.
 */
export async function fireTrigger(
  triggerKey: string,
  tenantId: string,
  clientId: string,
  context: {
    eventId?: string
    description?: string
  } = {}
): Promise<{ awarded: boolean; points: number }> {
  const SKIP = { awarded: false, points: 0 }

  // 1. Validate trigger exists in registry
  const definition = REGISTRY_MAP.get(triggerKey)
  if (!definition) {
    console.warn(`[fireTrigger] Unknown trigger key: ${triggerKey}`)
    return SKIP
  }

  const db: any = createServerClient({ admin: true })

  // 2. Fetch loyalty config for tenant
  const { data: config } = await db
    .from('loyalty_config')
    .select('program_mode, trigger_config, is_active')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!config || !config.is_active || config.program_mode !== 'full') {
    return SKIP
  }

  // 3. Resolve trigger settings (override or default)
  const overrides = (config.trigger_config || {}) as Record<string, TriggerConfigOverride>
  const override = overrides[triggerKey]
  const enabled = override ? override.enabled : true // Default: enabled
  const points = override ? override.points : definition.defaultPoints

  if (!enabled || points <= 0) {
    return SKIP
  }

  // 4. Check idempotency guard
  if (definition.idempotencyTable && definition.idempotencyColumn) {
    const table = definition.idempotencyTable
    const column = definition.idempotencyColumn
    const id = table === 'clients' ? clientId : context.eventId

    if (!id) {
      // per_event trigger without eventId: can't check, skip
      if (table === 'events') {
        console.warn(`[fireTrigger] ${triggerKey}: no eventId for per_event guard, skipping`)
        return SKIP
      }
    }

    const { data: guardRow } = await db.from(table).select(column).eq('id', id).maybeSingle()

    if (guardRow && (guardRow as any)[column] === true) {
      return SKIP // Already awarded
    }
  }

  // 5. Fetch client balance
  const { data: client } = await db
    .from('clients')
    .select('id, loyalty_points, loyalty_tier, full_name, tenant_id')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) {
    console.warn(`[fireTrigger] Client ${clientId} not found in tenant ${tenantId}`)
    return SKIP
  }

  // 6. Insert loyalty transaction
  const txDescription = context.description || definition.label
  const { error: txError } = await db.from('loyalty_transactions').insert({
    tenant_id: tenantId,
    client_id: clientId,
    event_id: context.eventId || null,
    type: 'earned',
    points,
    description: txDescription,
    created_by: null, // system-generated
  })

  if (txError) {
    console.error(`[fireTrigger] Transaction insert failed for ${triggerKey}:`, txError)
    return SKIP
  }

  // 7. Update client balance + recalculate tier
  const newBalance = (client.loyalty_points || 0) + points
  const newTier = recalculateTier(newBalance, tenantId, db)

  const { error: updateError } = await db
    .from('clients')
    .update({ loyalty_points: newBalance })
    .eq('id', clientId)

  if (updateError) {
    console.error(`[fireTrigger] Client balance update failed for ${triggerKey}:`, updateError)
  }

  // 8. Set idempotency guard
  if (definition.idempotencyTable && definition.idempotencyColumn) {
    const table = definition.idempotencyTable
    const column = definition.idempotencyColumn
    const id = table === 'clients' ? clientId : context.eventId

    if (id) {
      try {
        await db
          .from(table)
          .update({ [column]: true })
          .eq('id', id)
      } catch (err) {
        console.error(`[fireTrigger] Idempotency guard update failed:`, err)
      }
    }
  }

  // 9. Resolve tier (non-blocking)
  try {
    const resolvedTier = await newTier
    if (resolvedTier && resolvedTier !== client.loyalty_tier) {
      await db.from('clients').update({ loyalty_tier: resolvedTier }).eq('id', clientId)

      // Tier upgrade notification (non-blocking)
      try {
        const { createNotification } = await import('@/lib/notifications/actions')
        const { getClientAuthUserId } = await import('@/lib/notifications/client-actions')
        const clientAuthUserId = await getClientAuthUserId(clientId)
        if (clientAuthUserId) {
          await createNotification({
            tenantId,
            recipientId: clientAuthUserId,
            category: 'loyalty',
            action: 'tier_upgraded',
            title: `You reached ${resolvedTier} tier!`,
            body: `Congratulations! You've been upgraded to ${resolvedTier}`,
            actionUrl: '/my-rewards',
            clientId,
          })
        }
      } catch (notifyErr) {
        console.error('[fireTrigger] Tier upgrade notification failed:', notifyErr)
      }
    }
  } catch (tierErr) {
    console.error('[fireTrigger] Tier recalculation failed:', tierErr)
  }

  // 10. SSE broadcast (non-blocking)
  try {
    const { broadcastUpdate } = await import('@/lib/realtime/broadcast')
    broadcastUpdate('loyalty', tenantId, {
      clientId,
      type: 'trigger_awarded',
      triggerKey,
      points,
      newBalance,
      description: txDescription,
    })
  } catch (sseErr) {
    console.error('[fireTrigger] SSE broadcast failed:', sseErr)
  }

  // 11. Client notification (non-blocking)
  try {
    const { createNotification } = await import('@/lib/notifications/actions')
    const { getClientAuthUserId } = await import('@/lib/notifications/client-actions')
    const clientAuthUserId = await getClientAuthUserId(clientId)
    if (clientAuthUserId) {
      await createNotification({
        tenantId,
        recipientId: clientAuthUserId,
        category: 'loyalty',
        action: 'loyalty_trigger',
        title: `+${points} points earned!`,
        body: txDescription,
        actionUrl: '/my-rewards',
        clientId,
      })
    }
  } catch (notifyErr) {
    console.error('[fireTrigger] Client notification failed:', notifyErr)
  }

  console.info(
    `[fireTrigger] Awarded ${points} pts for ${triggerKey} to client ${clientId} (tenant: ${tenantId})`
  )

  return { awarded: true, points }
}

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Get merged trigger config (defaults + overrides) for a tenant.
 * Used by settings form and How-to-Earn panel.
 */
export async function getActiveTriggers(
  tenantId: string
): Promise<(TriggerDefinition & { enabled: boolean; points: number })[]> {
  const db: any = createServerClient({ admin: true })

  const { data: config } = await db
    .from('loyalty_config')
    .select('trigger_config')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const overrides = (config?.trigger_config || {}) as Record<string, TriggerConfigOverride>

  return TRIGGER_REGISTRY.map((def) => {
    const override = overrides[def.key]
    return {
      ...def,
      enabled: override ? override.enabled : true,
      points: override ? override.points : def.defaultPoints,
    }
  })
}

/**
 * Validate trigger config keys against the registry.
 * Returns only known keys. Silently drops unknown ones.
 */
export function validateTriggerConfig(
  input: Record<string, unknown>
): Record<string, TriggerConfigOverride> {
  const result: Record<string, TriggerConfigOverride> = {}
  for (const [key, value] of Object.entries(input)) {
    if (!REGISTRY_MAP.has(key)) continue
    if (typeof value !== 'object' || value === null) continue
    const v = value as Record<string, unknown>
    if (typeof v.enabled !== 'boolean' || typeof v.points !== 'number') continue
    if (v.points < 0) continue
    result[key] = { enabled: v.enabled, points: v.points }
  }
  return result
}

/**
 * Recalculate tier based on current points.
 * Returns the new tier name. Async because it fetches config thresholds.
 */
async function recalculateTier(
  totalPoints: number,
  tenantId: string,
  db: any
): Promise<string | null> {
  const { data: config } = await db
    .from('loyalty_config')
    .select('tier_silver_min, tier_gold_min, tier_platinum_min')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!config) return null

  const silverMin = config.tier_silver_min ?? 100
  const goldMin = config.tier_gold_min ?? 250
  const platinumMin = config.tier_platinum_min ?? 500

  if (totalPoints >= platinumMin) return 'platinum'
  if (totalPoints >= goldMin) return 'gold'
  if (totalPoints >= silverMin) return 'silver'
  return 'bronze'
}
