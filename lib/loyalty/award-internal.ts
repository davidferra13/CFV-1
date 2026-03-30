// Internal loyalty point awarding helper - NOT a server action file
// Used by both loyalty/actions.ts (manual bonus) and clients/referral-actions.ts (auto-referral)
// No 'use server' directive - prevents direct client invocation

import { createServerClient } from '@/lib/db/server'

type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'

function computeTierInternal(
  value: number,
  config: {
    tier_bronze_min: number
    tier_silver_min: number
    tier_gold_min: number
    tier_platinum_min: number
  }
): LoyaltyTier {
  if (value >= config.tier_platinum_min) return 'platinum'
  if (value >= config.tier_gold_min) return 'gold'
  if (value >= config.tier_silver_min) return 'silver'
  return 'bronze'
}

export async function awardBonusPointsInternal(
  tenantId: string,
  clientId: string,
  points: number,
  description: string,
  createdBy: string
): Promise<{ success: boolean; newBalance: number; newTier: LoyaltyTier }> {
  const db: any = createServerClient()

  if (points <= 0) {
    throw new Error('Bonus points must be positive')
  }

  // Verify client belongs to tenant
  const { data: client } = await db
    .from('clients')
    .select('id, loyalty_points, total_events_completed')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) {
    throw new Error('Client not found')
  }

  // Insert bonus transaction
  const { error: txError } = await db.from('loyalty_transactions').insert({
    tenant_id: tenantId,
    client_id: clientId,
    type: 'bonus',
    points,
    description: description || 'Bonus points',
    created_by: createdBy,
  })

  if (txError) {
    console.error('[awardBonusPointsInternal] Error:', txError)
    throw new Error('Failed to award bonus points')
  }

  // Update client balance
  const newBalance = (client.loyalty_points || 0) + points

  // Recalculate tier based on lifetime earned
  const { data: configRow } = await db
    .from('loyalty_config')
    .select('tier_bronze_min, tier_silver_min, tier_gold_min, tier_platinum_min')
    .eq('tenant_id', tenantId)
    .single()

  const { data: lifetimeData } = await db
    .from('loyalty_transactions')
    .select('points')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .in('type', ['earned', 'bonus'])

  const lifetimeEarned = (lifetimeData || []).reduce((sum: number, tx: any) => sum + tx.points, 0)
  const newTier = configRow
    ? computeTierInternal(lifetimeEarned, configRow as any)
    : ('bronze' as LoyaltyTier)

  await db
    .from('clients')
    .update({
      loyalty_points: newBalance,
      loyalty_tier: newTier,
    })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  // SSE real-time broadcast (non-blocking)
  try {
    const { broadcastUpdate } = await import('@/lib/realtime/broadcast')
    broadcastUpdate('loyalty', tenantId, {
      clientId,
      type: 'bonus_awarded',
      points,
      newBalance,
      newTier,
    })
  } catch (sseErr) {
    console.error('[awardBonusPointsInternal] SSE broadcast failed (non-blocking):', sseErr)
  }

  return { success: true, newBalance, newTier }
}
