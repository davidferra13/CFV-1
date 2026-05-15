import type { UniversalRailRole, UniversalRailItem } from './universal-rail-types'

// ---------------------------------------------------------------------------
// Role transition definitions
// ---------------------------------------------------------------------------

/**
 * Valid role transitions in ChefFlow.
 * Each transition defines: source role, target role, trigger condition,
 * and which item categories carry over.
 */
export interface RailRoleTransition {
  from: UniversalRailRole
  to: UniversalRailRole
  trigger: string
  carryOverCategories: string[]
}

export const RAIL_ROLE_TRANSITIONS: readonly RailRoleTransition[] = [
  // Guest -> Client (account creation / first booking)
  {
    from: 'guest',
    to: 'client',
    trigger: 'account_creation',
    carryOverCategories: ['taste', 'occasion', 'chefflow_picks'],
  },
  // Guest -> Client (first inquiry sent)
  {
    from: 'guest',
    to: 'client',
    trigger: 'first_inquiry',
    carryOverCategories: ['taste', 'occasion'],
  },
  // Chef -> Client (chef-as-diner toggle)
  {
    from: 'chef',
    to: 'client',
    trigger: 'diner_mode_toggle',
    carryOverCategories: ['diner_discovery'],
  },
  // Client -> Chef (chef-as-diner toggle back)
  {
    from: 'client',
    to: 'chef',
    trigger: 'chef_mode_toggle',
    carryOverCategories: [],
  },
  // Public -> Guest (session persistence begins)
  {
    from: 'public',
    to: 'guest',
    trigger: 'session_start',
    carryOverCategories: ['taste', 'occasion', 'chefflow_picks', 'engagement'],
  },
] as const

// ---------------------------------------------------------------------------
// Chef-as-diner toggle
// ---------------------------------------------------------------------------

/**
 * When a chef toggles to "diner mode", inject client discovery items
 * into their rail at reduced urgency.
 */
export function getDinerModeItems(
  chefItems: UniversalRailItem[],
  clientDiscoveryItems: UniversalRailItem[]
): UniversalRailItem[] {
  // Chef operational items stay; add client discovery with reduced scores
  const dinerItems = clientDiscoveryItems.map((item) => ({
    ...item,
    role: 'chef' as const,
    definitionId: item.definitionId.replace('client.', 'chef.diner_'),
    score: item.score * 0.4, // Diner items get 40% score weight
    category: 'diner_discovery',
  }))

  return [...chefItems, ...dinerItems]
}

// ---------------------------------------------------------------------------
// Cross-role item complementarity
// ---------------------------------------------------------------------------

/**
 * Complementary item pairs across roles.
 * When one fires, the other should be boosted.
 */
export interface ComplementaryPair {
  itemA: string // definition ID in role A
  itemB: string // definition ID in role B
  relationship: 'mirror' | 'trigger' | 'response'
  boostAmount: number
}

export const COMPLEMENTARY_PAIRS: readonly ComplementaryPair[] = [
  // Chef sends quote -> Client receives quote
  {
    itemA: 'chef.quote_sent',
    itemB: 'client.quote_received',
    relationship: 'mirror',
    boostAmount: 15,
  },
  // Client inquiry -> Chef new inquiry
  {
    itemA: 'client.inquiry_sent',
    itemB: 'chef.inquiry_new',
    relationship: 'mirror',
    boostAmount: 20,
  },
  // Chef quote expiring -> Client quote expiring
  {
    itemA: 'chef.quote_expiring_soon',
    itemB: 'client.quote_expiring',
    relationship: 'mirror',
    boostAmount: 10,
  },
  // Chef event today -> Client event today
  {
    itemA: 'chef.event_today',
    itemB: 'client.event_today',
    relationship: 'mirror',
    boostAmount: 5,
  },
  // Chef payment overdue -> Client payment due
  {
    itemA: 'chef.payment_overdue',
    itemB: 'client.gap_payment_due',
    relationship: 'mirror',
    boostAmount: 15,
  },
  // Staff shift assigned -> Chef staff scheduled
  {
    itemA: 'staff.shift_assigned',
    itemB: 'chef.staff_scheduled',
    relationship: 'trigger',
    boostAmount: 5,
  },
  // Partner referral converted -> Chef new client from referral
  {
    itemA: 'partner.referral_converted',
    itemB: 'chef.lead_partner_referral',
    relationship: 'trigger',
    boostAmount: 10,
  },
] as const

/**
 * Find complementary items that should be boosted when an item is acted on.
 */
export function findComplementaryBoosts(
  actedItemId: string
): { targetItemId: string; boost: number }[] {
  const boosts: { targetItemId: string; boost: number }[] = []

  for (const pair of COMPLEMENTARY_PAIRS) {
    if (pair.itemA === actedItemId) {
      boosts.push({ targetItemId: pair.itemB, boost: pair.boostAmount })
    }
    if (pair.itemB === actedItemId) {
      boosts.push({ targetItemId: pair.itemA, boost: pair.boostAmount })
    }
  }

  return boosts
}

// ---------------------------------------------------------------------------
// Conversion funnel tracking
// ---------------------------------------------------------------------------

/**
 * Tracks where a user is in the guest -> client conversion funnel
 * based on which rail items they've interacted with.
 */
export type ConversionStage =
  | 'browsing' // interacting with discovery items only
  | 'interested' // saved a chef or clicked featured_chef
  | 'considering' // used compare tool or viewed multiple chef profiles
  | 'ready' // started an inquiry draft
  | 'converted' // sent first inquiry or created account

const STAGE_SIGNALS: Record<ConversionStage, string[]> = {
  browsing: ['guest.cuisine', 'guest.food_type', 'guest.craving', 'guest.dietary'],
  interested: ['guest.featured_chef', 'guest.saved_chef_resurface', 'guest.saved_chef_update'],
  considering: ['guest.comparison_history', 'guest.browse_pattern', 'guest.budget_memory'],
  ready: ['guest.abandoned_inquiry_draft', 'guest.first_booking_nudge'],
  converted: [],
}

export function inferConversionStage(interactedItemIds: string[]): ConversionStage {
  const idSet = new Set(interactedItemIds)

  // Check from highest to lowest stage
  if (STAGE_SIGNALS.ready.some((id) => idSet.has(id))) return 'ready'
  if (STAGE_SIGNALS.considering.some((id) => idSet.has(id))) return 'considering'
  if (STAGE_SIGNALS.interested.some((id) => idSet.has(id))) return 'interested'
  return 'browsing'
}

// ---------------------------------------------------------------------------
// Control rail extension for non-public roles
// ---------------------------------------------------------------------------

/**
 * Slot classification for operational roles.
 * Extends the existing 5 slot kinds for operational contexts.
 */
export type OperationalSlotKind =
  | 'urgent' // requires immediate action (payment overdue, event today)
  | 'actionable' // has a clear next step (respond to inquiry, send quote)
  | 'informational' // awareness only (business health metric, status update)
  | 'nudge' // completion/improvement suggestion
  | 'ambient' // background intelligence

export function classifyOperationalSlot(item: UniversalRailItem): OperationalSlotKind {
  if (item.baseUrgency >= 85) return 'urgent'
  if (item.clickAction === 'quick_action' || item.clickAction === 'navigate') {
    if (item.baseUrgency >= 50) return 'actionable'
  }
  if (item.clickAction === 'expand_inline') return 'informational'
  if (item.category.includes('nudge') || item.category.includes('onboarding')) return 'nudge'
  return 'ambient'
}

/**
 * Slot policy for operational rails.
 * Urgent items always show. Nudges capped at 20%.
 */
export interface OperationalSlotPolicy {
  maxNudgeRatio: number
  maxAmbientRatio: number
  urgentAlwaysVisible: boolean
}

export const DEFAULT_OPERATIONAL_SLOT_POLICY: OperationalSlotPolicy = {
  maxNudgeRatio: 0.2,
  maxAmbientRatio: 0.3,
  urgentAlwaysVisible: true,
}

export function applyOperationalSlotPolicy(
  items: UniversalRailItem[],
  policy: OperationalSlotPolicy = DEFAULT_OPERATIONAL_SLOT_POLICY
): UniversalRailItem[] {
  const classified = items.map((item) => ({
    item,
    slot: classifyOperationalSlot(item),
  }))

  const urgent = classified.filter((c) => c.slot === 'urgent')
  const actionable = classified.filter((c) => c.slot === 'actionable')
  const informational = classified.filter((c) => c.slot === 'informational')
  const nudges = classified.filter((c) => c.slot === 'nudge')
  const ambient = classified.filter((c) => c.slot === 'ambient')

  const totalNonUrgent = actionable.length + informational.length + nudges.length + ambient.length
  const maxNudges = Math.max(1, Math.floor(totalNonUrgent * policy.maxNudgeRatio))
  const maxAmbient = Math.max(1, Math.floor(totalNonUrgent * policy.maxAmbientRatio))

  const result = [
    ...urgent.map((c) => c.item),
    ...actionable.map((c) => c.item),
    ...informational.map((c) => c.item),
    ...nudges.slice(0, maxNudges).map((c) => c.item),
    ...ambient.slice(0, maxAmbient).map((c) => c.item),
  ]

  return result.sort((a, b) => b.score - a.score)
}
