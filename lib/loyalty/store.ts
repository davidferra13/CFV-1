// Tenant-explicit loyalty helpers for API v2 routes.
// Accepts tenantId directly instead of calling requireChef().
// Every function here is safe to call from API-key contexts (no session dependency).

import { createServerClient } from '@/lib/db/server'
import { z } from 'zod'
import type {
  LoyaltyConfig,
  LoyaltyTier,
  LoyaltyTransaction,
  LoyaltyReward,
  LoyaltyTransactionType,
  ClientLoyaltyProfile,
  LoyaltyOverview,
  AdjustLoyaltyInput,
} from './actions'
import { computeTier, getNextTier, getTierThreshold } from './loyalty-core'

// Default rewards seeded on first config creation
const DEFAULT_REWARDS = [
  {
    name: 'Complimentary appetizer course',
    points_required: 50,
    reward_type: 'free_course',
    description: 'A bonus appetizer course added to your next dinner',
  },
  {
    name: 'Complimentary dessert course',
    points_required: 75,
    reward_type: 'free_course',
    description: 'A bonus dessert course added to your next dinner',
  },
  {
    name: '$25 off your next dinner',
    points_required: 100,
    reward_type: 'discount_fixed',
    reward_value_cents: 2500,
    description: '$25 discount on your next booking',
  },
  {
    name: '15% off dinner for two',
    points_required: 150,
    reward_type: 'discount_percent',
    reward_percent: 15,
    description: '15% discount on a dinner for two',
  },
  {
    name: "Chef's tasting menu experience",
    points_required: 200,
    reward_type: 'upgrade',
    description: 'Bonus courses and elevated presentation on your next dinner',
  },
  {
    name: '50% off a dinner for two',
    points_required: 250,
    reward_type: 'discount_percent',
    reward_percent: 50,
    description: 'Half-price dinner for two',
  },
]

const UpdateLoyaltyConfigSchema = z.object({
  points_per_guest: z.number().int().positive().optional(),
  bonus_large_party_threshold: z.number().int().positive().optional(),
  bonus_large_party_points: z.number().int().nonnegative().optional(),
  milestone_bonuses: z
    .array(z.object({ events: z.number().int().positive(), bonus: z.number().int().positive() }))
    .optional(),
  tier_silver_min: z.number().int().positive().optional(),
  tier_gold_min: z.number().int().positive().optional(),
  tier_platinum_min: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  welcome_points: z.number().int().nonnegative().optional(),
  referral_points: z.number().int().nonnegative().optional(),
  program_mode: z.enum(['full', 'lite', 'off']).optional(),
  earn_mode: z.enum(['per_guest', 'per_dollar', 'per_event']).optional(),
  points_per_dollar: z.coerce.number().positive().optional(),
  points_per_event: z.coerce.number().int().positive().optional(),
  tier_perks: z.record(z.string(), z.array(z.string())).optional(),
  guest_milestones: z
    .array(z.object({ guests: z.number().int().positive(), bonus: z.number().int().positive() }))
    .optional(),
  base_points_per_event: z.number().int().nonnegative().optional(),
  trigger_config: z
    .record(z.string(), z.object({ enabled: z.boolean(), points: z.number() }))
    .optional(),
})

function castConfig(raw: any): LoyaltyConfig {
  return {
    ...raw,
    milestone_bonuses: raw.milestone_bonuses as { events: number; bonus: number }[],
    welcome_points: raw.welcome_points ?? 0,
    referral_points: raw.referral_points ?? 0,
    tier_perks: (raw.tier_perks ?? {}) as Record<string, string[]>,
    guest_milestones: (raw.guest_milestones ?? []) as { guests: number; bonus: number }[],
    base_points_per_event: raw.base_points_per_event ?? 0,
    trigger_config: (raw.trigger_config ?? {}) as Record<
      string,
      { enabled: boolean; points: number }
    >,
  }
}

/**
 * Get loyalty config for a tenant. Creates default config + seeds rewards if none exists.
 * The createdBy param is the auth_user_id to attribute seed rewards to.
 */
export async function getLoyaltyConfigForTenant(
  tenantId: string,
  createdBy?: string
): Promise<LoyaltyConfig> {
  const db: any = createServerClient({ admin: true })

  const { data: config, error } = await db
    .from('loyalty_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (error || !config) {
    const { data: newConfig, error: createError } = await db
      .from('loyalty_config')
      .insert({ tenant_id: tenantId })
      .select()
      .single()

    if (createError || !newConfig) {
      console.error('[store.getLoyaltyConfigForTenant] Error creating default config:', createError)
      throw new Error('Failed to initialize loyalty program')
    }

    // Seed default rewards
    const rewardsToInsert = DEFAULT_REWARDS.map((r, i) => ({
      tenant_id: tenantId,
      name: r.name,
      description: r.description || null,
      points_required: r.points_required,
      reward_type: r.reward_type,
      reward_value_cents: (r as any).reward_value_cents || null,
      reward_percent: (r as any).reward_percent || null,
      sort_order: i,
      created_by: createdBy ?? tenantId,
      updated_by: createdBy ?? tenantId,
    }))

    await db.from('loyalty_rewards').insert(rewardsToInsert)
    return castConfig(newConfig)
  }

  return castConfig(config)
}

/**
 * Update loyalty config for a tenant. Validates input, handles trigger_config,
 * and recalculates tiers if thresholds changed.
 */
export async function updateLoyaltyConfigForTenant(
  tenantId: string,
  input: unknown
): Promise<{ success: boolean; config?: LoyaltyConfig; error?: string }> {
  const parsed = UpdateLoyaltyConfigSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.message }
  }

  const validated = parsed.data
  const db: any = createServerClient({ admin: true })

  // Validate trigger_config keys against the registry
  if (validated.trigger_config) {
    const { validateTriggerConfig } = await import('@/lib/loyalty/triggers')
    ;(validated as any).trigger_config = validateTriggerConfig(validated.trigger_config)
  }

  // Ensure config exists
  await getLoyaltyConfigForTenant(tenantId)

  const { data: config, error } = await db
    .from('loyalty_config')
    .update(validated)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) {
    return { success: false, error: 'Failed to update loyalty configuration' }
  }

  return { success: true, config: castConfig(config) }
}

// =====================================================================================
// Loyalty Overview (dashboard stats)
// =====================================================================================

export async function getLoyaltyOverviewForTenant(tenantId: string): Promise<LoyaltyOverview> {
  const db: any = createServerClient({ admin: true })
  const config = await getLoyaltyConfigForTenant(tenantId)

  const { data: clients } = await db
    .from('clients')
    .select(
      'id, full_name, loyalty_points, loyalty_tier, total_events_completed, total_guests_served'
    )
    .eq('tenant_id', tenantId)
    .order('loyalty_points', { ascending: false })

  const allClients = clients || []
  const clientsPerTier: Record<LoyaltyTier, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0 }
  for (const c of allClients) {
    const tier = (c.loyalty_tier || 'bronze') as LoyaltyTier
    clientsPerTier[tier]++
  }

  const totalPointsOutstanding = allClients.reduce(
    (sum: number, c: any) => sum + (c.loyalty_points || 0),
    0
  )

  const topClients = allClients.slice(0, 10).map((c: any) => ({
    id: c.id,
    full_name: c.full_name,
    loyalty_points: c.loyalty_points || 0,
    loyalty_tier: (c.loyalty_tier || 'bronze') as LoyaltyTier,
  }))

  const { data: recentAwards } = await db
    .from('loyalty_transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('type', ['earned', 'bonus'])
    .order('created_at', { ascending: false })
    .limit(10)

  const clientsApproachingTierUpgrade = allClients
    .map((c: any) => {
      const tier = (c.loyalty_tier || 'bronze') as LoyaltyTier
      const nextTier = getNextTier(tier)
      if (!nextTier) return null
      const threshold = getTierThreshold(nextTier.key, config)
      const pointsNeeded = threshold - (c.loyalty_points || 0)
      if (pointsNeeded <= 0 || pointsNeeded > threshold * 0.2) return null
      return {
        id: c.id,
        full_name: c.full_name,
        loyalty_points: c.loyalty_points || 0,
        loyalty_tier: tier,
        pointsToNextTier: pointsNeeded,
        nextTierName: nextTier.name,
      }
    })
    .filter((c: any): c is NonNullable<typeof c> => c !== null)

  return {
    programMode: config.program_mode,
    earnMode: config.earn_mode,
    totalClients: allClients.length,
    clientsPerTier,
    totalPointsOutstanding,
    topClients,
    recentAwards: (recentAwards || []) as LoyaltyTransaction[],
    clientsApproachingTierUpgrade,
  }
}

// =====================================================================================
// Rewards CRUD
// =====================================================================================

export async function getRewardsForTenant(tenantId: string): Promise<LoyaltyReward[]> {
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('loyalty_rewards')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  if (error) throw new Error('Failed to fetch rewards')
  return data as LoyaltyReward[]
}

export async function createRewardForTenant(
  tenantId: string,
  input: {
    name: string
    description?: string
    points_required: number
    reward_type: string
    reward_value_cents?: number
    reward_percent?: number
  },
  actorId?: string
) {
  const db: any = createServerClient({ admin: true })
  const { data: reward, error } = await db
    .from('loyalty_rewards')
    .insert({
      tenant_id: tenantId,
      name: input.name,
      description: input.description || null,
      points_required: input.points_required,
      reward_type: input.reward_type,
      reward_value_cents: input.reward_value_cents || null,
      reward_percent: input.reward_percent || null,
      created_by: actorId ?? tenantId,
      updated_by: actorId ?? tenantId,
    })
    .select()
    .single()

  if (error) throw new Error('Failed to create reward')
  return { success: true, reward }
}

export async function updateRewardForTenant(
  tenantId: string,
  rewardId: string,
  input: Record<string, unknown>,
  actorId?: string
) {
  const db: any = createServerClient({ admin: true })
  const { data: reward, error } = await db
    .from('loyalty_rewards')
    .update({ ...input, updated_by: actorId ?? tenantId })
    .eq('id', rewardId)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw new Error('Failed to update reward')
  return { success: true, reward }
}

export async function deactivateRewardForTenant(
  tenantId: string,
  rewardId: string,
  actorId?: string
) {
  const db: any = createServerClient({ admin: true })
  const { error } = await db
    .from('loyalty_rewards')
    .update({ is_active: false, updated_by: actorId ?? tenantId })
    .eq('id', rewardId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error('Failed to deactivate reward')
  return { success: true }
}

// =====================================================================================
// Award Event Points
// =====================================================================================

export async function awardEventPointsForTenant(
  tenantId: string,
  eventId: string,
  actorId?: string
) {
  const db: any = createServerClient({ admin: true })

  const { data: event, error: eventError } = await db
    .from('events')
    .select(
      'id, client_id, tenant_id, guest_count, loyalty_points_awarded, status, total_price_cents'
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (eventError || !event) throw new Error('Event not found')
  if (event.status !== 'completed')
    throw new Error('Points can only be awarded for completed events')

  // Atomic claim: prevents double-award race between UI action and API store
  const { data: claimed } = await db
    .from('events')
    .update({ loyalty_points_awarded: true })
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .eq('loyalty_points_awarded', false)
    .select('id')

  if (!claimed || claimed.length === 0)
    return { success: true, alreadyAwarded: true, pointsAwarded: 0 }

  const config = await getLoyaltyConfigForTenant(tenantId)
  if (!config.is_active || config.program_mode === 'off')
    return { success: true, programInactive: true, pointsAwarded: 0 }
  if (config.program_mode === 'lite')
    return { success: true, programInactive: true, pointsAwarded: 0 }

  const guestCount = event.guest_count || 1
  let basePoints: number
  let baseDescription: string

  switch (config.earn_mode) {
    case 'per_dollar': {
      const dollars = ((event as any).total_price_cents || 0) / 100
      basePoints = Math.round(dollars * config.points_per_dollar)
      baseDescription = `$${dollars.toFixed(2)} x ${config.points_per_dollar} pts/$`
      break
    }
    case 'per_event': {
      basePoints = config.points_per_event
      baseDescription = `Flat ${config.points_per_event} pts per event`
      break
    }
    case 'per_guest':
    default: {
      basePoints = guestCount * config.points_per_guest
      baseDescription = `${guestCount} guests x ${config.points_per_guest} pts/guest`
      break
    }
  }

  let totalPoints = basePoints
  const transactions: { type: LoyaltyTransactionType; points: number; description: string }[] = [
    { type: 'earned', points: basePoints, description: baseDescription },
  ]

  const basePerEvent = config.base_points_per_event || 0
  if (basePerEvent > 0) {
    totalPoints += basePerEvent
    transactions.push({
      type: 'earned',
      points: basePerEvent,
      description: `Base event bonus: ${basePerEvent} pts`,
    })
  }

  if (config.bonus_large_party_threshold && guestCount >= config.bonus_large_party_threshold) {
    totalPoints += config.bonus_large_party_points || 0
    transactions.push({
      type: 'bonus',
      points: config.bonus_large_party_points || 0,
      description: `Large party bonus (${guestCount}+ guests)`,
    })
  }

  const { data: client } = await db
    .from('clients')
    .select('full_name, total_events_completed, total_guests_served, loyalty_points')
    .eq('id', event.client_id)
    .eq('tenant_id', tenantId)
    .single()

  const { data: oldLifetimeData } = await db
    .from('loyalty_transactions')
    .select('points')
    .eq('client_id', event.client_id)
    .eq('tenant_id', tenantId)
    .in('type', ['earned', 'bonus'])

  const oldLifetimeEarned = (oldLifetimeData || []).reduce(
    (sum: number, tx: { points: number }) => sum + tx.points,
    0
  )
  const oldTier = computeTier(oldLifetimeEarned, config)
  const currentEventsCompleted = (client?.total_events_completed || 0) + 1

  for (const milestone of config.milestone_bonuses) {
    if (currentEventsCompleted === milestone.events) {
      totalPoints += milestone.bonus
      transactions.push({
        type: 'bonus',
        points: milestone.bonus,
        description: `Milestone bonus: ${milestone.events}th event completed!`,
      })
    }
  }

  const oldGuestsServed = client?.total_guests_served || 0
  const newGuestsServed = oldGuestsServed + guestCount
  for (const milestone of config.guest_milestones || []) {
    if (oldGuestsServed < milestone.guests && newGuestsServed >= milestone.guests) {
      totalPoints += milestone.bonus
      transactions.push({
        type: 'bonus',
        points: milestone.bonus,
        description: `Guest milestone: ${milestone.guests} guests served!`,
      })
    }
  }

  for (const tx of transactions) {
    await db.from('loyalty_transactions').insert({
      tenant_id: tenantId,
      client_id: event.client_id,
      event_id: eventId,
      type: tx.type,
      points: tx.points,
      description: tx.description,
      created_by: actorId ?? tenantId,
    })
  }

  const newPointsBalance = (client?.loyalty_points || 0) + totalPoints
  const { data: lifetimeData } = await db
    .from('loyalty_transactions')
    .select('points')
    .eq('client_id', event.client_id)
    .eq('tenant_id', tenantId)
    .in('type', ['earned', 'bonus'])

  const lifetimeEarned = (lifetimeData || []).reduce((sum: number, tx: any) => sum + tx.points, 0)
  const newTier = computeTier(lifetimeEarned, config)

  await db
    .from('clients')
    .update({
      loyalty_points: newPointsBalance,
      loyalty_tier: newTier,
      total_events_completed: currentEventsCompleted,
      total_guests_served: newGuestsServed,
    })
    .eq('id', event.client_id)
    .eq('tenant_id', tenantId)

  // Non-blocking notifications
  try {
    const { createClientNotification } = await import('@/lib/notifications/client-actions')
    await createClientNotification({
      tenantId,
      clientId: event.client_id,
      category: 'loyalty',
      action: 'points_awarded',
      title: `You earned ${totalPoints} loyalty points!`,
      body: `Your new balance is ${newPointsBalance} points`,
      actionUrl: '/my-rewards',
      eventId,
    })
    if (newTier !== oldTier) {
      await createClientNotification({
        tenantId,
        clientId: event.client_id,
        category: 'loyalty',
        action: 'tier_upgraded',
        title: `You reached ${newTier} tier!`,
        body: `Congratulations! You've been upgraded to ${newTier}`,
        actionUrl: '/my-rewards',
        eventId,
      })
    }
  } catch (err) {
    console.error('[store.awardEventPoints] Notification failed (non-blocking):', err)
  }

  // Note: loyalty_points_awarded already set atomically at claim time (top of function)

  try {
    const { broadcastUpdate } = await import('@/lib/realtime/broadcast')
    broadcastUpdate('loyalty', tenantId, {
      clientId: event.client_id,
      type: 'points_awarded',
      points: totalPoints,
      newBalance: newPointsBalance,
      newTier,
      tierChanged: newTier !== oldTier,
    })
  } catch {
    // non-blocking
  }

  return {
    success: true,
    pointsAwarded: totalPoints,
    newBalance: newPointsBalance,
    newTier,
    tierChanged: newTier !== oldTier,
    transactions,
  }
}

// =====================================================================================
// Client Loyalty Profile
// =====================================================================================

export async function getClientLoyaltyProfileForTenant(
  tenantId: string,
  clientId: string
): Promise<ClientLoyaltyProfile> {
  const db: any = createServerClient({ admin: true })

  const { data: client } = await db
    .from('clients')
    .select('id, loyalty_points, loyalty_tier, total_events_completed, total_guests_served')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) throw new Error('Client not found')

  const config = await getLoyaltyConfigForTenant(tenantId)

  const { data: lifetimeData } = await db
    .from('loyalty_transactions')
    .select('points')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .in('type', ['earned', 'bonus'])

  const lifetimeEarned = (lifetimeData || []).reduce((sum: number, tx: any) => sum + tx.points, 0)

  const { data: transactions } = await db
    .from('loyalty_transactions')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: rewards } = await db
    .from('loyalty_rewards')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .lte('points_required', client.loyalty_points || 0)
    .order('points_required', { ascending: true })

  const currentTier = (client.loyalty_tier || 'bronze') as LoyaltyTier
  const nextTierInfo = getNextTier(currentTier)
  let pointsToNextTier = 0
  if (nextTierInfo) {
    const threshold = getTierThreshold(nextTierInfo.key, config)
    pointsToNextTier = Math.max(0, threshold - lifetimeEarned)
  }

  const eventsCompleted = client.total_events_completed || 0
  const upcomingMilestones = config.milestone_bonuses
    .filter((m) => m.events > eventsCompleted)
    .sort((a, b) => a.events - b.events)

  const nextMilestone =
    upcomingMilestones.length > 0
      ? {
          eventsNeeded: upcomingMilestones[0].events - eventsCompleted,
          bonus: upcomingMilestones[0].bonus,
        }
      : null

  return {
    currentTier,
    pointsBalance: client.loyalty_points || 0,
    pointsToNextTier,
    nextTierName: nextTierInfo?.name || null,
    totalEventsCompleted: client.total_events_completed || 0,
    totalGuestsServed: client.total_guests_served || 0,
    lifetimePointsEarned: lifetimeEarned,
    availableRewards: (rewards || []) as LoyaltyReward[],
    transactionHistory: (transactions || []) as LoyaltyTransaction[],
    nextMilestone,
  }
}

// =====================================================================================
// Bonus Points (delegates to existing internal helper)
// =====================================================================================

export async function awardBonusPointsForTenant(
  tenantId: string,
  clientId: string,
  points: number,
  description: string,
  actorId?: string
) {
  const { awardBonusPointsInternal } = await import('@/lib/loyalty/award-internal')
  return awardBonusPointsInternal(
    tenantId,
    clientId,
    points,
    description || 'Manual bonus',
    actorId ?? tenantId
  )
}

// =====================================================================================
// Redeem Reward
// =====================================================================================

export async function redeemRewardForTenant(
  tenantId: string,
  clientId: string,
  rewardId: string,
  actorId?: string,
  eventId?: string
) {
  const db: any = createServerClient({ admin: true })

  const { data: client } = await db
    .from('clients')
    .select('id, loyalty_points, loyalty_tier')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) throw new Error('Client not found')

  const { data: reward } = await db
    .from('loyalty_rewards')
    .select('*')
    .eq('id', rewardId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single()

  if (!reward) throw new Error('Reward not found or inactive')
  if ((client.loyalty_points || 0) < reward.points_required) {
    throw new Error(
      `Insufficient points. Need ${reward.points_required}, have ${client.loyalty_points || 0}`
    )
  }

  const { data: txData, error: txError } = await db
    .from('loyalty_transactions')
    .insert({
      tenant_id: tenantId,
      client_id: clientId,
      event_id: eventId || null,
      type: 'redeemed',
      points: -reward.points_required,
      description: `Redeemed: ${reward.name}`,
      created_by: actorId ?? tenantId,
    })
    .select('id')
    .single()

  if (txError) throw new Error('Failed to redeem reward')

  const newBalance = (client.loyalty_points || 0) - reward.points_required
  const { data: updatedClient } = await db
    .from('clients')
    .update({ loyalty_points: newBalance })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .gte('loyalty_points', reward.points_required)
    .select('id')
    .maybeSingle()

  if (!updatedClient) {
    if (txData?.id) {
      await db.from('loyalty_transactions').delete().eq('id', txData.id)
    }
    throw new Error('Insufficient points (concurrent redemption)')
  }

  // Non-blocking: pending delivery
  if (txData?.id) {
    try {
      const { createPendingDelivery } = await import('@/lib/loyalty/auto-award')
      await createPendingDelivery({
        tenantId,
        clientId,
        loyaltyTransactionId: txData.id,
        rewardId: reward.id,
        rewardName: reward.name,
        rewardType: reward.reward_type,
        pointsSpent: reward.points_required,
        rewardValueCents: reward.reward_value_cents ?? null,
        rewardPercent: reward.reward_percent ?? null,
        redeemedBy: 'chef',
      })
    } catch (err) {
      console.error('[store.redeemReward] Pending delivery failed (non-blocking):', err)
    }
  }

  // Non-blocking: ledger entry for monetary rewards
  if (reward.reward_value_cents && reward.reward_value_cents > 0 && eventId) {
    try {
      const { appendLedgerEntryInternal } = await import('@/lib/ledger/append-internal')
      await appendLedgerEntryInternal({
        tenant_id: tenantId,
        client_id: clientId,
        event_id: eventId,
        entry_type: 'credit',
        amount_cents: -reward.reward_value_cents,
        payment_method: 'cash',
        description: `Loyalty reward: ${reward.name}`,
        internal_notes: `Redeemed ${reward.points_required} points (transaction: ${txData?.id})`,
        created_by: actorId ?? tenantId,
      })
    } catch (err) {
      console.error('[store.redeemReward] Ledger entry failed (non-blocking):', err)
    }
  }

  try {
    const { broadcastUpdate } = await import('@/lib/realtime/broadcast')
    broadcastUpdate('loyalty', tenantId, {
      clientId,
      type: 'reward_redeemed',
      rewardName: reward.name,
      pointsSpent: reward.points_required,
      newBalance,
    })
  } catch {
    // non-blocking
  }

  return { success: true, reward, newBalance, tier: client.loyalty_tier }
}

// =====================================================================================
// Loyalty Transactions
// =====================================================================================

export async function getLoyaltyTransactionsForTenant(
  tenantId: string,
  clientId: string
): Promise<LoyaltyTransaction[]> {
  const db: any = createServerClient({ admin: true })
  const { data, error } = await db
    .from('loyalty_transactions')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw new Error('Failed to fetch loyalty transactions')
  return data as LoyaltyTransaction[]
}

// =====================================================================================
// Adjust Client Loyalty (manual chef adjustment)
// =====================================================================================

const AdjustLoyaltySchema = z.object({
  clientId: z.string().uuid(),
  adjustmentPoints: z.number().int().optional(),
  adjustmentReason: z.string().min(1).optional(),
  overrideTier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  overrideEventsCompleted: z.number().int().min(0).optional(),
  overrideGuestsServed: z.number().int().min(0).optional(),
  resetPoints: z.boolean().optional(),
})

export async function adjustClientLoyaltyForTenant(
  tenantId: string,
  input: AdjustLoyaltyInput,
  actorId?: string
) {
  const validated = AdjustLoyaltySchema.parse(input)
  const db: any = createServerClient({ admin: true })

  const { data: client } = await db
    .from('clients')
    .select(
      'id, full_name, loyalty_points, loyalty_tier, total_events_completed, total_guests_served'
    )
    .eq('id', validated.clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!client) throw new Error('Client not found')

  const updates: Record<string, any> = {}
  const actions: string[] = []

  if (validated.adjustmentPoints && validated.adjustmentPoints !== 0) {
    const txType: LoyaltyTransactionType = validated.adjustmentPoints > 0 ? 'bonus' : 'adjustment'
    await db.from('loyalty_transactions').insert({
      tenant_id: tenantId,
      client_id: validated.clientId,
      type: txType,
      points: validated.adjustmentPoints,
      description:
        validated.adjustmentReason ||
        `Manual ${validated.adjustmentPoints > 0 ? 'bonus' : 'deduction'} by chef`,
      created_by: actorId ?? tenantId,
    })
    updates.loyalty_points = Math.max(0, (client.loyalty_points || 0) + validated.adjustmentPoints)
    actions.push(`${validated.adjustmentPoints > 0 ? '+' : ''}${validated.adjustmentPoints} points`)
  }

  if (validated.resetPoints) {
    const currentBalance = updates.loyalty_points ?? (client.loyalty_points || 0)
    if (currentBalance > 0) {
      await db.from('loyalty_transactions').insert({
        tenant_id: tenantId,
        client_id: validated.clientId,
        type: 'adjustment',
        points: -currentBalance,
        description: validated.adjustmentReason || 'Points reset to zero by chef',
        created_by: actorId ?? tenantId,
      })
      updates.loyalty_points = 0
      actions.push('Points reset to 0')
    }
  }

  if (validated.overrideTier) {
    updates.loyalty_tier = validated.overrideTier
    actions.push(`Tier set to ${validated.overrideTier}`)
  }
  if (validated.overrideEventsCompleted !== undefined) {
    updates.total_events_completed = validated.overrideEventsCompleted
    actions.push(`Events completed set to ${validated.overrideEventsCompleted}`)
  }
  if (validated.overrideGuestsServed !== undefined) {
    updates.total_guests_served = validated.overrideGuestsServed
    actions.push(`Guests served set to ${validated.overrideGuestsServed}`)
  }

  if (!validated.overrideTier && (validated.adjustmentPoints || validated.resetPoints)) {
    const config = await getLoyaltyConfigForTenant(tenantId)
    const { data: lifetimeData } = await db
      .from('loyalty_transactions')
      .select('points')
      .eq('client_id', validated.clientId)
      .eq('tenant_id', tenantId)
      .in('type', ['earned', 'bonus'])

    const lifetimeEarned = (lifetimeData || []).reduce((sum: number, tx: any) => sum + tx.points, 0)
    updates.loyalty_tier = computeTier(lifetimeEarned, config)
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await db
      .from('clients')
      .update(updates)
      .eq('id', validated.clientId)
      .eq('tenant_id', tenantId)
    if (error) throw new Error('Failed to update client loyalty data')
  }

  return { success: true, actions, updates }
}
