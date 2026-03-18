// Loyalty Program Server Actions
// Universal loyalty system: full (points+tiers+rewards), lite (tiers only), or off
// Earn modes: per_guest, per_dollar, per_event - chef configurable
// Service-denominated rewards only - the chef never spends money

'use server'

import { requireChef, requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// =====================================================================================
// TYPES
// =====================================================================================

export type LoyaltyTier = 'bronze' | 'silver' | 'gold' | 'platinum'
export type LoyaltyTransactionType = 'earned' | 'redeemed' | 'bonus' | 'adjustment' | 'expired'
export type LoyaltyRewardType =
  | 'discount_fixed'
  | 'discount_percent'
  | 'free_course'
  | 'free_dinner'
  | 'upgrade'
export type ProgramMode = 'full' | 'lite' | 'off'
export type EarnMode = 'per_guest' | 'per_dollar' | 'per_event'

export type LoyaltyConfig = {
  id: string
  tenant_id: string
  points_per_guest: number
  bonus_large_party_threshold: number | null
  bonus_large_party_points: number | null
  milestone_bonuses: { events: number; bonus: number }[]
  tier_bronze_min: number
  tier_silver_min: number
  tier_gold_min: number
  tier_platinum_min: number
  is_active: boolean
  welcome_points: number // Auto-awarded on invitation-based signup
  referral_points: number // Manual award when a client refers someone new
  program_mode: ProgramMode // full = points+tiers+rewards, lite = tiers only, off = disabled
  earn_mode: EarnMode // per_guest, per_dollar, per_event
  points_per_dollar: number // Rate for per_dollar earn mode
  points_per_event: number // Flat points for per_event earn mode
}

export type LoyaltyTransaction = {
  id: string
  tenant_id: string
  client_id: string
  event_id: string | null
  type: LoyaltyTransactionType
  points: number
  description: string
  created_at: string
}

export type LoyaltyReward = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  points_required: number
  reward_type: LoyaltyRewardType
  reward_value_cents: number | null
  reward_percent: number | null
  is_active: boolean
  sort_order: number
}

export type ClientLoyaltyProfile = {
  currentTier: LoyaltyTier
  pointsBalance: number
  pointsToNextTier: number
  nextTierName: string | null
  totalEventsCompleted: number
  totalGuestsServed: number
  lifetimePointsEarned: number
  availableRewards: LoyaltyReward[]
  transactionHistory: LoyaltyTransaction[]
  nextMilestone: { eventsNeeded: number; bonus: number } | null
}

export type LoyaltyOverview = {
  programMode: ProgramMode
  earnMode: EarnMode
  totalClients: number
  clientsPerTier: Record<LoyaltyTier, number>
  totalPointsOutstanding: number
  topClients: { id: string; full_name: string; loyalty_points: number; loyalty_tier: LoyaltyTier }[]
  recentAwards: LoyaltyTransaction[]
  clientsApproachingTierUpgrade: {
    id: string
    full_name: string
    loyalty_points: number
    loyalty_tier: LoyaltyTier
    pointsToNextTier: number
    nextTierName: string
  }[]
}

export type ClientLoyaltySnapshot = {
  tier: LoyaltyTier
  pointsBalance: number
  lifetimePointsEarned: number
  totalEventsCompleted: number
  totalGuestsServed: number
  nextTierName: string | null
  pointsToNextTier: number
}

export type EventLoyaltyImpact = {
  isActive: boolean
  programMode: ProgramMode
  earnMode: EarnMode
  currentTier: LoyaltyTier
  pointsBalance: number
  lifetimePointsEarned: number
  nextTierName: string | null
  pointsToNextTier: number
  estimatedPoints: number
  estimatedBreakdown: string
}

// =====================================================================================
// VALIDATION SCHEMAS
// =====================================================================================

const UpdateLoyaltyConfigSchema = z.object({
  points_per_guest: z.number().int().positive().optional(),
  bonus_large_party_threshold: z.number().int().positive().optional(),
  bonus_large_party_points: z.number().int().nonnegative().optional(),
  milestone_bonuses: z
    .array(
      z.object({
        events: z.number().int().positive(),
        bonus: z.number().int().positive(),
      })
    )
    .optional(),
  tier_silver_min: z.number().int().positive().optional(),
  tier_gold_min: z.number().int().positive().optional(),
  tier_platinum_min: z.number().int().positive().optional(),
  is_active: z.boolean().optional(),
  welcome_points: z.number().int().nonnegative().optional(),
  referral_points: z.number().int().nonnegative().optional(),
  program_mode: z.enum(['full', 'lite', 'off']).optional(),
  earn_mode: z.enum(['per_guest', 'per_dollar', 'per_event']).optional(),
  points_per_dollar: z.number().positive().optional(),
  points_per_event: z.number().int().positive().optional(),
})

const CreateRewardSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  points_required: z.number().int().positive('Points must be positive'),
  reward_type: z.enum([
    'discount_fixed',
    'discount_percent',
    'free_course',
    'free_dinner',
    'upgrade',
  ]),
  reward_value_cents: z.number().int().positive().optional(),
  reward_percent: z.number().int().min(1).max(100).optional(),
})

const UpdateRewardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  points_required: z.number().int().positive().optional(),
  reward_type: z
    .enum(['discount_fixed', 'discount_percent', 'free_course', 'free_dinner', 'upgrade'])
    .optional(),
  reward_value_cents: z.number().int().positive().nullable().optional(),
  reward_percent: z.number().int().min(1).max(100).nullable().optional(),
  sort_order: z.number().int().optional(),
})

export type CreateRewardInput = z.infer<typeof CreateRewardSchema>
export type UpdateRewardInput = z.infer<typeof UpdateRewardSchema>

// =====================================================================================
// DEFAULT REWARDS CATALOG
// =====================================================================================

const DEFAULT_REWARDS: Omit<CreateRewardInput, 'tenant_id'>[] = [
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
  {
    name: 'Free dinner for two',
    points_required: 300,
    reward_type: 'free_dinner',
    description: 'Complimentary dinner for two (covers service, you cover ingredients)',
  },
]

// =====================================================================================
// HELPER: Compute tier from lifetime points
// =====================================================================================

function computeTier(lifetimePoints: number, config: LoyaltyConfig): LoyaltyTier {
  if (lifetimePoints >= config.tier_platinum_min) return 'platinum'
  if (lifetimePoints >= config.tier_gold_min) return 'gold'
  if (lifetimePoints >= config.tier_silver_min) return 'silver'
  return 'bronze'
}

function getNextTier(currentTier: LoyaltyTier): { name: string; key: LoyaltyTier } | null {
  const order: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum']
  const idx = order.indexOf(currentTier)
  if (idx >= order.length - 1) return null
  return { name: order[idx + 1], key: order[idx + 1] }
}

function getTierThreshold(tier: LoyaltyTier, config: LoyaltyConfig): number {
  switch (tier) {
    case 'bronze':
      return config.tier_bronze_min
    case 'silver':
      return config.tier_silver_min
    case 'gold':
      return config.tier_gold_min
    case 'platinum':
      return config.tier_platinum_min
  }
}

function estimatePointsFromConfig(
  config: LoyaltyConfig,
  guestCount: number,
  eventTotalCents: number
): { points: number; breakdown: string } {
  switch (config.earn_mode) {
    case 'per_dollar': {
      const dollars = Math.max(0, eventTotalCents) / 100
      const points = Math.round(dollars * config.points_per_dollar)
      return {
        points,
        breakdown: `$${dollars.toFixed(2)} x ${config.points_per_dollar} pts/$`,
      }
    }
    case 'per_event': {
      return {
        points: config.points_per_event,
        breakdown: `Flat ${config.points_per_event} pts per event`,
      }
    }
    case 'per_guest':
    default: {
      const safeGuestCount = Math.max(1, guestCount || 1)
      return {
        points: safeGuestCount * config.points_per_guest,
        breakdown: `${safeGuestCount} guests x ${config.points_per_guest} pts/guest`,
      }
    }
  }
}

export async function getClientLoyaltySnapshotByTenant(
  tenantId: string,
  clientId: string
): Promise<ClientLoyaltySnapshot | null> {
  const supabase: any = createServerClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, loyalty_tier, loyalty_points, total_events_completed, total_guests_served')
    .eq('tenant_id', tenantId)
    .eq('id', clientId)
    .single()

  if (!client) return null

  const config = await getLoyaltyConfigByTenant(tenantId)
  if (!config) return null

  const { data: earnedRows } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('tenant_id', tenantId)
    .eq('client_id', clientId)
    .in('type', ['earned', 'bonus'])

  const lifetimePointsEarned = (earnedRows || []).reduce(
    (sum: number, row: { points: number }) => sum + row.points,
    0
  )

  const tier = ((client.loyalty_tier || 'bronze') as LoyaltyTier) || 'bronze'
  const nextTier = getNextTier(tier)
  const pointsToNextTier = nextTier
    ? Math.max(0, getTierThreshold(nextTier.key, config) - lifetimePointsEarned)
    : 0

  return {
    tier,
    pointsBalance: client.loyalty_points || 0,
    lifetimePointsEarned,
    totalEventsCompleted: client.total_events_completed || 0,
    totalGuestsServed: client.total_guests_served || 0,
    nextTierName: nextTier?.name ?? null,
    pointsToNextTier,
  }
}

export async function getEventLoyaltyImpactByTenant(input: {
  tenantId: string
  clientId: string
  guestCount: number
  eventTotalCents: number
}): Promise<EventLoyaltyImpact | null> {
  const config = await getLoyaltyConfigByTenant(input.tenantId)
  if (!config) return null

  const snapshot = await getClientLoyaltySnapshotByTenant(input.tenantId, input.clientId)
  if (!snapshot) return null

  if (!config.is_active || config.program_mode === 'off') {
    return {
      isActive: false,
      programMode: config.program_mode,
      earnMode: config.earn_mode,
      currentTier: snapshot.tier,
      pointsBalance: snapshot.pointsBalance,
      lifetimePointsEarned: snapshot.lifetimePointsEarned,
      nextTierName: snapshot.nextTierName,
      pointsToNextTier: snapshot.pointsToNextTier,
      estimatedPoints: 0,
      estimatedBreakdown: 'Program inactive',
    }
  }

  if (config.program_mode === 'lite') {
    return {
      isActive: true,
      programMode: config.program_mode,
      earnMode: config.earn_mode,
      currentTier: snapshot.tier,
      pointsBalance: snapshot.pointsBalance,
      lifetimePointsEarned: snapshot.lifetimePointsEarned,
      nextTierName: snapshot.nextTierName,
      pointsToNextTier: snapshot.pointsToNextTier,
      estimatedPoints: 0,
      estimatedBreakdown: 'Lite mode: visit-based recognition',
    }
  }

  const baseEstimate = estimatePointsFromConfig(config, input.guestCount, input.eventTotalCents)
  let estimatedPoints = baseEstimate.points
  const parts: string[] = [baseEstimate.breakdown]

  if (
    config.bonus_large_party_threshold &&
    input.guestCount >= config.bonus_large_party_threshold &&
    (config.bonus_large_party_points || 0) > 0
  ) {
    estimatedPoints += config.bonus_large_party_points || 0
    parts.push(`+${config.bonus_large_party_points} large-party bonus`)
  }

  return {
    isActive: true,
    programMode: config.program_mode,
    earnMode: config.earn_mode,
    currentTier: snapshot.tier,
    pointsBalance: snapshot.pointsBalance,
    lifetimePointsEarned: snapshot.lifetimePointsEarned,
    nextTierName: snapshot.nextTierName,
    pointsToNextTier: snapshot.pointsToNextTier,
    estimatedPoints,
    estimatedBreakdown: parts.join(' | '),
  }
}

// =====================================================================================
// 1. getLoyaltyConfig - Returns the chef's loyalty program configuration
// =====================================================================================

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: config, error } = await supabase
    .from('loyalty_config')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !config) {
    // Create default config + seed default rewards
    const { data: newConfig, error: createError } = await supabase
      .from('loyalty_config')
      .insert({
        tenant_id: user.tenantId!,
      })
      .select()
      .single()

    if (createError || !newConfig) {
      console.error('[getLoyaltyConfig] Error creating default config:', createError)
      throw new Error('Failed to initialize loyalty program')
    }

    // Seed default rewards
    const rewardsToInsert = DEFAULT_REWARDS.map((r, i) => ({
      tenant_id: user.tenantId!,
      name: r.name,
      description: r.description || null,
      points_required: r.points_required,
      reward_type: r.reward_type,
      reward_value_cents: r.reward_value_cents || null,
      reward_percent: r.reward_percent || null,
      sort_order: i,
      created_by: user.id,
      updated_by: user.id,
    }))

    await supabase.from('loyalty_rewards').insert(rewardsToInsert)

    return {
      ...(newConfig as any),
      milestone_bonuses: (newConfig as any).milestone_bonuses as {
        events: number
        bonus: number
      }[],
      welcome_points: (newConfig as any).welcome_points ?? 0,
      referral_points: (newConfig as any).referral_points ?? 0,
    }
  }

  return {
    ...(config as any),
    milestone_bonuses: (config as any).milestone_bonuses as { events: number; bonus: number }[],
    welcome_points: (config as any).welcome_points ?? 0,
    referral_points: (config as any).referral_points ?? 0,
  }
}

// =====================================================================================
// 2. updateLoyaltyConfig - Update loyalty program settings
// =====================================================================================

export async function updateLoyaltyConfig(input: z.infer<typeof UpdateLoyaltyConfigSchema>) {
  const user = await requireChef()
  const validated = UpdateLoyaltyConfigSchema.parse(input)
  const supabase: any = createServerClient()

  // Ensure config exists
  await getLoyaltyConfig()

  const { data: config, error } = await supabase
    .from('loyalty_config')
    .update(validated)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateLoyaltyConfig] Error:', error)
    throw new Error('Failed to update loyalty configuration')
  }

  revalidatePath('/loyalty')
  revalidatePath('/settings')
  return { success: true, config }
}

// =====================================================================================
// 3. awardEventPoints - Called when event reaches 'completed'
// =====================================================================================

export async function awardEventPoints(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch event with client info (include total_price_cents for per_dollar earn mode)
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select(
      'id, client_id, tenant_id, guest_count, loyalty_points_awarded, status, total_price_cents'
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  if (event.loyalty_points_awarded) {
    return { success: true, alreadyAwarded: true, pointsAwarded: 0 }
  }

  if (event.status !== 'completed') {
    throw new Error('Points can only be awarded for completed events')
  }

  // Get loyalty config
  const config = await getLoyaltyConfig()

  if (!config.is_active || config.program_mode === 'off') {
    return { success: true, programInactive: true, pointsAwarded: 0 }
  }

  if (config.program_mode === 'lite') {
    // Lite mode: visit-based tiers only, no points - handled by awardLiteVisit()
    return { success: true, programInactive: true, pointsAwarded: 0 }
  }

  // Full mode: compute base points based on earn mode
  const guestCount = event.guest_count || 1
  let basePoints: number
  let baseDescription: string

  switch (config.earn_mode) {
    case 'per_dollar': {
      const eventTotalCents = (event as any).total_price_cents || 0
      const eventTotalDollars = eventTotalCents / 100
      basePoints = Math.round(eventTotalDollars * config.points_per_dollar)
      baseDescription = `$${eventTotalDollars.toFixed(2)} × ${config.points_per_dollar} pts/$`
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
      baseDescription = `${guestCount} guests × ${config.points_per_guest} pts/guest`
      break
    }
  }

  let totalPoints = basePoints
  const transactions: { type: LoyaltyTransactionType; points: number; description: string }[] = []

  // Base points
  transactions.push({
    type: 'earned',
    points: basePoints,
    description: baseDescription,
  })

  // Large party bonus
  if (config.bonus_large_party_threshold && guestCount >= config.bonus_large_party_threshold) {
    totalPoints += config.bonus_large_party_points || 0
    transactions.push({
      type: 'bonus',
      points: config.bonus_large_party_points || 0,
      description: `Large party bonus (${guestCount}+ guests)`,
    })
  }

  // Get current client stats for milestone check
  const { data: client } = await supabase
    .from('clients')
    .select('full_name, total_events_completed, total_guests_served, loyalty_points')
    .eq('id', event.client_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  // Compute old lifetime earned points BEFORE any new transactions are inserted (for tier change detection)
  const { data: oldLifetimeData } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('client_id', event.client_id)
    .eq('tenant_id', user.tenantId!)
    .in('type', ['earned', 'bonus'])

  const oldLifetimeEarned = (oldLifetimeData || []).reduce(
    (sum: number, tx: { points: number }) => sum + tx.points,
    0
  )
  const oldTier = computeTier(oldLifetimeEarned, config)

  const currentEventsCompleted = (client?.total_events_completed || 0) + 1 // +1 for this event

  // Milestone bonuses
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

  // Insert all loyalty transactions
  for (const tx of transactions) {
    const { error: txError } = await supabase.from('loyalty_transactions').insert({
      tenant_id: user.tenantId!,
      client_id: event.client_id,
      event_id: eventId,
      type: tx.type,
      points: tx.points,
      description: tx.description,
      created_by: user.id,
    })

    if (txError) {
      console.error('[awardEventPoints] Transaction insert error:', txError)
    }
  }

  // Update client stats
  const newPointsBalance = (client?.loyalty_points || 0) + totalPoints
  const newGuestsServed = (client?.total_guests_served || 0) + guestCount

  // Compute lifetime earned points for tier calculation
  const { data: lifetimeData } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('client_id', event.client_id)
    .eq('tenant_id', user.tenantId!)
    .in('type', ['earned', 'bonus'])

  const lifetimeEarned = (lifetimeData || []).reduce((sum: number, tx: any) => sum + tx.points, 0)
  const newTier = computeTier(lifetimeEarned, config)

  const { error: updateError } = await supabase
    .from('clients')
    .update({
      loyalty_points: newPointsBalance,
      loyalty_tier: newTier,
      total_events_completed: currentEventsCompleted,
      total_guests_served: newGuestsServed,
    })
    .eq('id', event.client_id)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[awardEventPoints] Client update error:', updateError)
  }

  // Non-blocking: notify client of points earned
  try {
    const { createClientNotification } = await import('@/lib/notifications/client-actions')
    await createClientNotification({
      tenantId: user.tenantId!,
      clientId: event.client_id,
      category: 'loyalty',
      action: 'points_awarded',
      title: `You earned ${totalPoints} loyalty points!`,
      body: `Your new balance is ${newPointsBalance} points`,
      actionUrl: '/my-rewards',
      eventId,
    })

    // If tier changed, send a second notification
    if (newTier !== oldTier) {
      await createClientNotification({
        tenantId: user.tenantId!,
        clientId: event.client_id,
        category: 'loyalty',
        action: 'tier_upgraded',
        title: `You reached ${newTier} tier!`,
        body: `Congratulations! You've been upgraded to ${newTier}`,
        actionUrl: '/my-rewards',
        eventId,
      })

      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(user.tenantId!)
      if (chefUserId) {
        await createNotification({
          tenantId: user.tenantId!,
          recipientId: chefUserId,
          category: 'loyalty',
          action: 'tier_upgraded',
          title: 'Client tier upgraded',
          body: `${client?.full_name || 'A client'} reached ${newTier} tier`,
          actionUrl: `/clients/${event.client_id}`,
          clientId: event.client_id,
          eventId,
        })
      }
    }
  } catch (err) {
    console.error('[awardEventPoints] Client notification failed (non-blocking):', err)
  }

  // Mark event as awarded
  await supabase
    .from('events')
    .update({ loyalty_points_awarded: true })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/clients/${event.client_id}`)
  revalidatePath('/loyalty')
  revalidatePath('/dashboard')

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
// 3b. getLoyaltyConfigByTenant - Get config without requireChef() (for internal use)
// =====================================================================================

export async function getLoyaltyConfigByTenant(tenantId: string): Promise<LoyaltyConfig | null> {
  const supabase: any = createServerClient()

  const { data: config } = await supabase
    .from('loyalty_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (!config) return null

  return {
    ...(config as any),
    milestone_bonuses: (config as any).milestone_bonuses as { events: number; bonus: number }[],
    welcome_points: (config as any).welcome_points ?? 0,
    referral_points: (config as any).referral_points ?? 0,
  }
}

// =====================================================================================
// 3c. awardLiteVisit - Lite mode: update visit count + tier, no points
// =====================================================================================

export async function awardLiteVisit(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, client_id, tenant_id, guest_count, loyalty_points_awarded, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) throw new Error('Event not found')
  if (event.loyalty_points_awarded) return { success: true, alreadyAwarded: true }
  if (event.status !== 'completed') throw new Error('Only completed events qualify')

  const config = await getLoyaltyConfig()

  // Get current client stats
  const { data: client } = await supabase
    .from('clients')
    .select('full_name, total_events_completed, total_guests_served, loyalty_tier')
    .eq('id', event.client_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  const guestCount = event.guest_count || 1
  const newEventsCompleted = (client?.total_events_completed || 0) + 1
  const newGuestsServed = (client?.total_guests_served || 0) + guestCount

  // In lite mode, tier thresholds represent visit counts
  const oldTier = (client?.loyalty_tier as LoyaltyTier) || 'bronze'
  const newTier = computeTier(newEventsCompleted, config)

  await supabase
    .from('clients')
    .update({
      loyalty_tier: newTier,
      total_events_completed: newEventsCompleted,
      total_guests_served: newGuestsServed,
    })
    .eq('id', event.client_id)
    .eq('tenant_id', user.tenantId!)

  // Non-blocking: notify on tier change
  if (newTier !== oldTier) {
    try {
      const { createClientNotification } = await import('@/lib/notifications/client-actions')
      await createClientNotification({
        tenantId: user.tenantId!,
        clientId: event.client_id,
        category: 'loyalty',
        action: 'tier_upgraded',
        title: `You reached ${newTier} tier!`,
        body: `Congratulations! You've been recognized as a ${newTier}-tier client`,
        actionUrl: '/my-rewards',
        eventId,
      })

      const { createNotification, getChefAuthUserId } = await import('@/lib/notifications/actions')
      const chefUserId = await getChefAuthUserId(user.tenantId!)
      if (chefUserId) {
        await createNotification({
          tenantId: user.tenantId!,
          recipientId: chefUserId,
          category: 'loyalty',
          action: 'tier_upgraded',
          title: 'Client tier upgraded',
          body: `${client?.full_name || 'A client'} reached ${newTier} tier`,
          actionUrl: `/clients/${event.client_id}`,
          clientId: event.client_id,
          eventId,
        })
      }
    } catch (err) {
      console.error('[awardLiteVisit] Notification failed (non-blocking):', err)
    }
  }

  // Mark event as processed
  await supabase
    .from('events')
    .update({ loyalty_points_awarded: true })
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/clients/${event.client_id}`)
  revalidatePath('/loyalty')

  return { success: true, newTier, tierChanged: newTier !== oldTier }
}

// =====================================================================================
// 4. awardBonusPoints - Manual bonus by chef
// =====================================================================================

export async function awardBonusPoints(clientId: string, points: number, description: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (points <= 0) {
    throw new Error('Bonus points must be positive')
  }

  // Verify client belongs to tenant
  const { data: client } = await supabase
    .from('clients')
    .select('id, loyalty_points, total_events_completed')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    throw new Error('Client not found')
  }

  // Insert bonus transaction
  const { error: txError } = await supabase.from('loyalty_transactions').insert({
    tenant_id: user.tenantId!,
    client_id: clientId,
    type: 'bonus',
    points,
    description: description || 'Manual bonus from chef',
    created_by: user.id,
  })

  if (txError) {
    console.error('[awardBonusPoints] Error:', txError)
    throw new Error('Failed to award bonus points')
  }

  // Update client balance
  const newBalance = (client.loyalty_points || 0) + points

  // Recalculate tier based on lifetime earned
  const config = await getLoyaltyConfig()
  const { data: lifetimeData } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .in('type', ['earned', 'bonus'])

  const lifetimeEarned = (lifetimeData || []).reduce((sum: number, tx: any) => sum + tx.points, 0)
  const newTier = computeTier(lifetimeEarned, config)

  await supabase
    .from('clients')
    .update({
      loyalty_points: newBalance,
      loyalty_tier: newTier,
    })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/loyalty')
  return { success: true, newBalance, newTier }
}

// =====================================================================================
// 5. redeemReward - Deduct points for a reward
// =====================================================================================

export async function redeemReward(clientId: string, rewardId: string, eventId?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get client
  const { data: client } = await supabase
    .from('clients')
    .select('id, loyalty_points, loyalty_tier')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    throw new Error('Client not found')
  }

  // Get reward
  const { data: reward } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('id', rewardId)
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .single()

  if (!reward) {
    throw new Error('Reward not found or inactive')
  }

  // Check sufficient points
  if ((client.loyalty_points || 0) < reward.points_required) {
    throw new Error(
      `Insufficient points. Need ${reward.points_required}, have ${client.loyalty_points || 0}`
    )
  }

  // Insert redemption transaction (negative points)
  const { data: txData, error: txError } = await supabase
    .from('loyalty_transactions')
    .insert({
      tenant_id: user.tenantId!,
      client_id: clientId,
      event_id: eventId || null,
      type: 'redeemed',
      points: -reward.points_required,
      description: `Redeemed: ${reward.name}`,
      created_by: user.id,
    })
    .select('id')
    .single()

  if (txError) {
    console.error('[redeemReward] Error:', txError)
    throw new Error('Failed to redeem reward')
  }

  // Update client balance - tier NEVER decreases from redemption
  const newBalance = (client.loyalty_points || 0) - reward.points_required

  await supabase
    .from('clients')
    .update({
      loyalty_points: newBalance,
      // Keep current tier - tiers never decrease from redemption
    })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  // Create pending delivery record (non-blocking)
  if (txData?.id) {
    try {
      const { createPendingDelivery } = await import('@/lib/loyalty/auto-award')
      await createPendingDelivery({
        tenantId: user.tenantId!,
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
    } catch (delivErr) {
      console.error('[redeemReward] Pending delivery creation failed (non-blocking):', delivErr)
    }
  }

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/loyalty')

  return {
    success: true,
    reward,
    newBalance,
    tier: client.loyalty_tier, // unchanged
  }
}

// =====================================================================================
// 6. getClientLoyaltyProfile - Full loyalty status for a client
// =====================================================================================

export async function getClientLoyaltyProfile(clientId: string): Promise<ClientLoyaltyProfile> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get client
  const { data: client } = await supabase
    .from('clients')
    .select('id, loyalty_points, loyalty_tier, total_events_completed, total_guests_served')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) {
    throw new Error('Client not found')
  }

  const config = await getLoyaltyConfig()

  // Get lifetime earned points
  const { data: lifetimeData } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .in('type', ['earned', 'bonus'])

  const lifetimeEarned = (lifetimeData || []).reduce((sum: number, tx: any) => sum + tx.points, 0)

  // Get transaction history
  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(50)

  // Get available rewards
  const { data: rewards } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .lte('points_required', client.loyalty_points || 0)
    .order('points_required', { ascending: true })

  // Compute next tier
  const currentTier = (client.loyalty_tier || 'bronze') as LoyaltyTier
  const nextTierInfo = getNextTier(currentTier)
  let pointsToNextTier = 0
  if (nextTierInfo) {
    const threshold = getTierThreshold(nextTierInfo.key, config)
    pointsToNextTier = Math.max(0, threshold - lifetimeEarned)
  }

  // Find next milestone
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
// 7. getLoyaltyTransactions - Full transaction history for a client
// =====================================================================================

export async function getLoyaltyTransactions(clientId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: transactions, error } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('client_id', clientId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getLoyaltyTransactions] Error:', error)
    throw new Error('Failed to fetch loyalty transactions')
  }

  return transactions as LoyaltyTransaction[]
}

// =====================================================================================
// 8. createReward - Add a new reward to the catalog
// =====================================================================================

export async function createReward(input: CreateRewardInput) {
  const user = await requireChef()
  const validated = CreateRewardSchema.parse(input)
  const supabase: any = createServerClient()

  const { data: reward, error } = await supabase
    .from('loyalty_rewards')
    .insert({
      tenant_id: user.tenantId!,
      name: validated.name,
      description: validated.description || null,
      points_required: validated.points_required,
      reward_type: validated.reward_type,
      reward_value_cents: validated.reward_value_cents || null,
      reward_percent: validated.reward_percent || null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[createReward] Error:', error)
    throw new Error('Failed to create reward')
  }

  revalidatePath('/loyalty')
  return { success: true, reward }
}

// =====================================================================================
// 9. getRewards - List all active rewards
// =====================================================================================

export async function getRewards() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: rewards, error } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  if (error) {
    console.error('[getRewards] Error:', error)
    throw new Error('Failed to fetch rewards')
  }

  return rewards as LoyaltyReward[]
}

// =====================================================================================
// 10. updateReward - Edit a reward
// =====================================================================================

export async function updateReward(rewardId: string, input: UpdateRewardInput) {
  const user = await requireChef()
  const validated = UpdateRewardSchema.parse(input)
  const supabase: any = createServerClient()

  const { data: reward, error } = await supabase
    .from('loyalty_rewards')
    .update({
      ...validated,
      updated_by: user.id,
    })
    .eq('id', rewardId)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateReward] Error:', error)
    throw new Error('Failed to update reward')
  }

  revalidatePath('/loyalty')
  return { success: true, reward }
}

// =====================================================================================
// 11. deactivateReward - Soft delete
// =====================================================================================

export async function deactivateReward(rewardId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('loyalty_rewards')
    .update({
      is_active: false,
      updated_by: user.id,
    })
    .eq('id', rewardId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deactivateReward] Error:', error)
    throw new Error('Failed to deactivate reward')
  }

  revalidatePath('/loyalty')
  return { success: true }
}

// =====================================================================================
// 12. getLoyaltyOverview - Dashboard stats
// =====================================================================================

export async function getLoyaltyOverview(): Promise<LoyaltyOverview> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const config = await getLoyaltyConfig()

  // Get all clients with loyalty data
  const { data: clients } = await supabase
    .from('clients')
    .select(
      'id, full_name, loyalty_points, loyalty_tier, total_events_completed, total_guests_served'
    )
    .eq('tenant_id', user.tenantId!)
    .order('loyalty_points', { ascending: false })

  const allClients = clients || []

  // Clients per tier
  const clientsPerTier: Record<LoyaltyTier, number> = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
  }
  for (const c of allClients) {
    const tier = (c.loyalty_tier || 'bronze') as LoyaltyTier
    clientsPerTier[tier]++
  }

  // Total points outstanding
  const totalPointsOutstanding = allClients.reduce(
    (sum: any, c: any) => sum + (c.loyalty_points || 0),
    0
  )

  // Top clients
  const topClients = allClients.slice(0, 10).map((c: any) => ({
    id: c.id,
    full_name: c.full_name,
    loyalty_points: c.loyalty_points || 0,
    loyalty_tier: (c.loyalty_tier || 'bronze') as LoyaltyTier,
  }))

  // Recent awards
  const { data: recentAwards } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .in('type', ['earned', 'bonus'])
    .order('created_at', { ascending: false })
    .limit(10)

  // Clients approaching tier upgrades
  const clientsApproachingTierUpgrade = allClients
    .map((c: any) => {
      const tier = (c.loyalty_tier || 'bronze') as LoyaltyTier
      const nextTier = getNextTier(tier)
      if (!nextTier) return null

      const threshold = getTierThreshold(nextTier.key, config)
      // Use lifetime earned (approximate with loyalty_points for now since bonus/earned only go up)
      const pointsNeeded = threshold - (c.loyalty_points || 0)
      // Within 20% of threshold
      const isApproaching = pointsNeeded > 0 && pointsNeeded <= threshold * 0.2

      if (!isApproaching) return null

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
// 13. getClientsApproachingRewards - Outreach opportunities
// =====================================================================================

export async function getClientsApproachingRewards() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get all active rewards
  const { data: rewards } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  if (!rewards || rewards.length === 0) return []

  // Get all clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, loyalty_points, loyalty_tier')
    .eq('tenant_id', user.tenantId!)

  if (!clients) return []

  const config = await getLoyaltyConfig()
  const pointsPerGuest = config.points_per_guest

  // Find clients within 20% of earning any reward they don't yet have enough for
  const approaching = clients
    .map((client: any) => {
      const balance = client.loyalty_points || 0
      const nearbyRewards = rewards
        .filter((r: any) => {
          const deficit = r.points_required - balance
          return deficit > 0 && deficit <= r.points_required * 0.2
        })
        .map((r: any) => ({
          rewardName: r.name,
          pointsNeeded: r.points_required - balance,
          guestsNeeded: Math.ceil((r.points_required - balance) / pointsPerGuest),
        }))

      if (nearbyRewards.length === 0) return null

      return {
        clientId: client.id,
        clientName: client.full_name,
        currentPoints: balance,
        tier: (client.loyalty_tier || 'bronze') as LoyaltyTier,
        approachingRewards: nearbyRewards,
      }
    })
    .filter((c: any): c is NonNullable<typeof c> => c !== null)

  return approaching
}

// =====================================================================================
// 14. adjustClientLoyalty - Manual chef adjustment (deduct points, set tier, correct stats)
// =====================================================================================

const AdjustLoyaltySchema = z.object({
  clientId: z.string().uuid(),
  adjustmentPoints: z.number().int().optional(), // positive = add, negative = deduct
  adjustmentReason: z.string().min(1).optional(),
  overrideTier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
  overrideEventsCompleted: z.number().int().min(0).optional(),
  overrideGuestsServed: z.number().int().min(0).optional(),
  resetPoints: z.boolean().optional(), // set balance to 0
})

export type AdjustLoyaltyInput = z.infer<typeof AdjustLoyaltySchema>

export async function adjustClientLoyalty(input: AdjustLoyaltyInput) {
  const user = await requireChef()
  const validated = AdjustLoyaltySchema.parse(input)
  const supabase: any = createServerClient()

  const { data: client } = await supabase
    .from('clients')
    .select(
      'id, full_name, loyalty_points, loyalty_tier, total_events_completed, total_guests_served'
    )
    .eq('id', validated.clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  const updates: Record<string, any> = {}
  const actions: string[] = []

  // Point adjustment (add or deduct)
  if (validated.adjustmentPoints && validated.adjustmentPoints !== 0) {
    const txType: LoyaltyTransactionType = validated.adjustmentPoints > 0 ? 'bonus' : 'adjustment'
    const { error: txError } = await supabase.from('loyalty_transactions').insert({
      tenant_id: user.tenantId!,
      client_id: validated.clientId,
      type: txType,
      points: validated.adjustmentPoints,
      description:
        validated.adjustmentReason ||
        `Manual ${validated.adjustmentPoints > 0 ? 'bonus' : 'deduction'} by chef`,
      created_by: user.id,
    })
    if (txError) throw new Error('Failed to create adjustment transaction')

    updates.loyalty_points = Math.max(0, (client.loyalty_points || 0) + validated.adjustmentPoints)
    actions.push(`${validated.adjustmentPoints > 0 ? '+' : ''}${validated.adjustmentPoints} points`)
  }

  // Reset points to zero
  if (validated.resetPoints) {
    const currentBalance = updates.loyalty_points ?? (client.loyalty_points || 0)
    if (currentBalance > 0) {
      await supabase.from('loyalty_transactions').insert({
        tenant_id: user.tenantId!,
        client_id: validated.clientId,
        type: 'adjustment',
        points: -currentBalance,
        description: validated.adjustmentReason || 'Points reset to zero by chef',
        created_by: user.id,
      })
      updates.loyalty_points = 0
      actions.push('Points reset to 0')
    }
  }

  // Tier override
  if (validated.overrideTier) {
    updates.loyalty_tier = validated.overrideTier
    actions.push(`Tier set to ${validated.overrideTier}`)
  }

  // Stats corrections
  if (validated.overrideEventsCompleted !== undefined) {
    updates.total_events_completed = validated.overrideEventsCompleted
    actions.push(`Events completed set to ${validated.overrideEventsCompleted}`)
  }
  if (validated.overrideGuestsServed !== undefined) {
    updates.total_guests_served = validated.overrideGuestsServed
    actions.push(`Guests served set to ${validated.overrideGuestsServed}`)
  }

  // If no tier override, recalculate tier from lifetime earned
  if (!validated.overrideTier && (validated.adjustmentPoints || validated.resetPoints)) {
    const config = await getLoyaltyConfig()
    const { data: lifetimeData } = await supabase
      .from('loyalty_transactions')
      .select('points')
      .eq('client_id', validated.clientId)
      .eq('tenant_id', user.tenantId!)
      .in('type', ['earned', 'bonus'])

    const lifetimeEarned = (lifetimeData || []).reduce((sum: number, tx: any) => sum + tx.points, 0)
    updates.loyalty_tier = computeTier(lifetimeEarned, config)
  }

  if (Object.keys(updates).length > 0) {
    const { error: updateError } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', validated.clientId)
      .eq('tenant_id', user.tenantId!)

    if (updateError) throw new Error('Failed to update client loyalty data')
  }

  revalidatePath(`/clients/${validated.clientId}`)
  revalidatePath('/loyalty')

  return { success: true, actions, updates }
}

// =====================================================================================
// 15. backfillLoyaltyForHistoricalImports - Retroactive points for imported events
//     Processes all completed events that haven't been loyalty-awarded yet.
//     Batch-aware: accumulates stats correctly, sends one summary notification.
// =====================================================================================

export type BackfillLoyaltyResult = {
  success: boolean
  clientsProcessed: number
  eventsProcessed: number
  totalPointsAwarded: number
  tierChanges: {
    clientId: string
    clientName: string
    oldTier: LoyaltyTier
    newTier: LoyaltyTier
  }[]
  errors: string[]
}

export async function backfillLoyaltyForHistoricalImports(): Promise<BackfillLoyaltyResult> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const config = await getLoyaltyConfig()

  if (!config.is_active || config.program_mode === 'off') {
    return {
      success: true,
      clientsProcessed: 0,
      eventsProcessed: 0,
      totalPointsAwarded: 0,
      tierChanges: [],
      errors: [],
    }
  }

  // Find all completed events that haven't had loyalty awarded
  const { data: unawarded, error: fetchError } = await supabase
    .from('events')
    .select('id, client_id, guest_count, total_price_cents, event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .or('loyalty_points_awarded.is.null,loyalty_points_awarded.eq.false')
    .order('event_date', { ascending: true })

  if (fetchError) {
    return {
      success: false,
      clientsProcessed: 0,
      eventsProcessed: 0,
      totalPointsAwarded: 0,
      tierChanges: [],
      errors: [fetchError.message],
    }
  }

  if (!unawarded || unawarded.length === 0) {
    return {
      success: true,
      clientsProcessed: 0,
      eventsProcessed: 0,
      totalPointsAwarded: 0,
      tierChanges: [],
      errors: [],
    }
  }

  // Group by client for batch processing
  const byClient = new Map<string, typeof unawarded>()
  for (const event of unawarded) {
    const list = byClient.get(event.client_id) || []
    list.push(event)
    byClient.set(event.client_id, list)
  }

  const errors: string[] = []
  const tierChanges: BackfillLoyaltyResult['tierChanges'] = []
  let totalEventsProcessed = 0
  let totalPointsAwarded = 0

  for (const [clientId, events] of byClient) {
    try {
      // Get current client state
      const { data: client } = await supabase
        .from('clients')
        .select(
          'full_name, loyalty_points, loyalty_tier, total_events_completed, total_guests_served'
        )
        .eq('id', clientId)
        .eq('tenant_id', user.tenantId!)
        .single()

      if (!client) {
        errors.push(`Client ${clientId} not found, skipping ${events.length} events`)
        continue
      }

      const oldTier = (client.loyalty_tier || 'bronze') as LoyaltyTier
      let runningPointsBalance = client.loyalty_points || 0
      let runningEventsCompleted = client.total_events_completed || 0
      let runningGuestsServed = client.total_guests_served || 0
      let clientPointsAwarded = 0

      // Process events in chronological order
      for (const event of events) {
        const guestCount = event.guest_count || 1
        runningEventsCompleted++
        runningGuestsServed += guestCount

        if (config.program_mode === 'full') {
          // Compute base points
          let basePoints: number
          let baseDescription: string

          switch (config.earn_mode) {
            case 'per_dollar': {
              const dollars = (event.total_price_cents || 0) / 100
              basePoints = Math.round(dollars * config.points_per_dollar)
              baseDescription = `$${dollars.toFixed(2)} x ${config.points_per_dollar} pts/$ (historical import)`
              break
            }
            case 'per_event': {
              basePoints = config.points_per_event
              baseDescription = `Flat ${config.points_per_event} pts per event (historical import)`
              break
            }
            case 'per_guest':
            default: {
              basePoints = guestCount * config.points_per_guest
              baseDescription = `${guestCount} guests x ${config.points_per_guest} pts/guest (historical import)`
              break
            }
          }

          // Insert base earned transaction
          await supabase.from('loyalty_transactions').insert({
            tenant_id: user.tenantId!,
            client_id: clientId,
            event_id: event.id,
            type: 'earned',
            points: basePoints,
            description: baseDescription,
            created_by: user.id,
          })

          runningPointsBalance += basePoints
          clientPointsAwarded += basePoints

          // Large party bonus
          if (
            config.bonus_large_party_threshold &&
            guestCount >= config.bonus_large_party_threshold
          ) {
            const bonusPoints = config.bonus_large_party_points || 0
            if (bonusPoints > 0) {
              await supabase.from('loyalty_transactions').insert({
                tenant_id: user.tenantId!,
                client_id: clientId,
                event_id: event.id,
                type: 'bonus',
                points: bonusPoints,
                description: `Large party bonus (${guestCount}+ guests, historical import)`,
                created_by: user.id,
              })
              runningPointsBalance += bonusPoints
              clientPointsAwarded += bonusPoints
            }
          }

          // Milestone bonuses
          for (const milestone of config.milestone_bonuses) {
            if (runningEventsCompleted === milestone.events) {
              await supabase.from('loyalty_transactions').insert({
                tenant_id: user.tenantId!,
                client_id: clientId,
                event_id: event.id,
                type: 'bonus',
                points: milestone.bonus,
                description: `Milestone bonus: ${milestone.events}th event completed! (historical import)`,
                created_by: user.id,
              })
              runningPointsBalance += milestone.bonus
              clientPointsAwarded += milestone.bonus
            }
          }
        }

        // Mark event as loyalty-awarded
        await supabase
          .from('events')
          .update({ loyalty_points_awarded: true })
          .eq('id', event.id)
          .eq('tenant_id', user.tenantId!)

        totalEventsProcessed++
      }

      // Calculate final tier
      let newTier: LoyaltyTier
      if (config.program_mode === 'lite') {
        // Lite mode: tier based on visit count
        newTier = computeTier(runningEventsCompleted, config)
      } else {
        // Full mode: tier based on lifetime earned points
        const { data: lifetimeData } = await supabase
          .from('loyalty_transactions')
          .select('points')
          .eq('client_id', clientId)
          .eq('tenant_id', user.tenantId!)
          .in('type', ['earned', 'bonus'])

        const lifetimeEarned = (lifetimeData || []).reduce(
          (sum: number, tx: any) => sum + tx.points,
          0
        )
        newTier = computeTier(lifetimeEarned, config)
      }

      // Update client record (single update per client, not per event)
      const clientUpdate: Record<string, any> = {
        loyalty_tier: newTier,
        total_events_completed: runningEventsCompleted,
        total_guests_served: runningGuestsServed,
      }
      if (config.program_mode === 'full') {
        clientUpdate.loyalty_points = runningPointsBalance
      }

      await supabase
        .from('clients')
        .update(clientUpdate)
        .eq('id', clientId)
        .eq('tenant_id', user.tenantId!)

      totalPointsAwarded += clientPointsAwarded

      if (newTier !== oldTier) {
        tierChanges.push({
          clientId,
          clientName: client.full_name || 'Unknown',
          oldTier,
          newTier,
        })
      }
    } catch (err) {
      errors.push(
        `Error processing client ${clientId}: ${err instanceof Error ? err.message : 'Unknown error'}`
      )
    }
  }

  revalidatePath('/loyalty')
  revalidatePath('/clients')
  revalidatePath('/dashboard')

  return {
    success: errors.length === 0,
    clientsProcessed: byClient.size,
    eventsProcessed: totalEventsProcessed,
    totalPointsAwarded,
    tierChanges,
    errors,
  }
}

// =====================================================================================
// CLIENT-SIDE: Get own loyalty status (for client portal)
// =====================================================================================

export async function getMyLoyaltyStatus() {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Get client record
  const { data: client } = await supabase
    .from('clients')
    .select(
      'id, loyalty_points, loyalty_tier, total_events_completed, total_guests_served, tenant_id'
    )
    .eq('id', user.entityId)
    .single()

  if (!client) {
    return null
  }

  // Get loyalty config for program_mode / earn_mode
  const { data: configRow } = await supabase
    .from('loyalty_config')
    .select('program_mode, earn_mode')
    .eq('tenant_id', client.tenant_id)
    .single()

  const programMode = ((configRow as any)?.program_mode || 'full') as ProgramMode
  const earnMode = ((configRow as any)?.earn_mode || 'per_guest') as EarnMode

  // Get available rewards for this tenant
  const { data: rewards } = await supabase
    .from('loyalty_rewards')
    .select('*')
    .eq('tenant_id', client.tenant_id)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  // Get recent transactions
  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('client_id', user.entityId)
    .order('created_at', { ascending: false })
    .limit(10)

  const balance = client.loyalty_points || 0
  const allRewards = rewards || []
  const availableRewards = allRewards.filter((r: any) => r.points_required <= balance)
  const nextReward = allRewards.find((r: any) => r.points_required > balance)

  return {
    programMode,
    earnMode,
    tier: (client.loyalty_tier || 'bronze') as LoyaltyTier,
    pointsBalance: balance,
    totalEventsCompleted: client.total_events_completed || 0,
    totalGuestsServed: client.total_guests_served || 0,
    availableRewards: availableRewards as LoyaltyReward[],
    nextReward: nextReward
      ? {
          name: nextReward.name,
          pointsRequired: nextReward.points_required,
          pointsNeeded: nextReward.points_required - balance,
        }
      : null,
    recentTransactions: (transactions || []) as LoyaltyTransaction[],
  }
}
