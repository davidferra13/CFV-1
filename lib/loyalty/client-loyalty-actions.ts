'use server'

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function clientRedeemReward(rewardId: string) {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, tenant_id, loyalty_points, loyalty_tier')
    .eq('id', user.entityId)
    .single()

  if (!client || !client.tenant_id) {
    throw new Error('Client record not found')
  }

  const { data: reward } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('id', rewardId)
    .eq('tenant_id', client.tenant_id)
    .eq('is_active', true)
    .single()

  if (!reward) {
    throw new Error('Reward not found or inactive')
  }

  const currentPoints = client.loyalty_points || 0
  if (currentPoints < reward.points_required) {
    throw new Error(`Insufficient points. Need ${reward.points_required}, have ${currentPoints}`)
  }

  // SECURITY: Atomic conditional update to prevent race condition (double-spend).
  // The WHERE clause ensures the update only succeeds if the client still has enough points.
  // Two concurrent requests: one will succeed, the other will get 0 rows updated.
  const { data: updateData, error: updateError } = await supabase
    .from('clients')
    .update({
      loyalty_points: currentPoints - reward.points_required,
    })
    .eq('id', client.id)
    .gte('loyalty_points', reward.points_required) // atomic check — prevents double-spend
    .select('loyalty_points')
    .single()

  if (updateError || !updateData) {
    // If gte check failed, another concurrent redemption already consumed the points
    console.error(
      '[clientRedeemReward] Atomic update failed (likely concurrent redemption):',
      updateError
    )
    throw new Error(
      'Failed to redeem — points may have been used by another redemption. Please try again.'
    )
  }

  const newBalance = updateData.loyalty_points

  // Insert the redemption transaction AFTER the atomic balance update succeeds
  const { data: txData, error: txError } = await supabase
    .from('loyalty_transactions')
    .insert({
      tenant_id: client.tenant_id,
      client_id: client.id,
      event_id: null,
      type: 'redeemed',
      points: -reward.points_required,
      description: `Redeemed: ${reward.name}`,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (txError) {
    console.error('[clientRedeemReward] Transaction log error:', txError)
    // Balance was already deducted atomically — log failure is non-blocking
    // The points are correctly deducted even if the audit row fails
  }

  // Create a pending delivery record so the chef knows what to honour.
  // Non-blocking — delivery tracking failure must not roll back the redemption.
  if (txData?.id) {
    try {
      const { createPendingDelivery } = await import('@/lib/loyalty/auto-award')
      await createPendingDelivery({
        tenantId: client.tenant_id,
        clientId: client.id,
        loyaltyTransactionId: txData.id,
        rewardId: reward.id,
        rewardName: reward.name,
        rewardType: reward.reward_type,
        pointsSpent: reward.points_required,
        rewardValueCents: reward.reward_value_cents ?? null,
        rewardPercent: reward.reward_percent ?? null,
        redeemedBy: 'client',
      })
    } catch (delivErr) {
      console.error(
        '[clientRedeemReward] Pending delivery creation failed (non-blocking):',
        delivErr
      )
    }
  }

  // Notify the chef that a client has redeemed a reward (non-blocking)
  try {
    const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
    const chefUserId = await getChefAuthUserId(client.tenant_id)
    if (chefUserId) {
      await createNotification({
        tenantId: client.tenant_id,
        recipientId: chefUserId,
        category: 'loyalty',
        action: 'reward_redeemed_by_client',
        title: 'Reward redeemed',
        body: `A client redeemed "${reward.name}" — mark it as delivered at their next event.`,
        actionUrl: '/loyalty',
        clientId: client.id,
      })
    }
  } catch (notifErr) {
    console.error('[clientRedeemReward] Chef notification failed (non-blocking):', notifErr)
  }

  revalidatePath('/my-rewards')
  revalidatePath('/my-events')

  return {
    success: true as const,
    newBalance,
    tier: client.loyalty_tier,
    reward,
  }
}
