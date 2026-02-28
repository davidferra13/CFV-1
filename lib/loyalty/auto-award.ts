// Loyalty Auto-Award
// Handles all automated point-awarding that requires no chef approval.
// These are "Tier 1 Autonomous" operations per the AI Policy:
//   - Welcome points on client join (invitation-based)
//   - Reward delivery tracking (create / mark delivered / cancel)
//
// All writes here use the admin client because they fire in contexts where
// no active session exists (e.g. the auth signup flow).

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─────────────────────────────────────────────────────────────────────────────
// Welcome Points
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-award welcome points when a client joins a chef's tenant.
 *
 * Rules:
 *  - Only fires when tenantId is non-null (invitation-based signup or explicit
 *    tenant assignment). Standalone clients with no tenantId are skipped.
 *  - Fully idempotent — guarded by clients.has_received_welcome_points.
 *  - Skipped silently if the loyalty program is inactive or welcome_points = 0.
 *  - Uses admin client — may be called before any auth session exists.
 *
 * This is a Tier 1 Autonomous action: no chef review, no approval prompt.
 * Welcome points are a friction-free gift to celebrate the client joining.
 */
export async function autoAwardWelcomePoints(
  clientId: string,
  tenantId: string
): Promise<{ awarded: boolean; points: number }> {
  const supabase = createServerClient({ admin: true })

  // Idempotency check — never double-award
  const { data: client } = await supabase
    .from('clients')
    .select('id, full_name, has_received_welcome_points, loyalty_points')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) {
    console.error('[autoAwardWelcomePoints] Client not found:', clientId)
    return { awarded: false, points: 0 }
  }

  if (client.has_received_welcome_points) {
    return { awarded: false, points: 0 } // Already done
  }

  // Get loyalty config for this tenant
  const { data: config } = await supabase
    .from('loyalty_config')
    .select('welcome_points, is_active')
    .eq('tenant_id', tenantId)
    .single()

  // If program is inactive, no config, or welcome_points = 0 — mark received and skip
  if (!config || !config.is_active || (config.welcome_points ?? 0) <= 0) {
    await supabase.from('clients').update({ has_received_welcome_points: true }).eq('id', clientId)
    return { awarded: false, points: 0 }
  }

  const welcomePoints = config.welcome_points as number

  // Insert bonus transaction (type = 'bonus', no event_id)
  const { error: txError } = await supabase.from('loyalty_transactions').insert({
    tenant_id: tenantId,
    client_id: clientId,
    type: 'bonus',
    points: welcomePoints,
    description: 'Welcome bonus — thanks for joining!',
    created_by: null, // system-generated
  })

  if (txError) {
    console.error('[autoAwardWelcomePoints] Transaction insert error:', txError)
    return { awarded: false, points: 0 }
  }

  // Update client balance + mark welcome points received
  const newBalance = (client.loyalty_points || 0) + welcomePoints

  const { error: updateError } = await supabase
    .from('clients')
    .update({
      loyalty_points: newBalance,
      has_received_welcome_points: true,
    })
    .eq('id', clientId)

  if (updateError) {
    console.error('[autoAwardWelcomePoints] Client update error:', updateError)
  }

  console.info(
    `[autoAwardWelcomePoints] Awarded ${welcomePoints} welcome points to client ${clientId} (tenant: ${tenantId})`
  )

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/loyalty')

  return { awarded: true, points: welcomePoints }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reward Delivery Tracking
// ─────────────────────────────────────────────────────────────────────────────

export type PendingDelivery = {
  id: string
  tenant_id: string
  client_id: string
  loyalty_transaction_id: string
  reward_id: string
  reward_name: string
  reward_type: string
  points_spent: number
  reward_value_cents: number | null
  reward_percent: number | null
  delivery_status: 'pending' | 'delivered' | 'cancelled'
  event_id: string | null
  delivered_at: string | null
  delivery_note: string | null
  redeemed_by: 'client' | 'chef'
  created_at: string
}

export type PendingDeliveryWithClient = PendingDelivery & {
  clients: { id: string; full_name: string; email: string | null }
}

/**
 * Create a pending delivery record after a reward is redeemed.
 * Called immediately after inserting the loyalty_transactions redemption row.
 *
 * Not chef-approval-required — this is just tracking, not a financial write.
 * Uses admin client when called from the redemption flow.
 */
export async function createPendingDelivery({
  tenantId,
  clientId,
  loyaltyTransactionId,
  rewardId,
  rewardName,
  rewardType,
  pointsSpent,
  rewardValueCents,
  rewardPercent,
  redeemedBy,
}: {
  tenantId: string
  clientId: string
  loyaltyTransactionId: string
  rewardId: string
  rewardName: string
  rewardType: string
  pointsSpent: number
  rewardValueCents: number | null
  rewardPercent: number | null
  redeemedBy: 'client' | 'chef'
}): Promise<string | null> {
  // Admin client: this may be called from server actions without a chef session
  const supabase = createServerClient({ admin: true })

  const { data, error } = await supabase
    .from('loyalty_reward_redemptions')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      loyalty_transaction_id: loyaltyTransactionId,
      reward_id: rewardId,
      reward_name: rewardName,
      reward_type: rewardType,
      points_spent: pointsSpent,
      reward_value_cents: rewardValueCents,
      reward_percent: rewardPercent,
      delivery_status: 'pending',
      redeemed_by: redeemedBy,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createPendingDelivery] Insert error:', error)
    return null
  }

  return data?.id || null
}

/**
 * Get all pending reward deliveries for the chef's tenant.
 * Used on the chef loyalty dashboard to show what needs to be honoured.
 */
export async function getPendingRewardDeliveries(): Promise<PendingDeliveryWithClient[]> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('loyalty_reward_redemptions')
    .select(
      `
      *,
      clients:client_id (id, full_name, email)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('delivery_status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getPendingRewardDeliveries] Error:', error)
    return []
  }

  return (data || []) as PendingDeliveryWithClient[]
}

/**
 * Get all redemptions for a client (chef view — full history).
 */
export async function getClientRedemptionHistory(clientId: string): Promise<PendingDelivery[]> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('loyalty_reward_redemptions')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getClientRedemptionHistory] Error:', error)
    return []
  }

  return (data || []) as PendingDelivery[]
}

/**
 * Mark a reward as delivered. Chef-only.
 * Links the delivery to an event (optional) and records a note.
 */
export async function markRewardDelivered(
  redemptionId: string,
  eventId?: string,
  note?: string
): Promise<{ success: boolean }> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('loyalty_reward_redemptions')
    .update({
      delivery_status: 'delivered',
      event_id: eventId || null,
      delivered_at: new Date().toISOString(),
      delivery_note: note || null,
    })
    .eq('id', redemptionId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[markRewardDelivered] Error:', error)
    throw new Error('Failed to mark reward as delivered')
  }

  revalidatePath('/loyalty')
  revalidatePath('/loyalty/rewards')
  return { success: true }
}

/**
 * Cancel a pending delivery (e.g. client and chef agreed not to use it).
 * Points are NOT returned — this is an administrative cancel, not an undo.
 * If a genuine undo is needed, the chef uses awardBonusPoints separately.
 * Chef-only.
 */
export async function cancelRewardDelivery(
  redemptionId: string,
  note?: string
): Promise<{ success: boolean }> {
  const { requireChef } = await import('@/lib/auth/get-user')
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('loyalty_reward_redemptions')
    .update({
      delivery_status: 'cancelled',
      delivery_note: note || 'Cancelled by chef',
    })
    .eq('id', redemptionId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[cancelRewardDelivery] Error:', error)
    throw new Error('Failed to cancel reward delivery')
  }

  revalidatePath('/loyalty')
  return { success: true }
}

/**
 * Client: get own pending reward redemptions.
 * Shows the client what they've redeemed but hasn't been delivered yet.
 */
export async function getMyPendingRedemptions(): Promise<PendingDelivery[]> {
  const { requireClient } = await import('@/lib/auth/get-user')
  const user = await requireClient()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('loyalty_reward_redemptions')
    .select('*')
    .eq('client_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getMyPendingRedemptions] Error:', error)
    return []
  }

  return (data || []) as PendingDelivery[]
}
