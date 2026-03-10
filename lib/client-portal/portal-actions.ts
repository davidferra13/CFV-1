'use server'

// Universal Client Portal Actions
// Authenticated client access (requireClient) to determine what sections
// this client has data for, and fetch data for each section.

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// --- Portal Overview (determines which nav sections to show) ---

export type PortalOverview = {
  hasEvents: boolean
  hasQuotes: boolean
  hasMealPrep: boolean
  hasReservations: boolean
  hasLoyalty: boolean
  hasFeedback: boolean
}

export async function getPortalOverview(): Promise<PortalOverview> {
  const user = await requireClient()
  const supabase: any = createServerClient()
  const clientId = user.entityId

  // Run all checks in parallel for speed
  const [eventsRes, quotesRes, mealPrepRes, reservationsRes, loyaltyRes, feedbackRes] =
    await Promise.all([
      // Events
      supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .limit(1),

      // Quotes
      supabase
        .from('quotes')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .limit(1),

      // Meal Prep subscriptions
      supabase
        .from('meal_prep_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .limit(1),

      // Reservations: check if client email matches any guest with reservations
      checkClientHasReservations(supabase, clientId),

      // Loyalty: check if client has any loyalty points or transactions
      supabase.from('clients').select('loyalty_points, loyalty_tier').eq('id', clientId).single(),

      // Feedback: check if client name/email matches any feedback requests
      checkClientHasFeedback(supabase, clientId),
    ])

  const loyaltyData = loyaltyRes.data
  const hasLoyalty =
    loyaltyData && ((loyaltyData.loyalty_points ?? 0) > 0 || loyaltyData.loyalty_tier !== 'bronze')

  return {
    hasEvents: (eventsRes.count ?? 0) > 0,
    hasQuotes: (quotesRes.count ?? 0) > 0,
    hasMealPrep: (mealPrepRes.count ?? 0) > 0,
    hasReservations: reservationsRes,
    hasLoyalty: !!hasLoyalty,
    hasFeedback: feedbackRes,
  }
}

async function checkClientHasReservations(supabase: any, clientId: string): Promise<boolean> {
  // Get client email/phone to match against guests
  const { data: client } = await supabase
    .from('clients')
    .select('email, phone')
    .eq('id', clientId)
    .single()

  if (!client) return false

  // Check if any guest record matches this client's email or phone
  let guestQuery = supabase.from('guests').select('id').limit(1)

  if (client.email) {
    guestQuery = guestQuery.eq('email', client.email)
  } else if (client.phone) {
    guestQuery = guestQuery.eq('phone', client.phone)
  } else {
    return false
  }

  const { data: guests } = await guestQuery
  if (!guests || guests.length === 0) return false

  // Check if that guest has any reservations
  const { count } = await supabase
    .from('guest_reservations')
    .select('id', { count: 'exact', head: true })
    .eq('guest_id', guests[0].id)
    .limit(1)

  return (count ?? 0) > 0
}

async function checkClientHasFeedback(supabase: any, clientId: string): Promise<boolean> {
  // Get client info for matching
  const { data: client } = await supabase
    .from('clients')
    .select('email, full_name')
    .eq('id', clientId)
    .single()

  if (!client) return false

  // Check feedback_requests matching client email or name
  let query = supabase
    .from('feedback_requests')
    .select('id', { count: 'exact', head: true })
    .limit(1)

  if (client.email) {
    query = query.eq('client_email', client.email)
  } else if (client.full_name) {
    query = query.eq('client_name', client.full_name)
  } else {
    return false
  }

  const { count } = await query
  return (count ?? 0) > 0
}

// --- Client Reservations ---

export type ClientReservation = {
  id: string
  reservation_date: string
  reservation_time: string | null
  party_size: number | null
  status: string
  notes: string | null
  table_number: string | null
}

export async function getClientReservations(): Promise<{
  upcoming: ClientReservation[]
  past: ClientReservation[]
}> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Get client email/phone to find matching guest
  const { data: client } = await supabase
    .from('clients')
    .select('email, phone')
    .eq('id', user.entityId)
    .single()

  if (!client) return { upcoming: [], past: [] }

  // Find guest record matching client
  let guestQuery = supabase.from('guests').select('id').limit(10)
  if (client.email) {
    guestQuery = guestQuery.eq('email', client.email)
  } else if (client.phone) {
    guestQuery = guestQuery.eq('phone', client.phone)
  } else {
    return { upcoming: [], past: [] }
  }

  const { data: guests } = await guestQuery
  if (!guests || guests.length === 0) return { upcoming: [], past: [] }

  const guestIds = guests.map((g: any) => g.id)

  const { data: reservations } = await supabase
    .from('guest_reservations')
    .select('id, reservation_date, reservation_time, party_size, status, notes, table_number')
    .in('guest_id', guestIds)
    .order('reservation_date', { ascending: false })
    .limit(100)

  if (!reservations) return { upcoming: [], past: [] }

  const now = new Date().toISOString().slice(0, 10)

  const upcoming = reservations
    .filter(
      (r: any) =>
        r.reservation_date >= now && !['completed', 'no_show', 'cancelled'].includes(r.status)
    )
    .reverse() // soonest first for upcoming

  const past = reservations.filter(
    (r: any) => r.reservation_date < now || ['completed', 'no_show', 'cancelled'].includes(r.status)
  )

  return { upcoming, past }
}

// --- Client Loyalty Status ---

export type ClientLoyaltyStatus = {
  tier: string
  points: number
  nextTier: string | null
  nextTierThreshold: number | null
  progressPercent: number
  transactions: Array<{
    id: string
    type: string
    points: number
    description: string
    created_at: string
  }>
  availableRewards: Array<{
    id: string
    name: string
    description: string | null
    points_required: number
    reward_type: string
  }>
}

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'] as const

export async function getClientLoyaltyStatus(): Promise<ClientLoyaltyStatus | null> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, tenant_id, loyalty_points, loyalty_tier')
    .eq('id', user.entityId)
    .single()

  if (!client || !client.tenant_id) return null

  const tier = client.loyalty_tier || 'bronze'
  const points = client.loyalty_points || 0

  // Get loyalty config for tier thresholds
  const { data: config } = await supabase
    .from('loyalty_config')
    .select('tier_silver_min, tier_gold_min, tier_platinum_min')
    .eq('tenant_id', client.tenant_id)
    .single()

  const thresholds: Record<string, number> = {
    bronze: 0,
    silver: config?.tier_silver_min ?? 100,
    gold: config?.tier_gold_min ?? 250,
    platinum: config?.tier_platinum_min ?? 500,
  }

  const tierIdx = TIER_ORDER.indexOf(tier as (typeof TIER_ORDER)[number])
  const nextTier = tierIdx < TIER_ORDER.length - 1 ? TIER_ORDER[tierIdx + 1] : null
  const nextTierThreshold = nextTier ? thresholds[nextTier] : null

  let progressPercent = 100
  if (nextTier && nextTierThreshold) {
    const currentThreshold = thresholds[tier] || 0
    const range = nextTierThreshold - currentThreshold
    const progress = points - currentThreshold
    progressPercent = range > 0 ? Math.min(100, Math.round((progress / range) * 100)) : 100
  }

  // Get recent transactions
  const { data: transactions } = await supabase
    .from('loyalty_transactions')
    .select('id, type, points, description, created_at')
    .eq('client_id', client.id)
    .eq('tenant_id', client.tenant_id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Get available rewards
  const { data: rewards } = await supabase
    .from('loyalty_rewards')
    .select('id, name, description, points_required, reward_type')
    .eq('tenant_id', client.tenant_id)
    .eq('is_active', true)
    .order('points_required', { ascending: true })

  return {
    tier,
    points,
    nextTier,
    nextTierThreshold,
    progressPercent,
    transactions: transactions || [],
    availableRewards: (rewards || []).filter((r: any) => r.points_required <= points),
  }
}

// --- Client Feedback History ---

export type ClientFeedbackItem = {
  id: string
  entity_type: string
  status: string
  rating: number | null
  comment: string | null
  created_at: string
  submitted_at: string | null
}

export async function getClientFeedbackHistory(): Promise<{
  submitted: ClientFeedbackItem[]
  pending: ClientFeedbackItem[]
}> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Get client info for matching
  const { data: client } = await supabase
    .from('clients')
    .select('email, full_name')
    .eq('id', user.entityId)
    .single()

  if (!client) return { submitted: [], pending: [] }

  // Query feedback_requests matching this client
  let query = supabase
    .from('feedback_requests')
    .select(
      'id, entity_type, status, token, created_at, feedback_responses(id, rating, comment, created_at)'
    )
    .order('created_at', { ascending: false })
    .limit(50)

  if (client.email) {
    query = query.eq('client_email', client.email)
  } else if (client.full_name) {
    query = query.eq('client_name', client.full_name)
  } else {
    return { submitted: [], pending: [] }
  }

  const { data: requests } = await query
  if (!requests) return { submitted: [], pending: [] }

  const submitted: ClientFeedbackItem[] = []
  const pending: ClientFeedbackItem[] = []

  for (const req of requests) {
    const response = req.feedback_responses?.[0]
    const item: ClientFeedbackItem = {
      id: req.id,
      entity_type: req.entity_type,
      status: req.status,
      rating: response?.rating ?? null,
      comment: response?.comment ?? null,
      created_at: req.created_at,
      submitted_at: response?.created_at ?? null,
    }

    if (req.status === 'completed' && response) {
      submitted.push(item)
    } else if (req.status === 'pending' || req.status === 'sent') {
      pending.push(item)
    }
  }

  return { submitted, pending }
}

// --- Cancel Reservation ---

export async function cancelClientReservation(
  reservationId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const supabase: any = createServerClient()

  // Get client email/phone to verify ownership
  const { data: client } = await supabase
    .from('clients')
    .select('email, phone')
    .eq('id', user.entityId)
    .single()

  if (!client) return { success: false, error: 'Client not found' }

  // Find guest records matching this client
  let guestQuery = supabase.from('guests').select('id').limit(10)
  if (client.email) {
    guestQuery = guestQuery.eq('email', client.email)
  } else if (client.phone) {
    guestQuery = guestQuery.eq('phone', client.phone)
  } else {
    return { success: false, error: 'Cannot verify ownership' }
  }

  const { data: guests } = await guestQuery
  if (!guests || guests.length === 0) {
    return { success: false, error: 'No matching guest record found' }
  }

  const guestIds = guests.map((g: any) => g.id)

  // Verify reservation belongs to one of the client's guest records
  const { data: reservation } = await supabase
    .from('guest_reservations')
    .select('id, guest_id, status')
    .eq('id', reservationId)
    .in('guest_id', guestIds)
    .single()

  if (!reservation) {
    return { success: false, error: 'Reservation not found' }
  }

  if (['cancelled', 'completed', 'no_show'].includes(reservation.status)) {
    return { success: false, error: 'This reservation cannot be cancelled' }
  }

  const { error } = await supabase
    .from('guest_reservations')
    .update({ status: 'cancelled' })
    .eq('id', reservationId)

  if (error) {
    console.error('[cancelClientReservation] Error:', error)
    return { success: false, error: 'Failed to cancel reservation' }
  }

  return { success: true }
}
