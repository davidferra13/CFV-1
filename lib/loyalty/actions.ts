// Loyalty Program Server Actions
// Points per guest served, tier management, reward catalog, auto-award
// Service-denominated rewards only — the chef never spends money

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
export type LoyaltyRewardType = 'discount_fixed' | 'discount_percent' | 'free_course' | 'free_dinner' | 'upgrade'

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

// =====================================================================================
// VALIDATION SCHEMAS
// =====================================================================================

const UpdateLoyaltyConfigSchema = z.object({
  points_per_guest: z.number().int().positive().optional(),
  bonus_large_party_threshold: z.number().int().positive().optional(),
  bonus_large_party_points: z.number().int().nonnegative().optional(),
  milestone_bonuses: z.array(z.object({
    events: z.number().int().positive(),
    bonus: z.number().int().positive()
  })).optional(),
  tier_silver_min: z.number().int().positive().optional(),
  tier_gold_min: z.number().int().positive().optional(),
  tier_platinum_min: z.number().int().positive().optional(),
  is_active: z.boolean().optional()
})

const CreateRewardSchema = z.object({
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  points_required: z.number().int().positive('Points must be positive'),
  reward_type: z.enum(['discount_fixed', 'discount_percent', 'free_course', 'free_dinner', 'upgrade']),
  reward_value_cents: z.number().int().positive().optional(),
  reward_percent: z.number().int().min(1).max(100).optional()
})

const UpdateRewardSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  points_required: z.number().int().positive().optional(),
  reward_type: z.enum(['discount_fixed', 'discount_percent', 'free_course', 'free_dinner', 'upgrade']).optional(),
  reward_value_cents: z.number().int().positive().nullable().optional(),
  reward_percent: z.number().int().min(1).max(100).nullable().optional(),
  sort_order: z.number().int().optional()
})

export type CreateRewardInput = z.infer<typeof CreateRewardSchema>
export type UpdateRewardInput = z.infer<typeof UpdateRewardSchema>

// =====================================================================================
// DEFAULT REWARDS CATALOG
// =====================================================================================

const DEFAULT_REWARDS: Omit<CreateRewardInput, 'tenant_id'>[] = [
  { name: 'Complimentary appetizer course', points_required: 50, reward_type: 'free_course', description: 'A bonus appetizer course added to your next dinner' },
  { name: 'Complimentary dessert course', points_required: 75, reward_type: 'free_course', description: 'A bonus dessert course added to your next dinner' },
  { name: '$25 off your next dinner', points_required: 100, reward_type: 'discount_fixed', reward_value_cents: 2500, description: '$25 discount on your next booking' },
  { name: '15% off dinner for two', points_required: 150, reward_type: 'discount_percent', reward_percent: 15, description: '15% discount on a dinner for two' },
  { name: "Chef's tasting menu experience", points_required: 200, reward_type: 'upgrade', description: 'Bonus courses and elevated presentation on your next dinner' },
  { name: '50% off a dinner for two', points_required: 250, reward_type: 'discount_percent', reward_percent: 50, description: 'Half-price dinner for two' },
  { name: 'Free dinner for two', points_required: 300, reward_type: 'free_dinner', description: 'Complimentary dinner for two (covers service, you cover ingredients)' },
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
    case 'bronze': return config.tier_bronze_min
    case 'silver': return config.tier_silver_min
    case 'gold': return config.tier_gold_min
    case 'platinum': return config.tier_platinum_min
  }
}

// =====================================================================================
// 1. getLoyaltyConfig — Returns the chef's loyalty program configuration
// =====================================================================================

export async function getLoyaltyConfig(): Promise<LoyaltyConfig> {
  const user = await requireChef()
  const supabase = createServerClient()

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
      ...newConfig,
      milestone_bonuses: newConfig.milestone_bonuses as { events: number; bonus: number }[],
    }
  }

  return {
    ...config,
    milestone_bonuses: config.milestone_bonuses as { events: number; bonus: number }[],
  }
}

// =====================================================================================
// 2. updateLoyaltyConfig — Update loyalty program settings
// =====================================================================================

export async function updateLoyaltyConfig(input: z.infer<typeof UpdateLoyaltyConfigSchema>) {
  const user = await requireChef()
  const validated = UpdateLoyaltyConfigSchema.parse(input)
  const supabase = createServerClient()

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
// 3. awardEventPoints — Called when event reaches 'completed'
// =====================================================================================

export async function awardEventPoints(eventId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch event with client info
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, client_id, tenant_id, guest_count, loyalty_points_awarded, status')
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

  if (!config.is_active) {
    return { success: true, programInactive: true, pointsAwarded: 0 }
  }

  const guestCount = event.guest_count || 1
  let totalPoints = guestCount * config.points_per_guest
  const transactions: { type: LoyaltyTransactionType; points: number; description: string }[] = []

  // Base points
  transactions.push({
    type: 'earned',
    points: guestCount * config.points_per_guest,
    description: `${guestCount} guests × ${config.points_per_guest} pts/guest`
  })

  // Large party bonus
  if (config.bonus_large_party_threshold && guestCount >= config.bonus_large_party_threshold) {
    totalPoints += config.bonus_large_party_points || 0
    transactions.push({
      type: 'bonus',
      points: config.bonus_large_party_points || 0,
      description: `Large party bonus (${guestCount}+ guests)`
    })
  }

  // Get current client stats for milestone check
  const { data: client } = await supabase
    .from('clients')
    .select('total_events_completed, total_guests_served, loyalty_points')
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

  const oldLifetimeEarned = (oldLifetimeData || []).reduce((sum: number, tx: { points: number }) => sum + tx.points, 0)
  const oldTier = computeTier(oldLifetimeEarned, config)

  const currentEventsCompleted = (client?.total_events_completed || 0) + 1 // +1 for this event

  // Milestone bonuses
  for (const milestone of config.milestone_bonuses) {
    if (currentEventsCompleted === milestone.events) {
      totalPoints += milestone.bonus
      transactions.push({
        type: 'bonus',
        points: milestone.bonus,
        description: `Milestone bonus: ${milestone.events}th event completed!`
      })
    }
  }

  // Insert all loyalty transactions
  for (const tx of transactions) {
    const { error: txError } = await supabase
      .from('loyalty_transactions')
      .insert({
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

  const lifetimeEarned = (lifetimeData || []).reduce((sum, tx) => sum + tx.points, 0)
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
    transactions
  }
}

// =====================================================================================
// 4. awardBonusPoints — Manual bonus by chef
// =====================================================================================

export async function awardBonusPoints(clientId: string, points: number, description: string) {
  const user = await requireChef()
  const supabase = createServerClient()

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
  const { error: txError } = await supabase
    .from('loyalty_transactions')
    .insert({
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

  const lifetimeEarned = (lifetimeData || []).reduce((sum, tx) => sum + tx.points, 0)
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
// 5. redeemReward — Deduct points for a reward
// =====================================================================================

export async function redeemReward(clientId: string, rewardId: string, eventId?: string) {
  const user = await requireChef()
  const supabase = createServerClient()

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
    throw new Error(`Insufficient points. Need ${reward.points_required}, have ${client.loyalty_points || 0}`)
  }

  // Insert redemption transaction (negative points)
  const { error: txError } = await supabase
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

  if (txError) {
    console.error('[redeemReward] Error:', txError)
    throw new Error('Failed to redeem reward')
  }

  // Update client balance — tier NEVER decreases from redemption
  const newBalance = (client.loyalty_points || 0) - reward.points_required

  await supabase
    .from('clients')
    .update({
      loyalty_points: newBalance,
      // Keep current tier — tiers never decrease from redemption
    })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/loyalty')

  return {
    success: true,
    reward,
    newBalance,
    tier: client.loyalty_tier // unchanged
  }
}

// =====================================================================================
// 6. getClientLoyaltyProfile — Full loyalty status for a client
// =====================================================================================

export async function getClientLoyaltyProfile(clientId: string): Promise<ClientLoyaltyProfile> {
  const user = await requireChef()
  const supabase = createServerClient()

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

  const lifetimeEarned = (lifetimeData || []).reduce((sum, tx) => sum + tx.points, 0)

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
    .filter(m => m.events > eventsCompleted)
    .sort((a, b) => a.events - b.events)

  const nextMilestone = upcomingMilestones.length > 0
    ? { eventsNeeded: upcomingMilestones[0].events - eventsCompleted, bonus: upcomingMilestones[0].bonus }
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
// 7. getLoyaltyTransactions — Full transaction history for a client
// =====================================================================================

export async function getLoyaltyTransactions(clientId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

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
// 8. createReward — Add a new reward to the catalog
// =====================================================================================

export async function createReward(input: CreateRewardInput) {
  const user = await requireChef()
  const validated = CreateRewardSchema.parse(input)
  const supabase = createServerClient()

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
// 9. getRewards — List all active rewards
// =====================================================================================

export async function getRewards() {
  const user = await requireChef()
  const supabase = createServerClient()

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
// 10. updateReward — Edit a reward
// =====================================================================================

export async function updateReward(rewardId: string, input: UpdateRewardInput) {
  const user = await requireChef()
  const validated = UpdateRewardSchema.parse(input)
  const supabase = createServerClient()

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
// 11. deactivateReward — Soft delete
// =====================================================================================

export async function deactivateReward(rewardId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

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
// 12. getLoyaltyOverview — Dashboard stats
// =====================================================================================

export async function getLoyaltyOverview(): Promise<LoyaltyOverview> {
  const user = await requireChef()
  const supabase = createServerClient()

  const config = await getLoyaltyConfig()

  // Get all clients with loyalty data
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, loyalty_points, loyalty_tier, total_events_completed, total_guests_served')
    .eq('tenant_id', user.tenantId!)
    .order('loyalty_points', { ascending: false })

  const allClients = clients || []

  // Clients per tier
  const clientsPerTier: Record<LoyaltyTier, number> = {
    bronze: 0, silver: 0, gold: 0, platinum: 0
  }
  for (const c of allClients) {
    const tier = (c.loyalty_tier || 'bronze') as LoyaltyTier
    clientsPerTier[tier]++
  }

  // Total points outstanding
  const totalPointsOutstanding = allClients.reduce((sum, c) => sum + (c.loyalty_points || 0), 0)

  // Top clients
  const topClients = allClients.slice(0, 10).map(c => ({
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
    .map(c => {
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
    .filter((c): c is NonNullable<typeof c> => c !== null)

  return {
    totalClients: allClients.length,
    clientsPerTier,
    totalPointsOutstanding,
    topClients,
    recentAwards: (recentAwards || []) as LoyaltyTransaction[],
    clientsApproachingTierUpgrade,
  }
}

// =====================================================================================
// 13. getClientsApproachingRewards — Outreach opportunities
// =====================================================================================

export async function getClientsApproachingRewards() {
  const user = await requireChef()
  const supabase = createServerClient()

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
    .map(client => {
      const balance = client.loyalty_points || 0
      const nearbyRewards = rewards
        .filter(r => {
          const deficit = r.points_required - balance
          return deficit > 0 && deficit <= r.points_required * 0.2
        })
        .map(r => ({
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
    .filter((c): c is NonNullable<typeof c> => c !== null)

  return approaching
}

// =====================================================================================
// CLIENT-SIDE: Get own loyalty status (for client portal)
// =====================================================================================

export async function getMyLoyaltyStatus() {
  const user = await requireClient()
  const supabase = createServerClient()

  // Get client record
  const { data: client } = await supabase
    .from('clients')
    .select('id, loyalty_points, loyalty_tier, total_events_completed, total_guests_served, tenant_id')
    .eq('id', user.entityId)
    .single()

  if (!client) {
    return null
  }

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
  const availableRewards = allRewards.filter(r => r.points_required <= balance)
  const nextReward = allRewards.find(r => r.points_required > balance)

  return {
    tier: (client.loyalty_tier || 'bronze') as LoyaltyTier,
    pointsBalance: balance,
    totalEventsCompleted: client.total_events_completed || 0,
    totalGuestsServed: client.total_guests_served || 0,
    availableRewards: availableRewards as LoyaltyReward[],
    nextReward: nextReward ? {
      name: nextReward.name,
      pointsRequired: nextReward.points_required,
      pointsNeeded: nextReward.points_required - balance,
    } : null,
    recentTransactions: (transactions || []) as LoyaltyTransaction[],
  }
}
