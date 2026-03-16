'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

// ==========================================
// TYPES
// ==========================================

export type RepeatClientIntelligence = {
  client: {
    id: string
    full_name: string
    client_status: string | null
    vibe_notes: string | null
    tipping_pattern: string | null
    what_they_care_about: string | null
  }
  isRepeat: boolean
  eventCount: number
  completedEventCount: number
  totalSpentCents: number
  averageSpendCents: number
  lovedDishes: string[]
  dislikedDishes: string[]
  allergens: { allergen: string; severity: string; confirmed: boolean }[]
  averageFeedback: {
    overall: number | null
    foodQuality: number | null
    communication: number | null
    count: number
  }
  upcomingMilestones: { type: string; date: string; description?: string }[]
  lastFeedback: {
    overall: number | null
    whatTheyLoved: string | null
    whatCouldImprove: string | null
    wouldBookAgain: boolean | null
    eventDate: string | null
  } | null
  daysSinceLastEvent: number | null
  lastEventDate: string | null
}

// ==========================================
// MAIN QUERY
// ==========================================

export async function getRepeatClientIntelligence(
  clientId: string
): Promise<RepeatClientIntelligence | null> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Parallel queries for all data sources
  const [clientResult, eventsResult, allergensResult, preferencesResult, feedbackResult] =
    await Promise.all([
      // Client profile
      supabase
        .from('clients')
        .select(
          'id, full_name, client_status, vibe_notes, tipping_pattern, what_they_care_about, personal_milestones'
        )
        .eq('id', clientId)
        .eq('tenant_id', user.entityId)
        .single(),

      // Event history
      supabase
        .from('events')
        .select('id, event_status, event_date, quoted_price_cents')
        .eq('client_id', clientId)
        .eq('tenant_id', user.entityId)
        .order('event_date', { ascending: false }),

      // Allergen records
      supabase
        .from('client_allergy_records')
        .select('allergen, severity, confirmed_by_chef')
        .eq('client_id', clientId)
        .eq('tenant_id', user.entityId),

      // Dish preferences
      supabase
        .from('client_preferences')
        .select('item_name, rating')
        .eq('client_id', clientId)
        .eq('tenant_id', user.entityId),

      // Feedback history
      supabase
        .from('post_event_surveys')
        .select(
          'overall, food_quality, communication_rating, what_they_loved, what_could_improve, would_book_again, completed_at, events(event_date)'
        )
        .eq('client_id', clientId)
        .eq('tenant_id', user.entityId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false }),
    ])

  const client = clientResult.data
  if (!client) return null

  const events = eventsResult.data ?? []
  const allergens = allergensResult.data ?? []
  const preferences = preferencesResult.data ?? []
  const feedback = feedbackResult.data ?? []

  // Compute derived data (deterministic, no AI)
  const completedEvents = events.filter((e: any) => e.event_status === 'completed')
  const totalSpent = completedEvents.reduce(
    (sum: number, e: any) => sum + (e.quoted_price_cents ?? 0),
    0
  )

  const lovedDishes = preferences
    .filter((p: any) => p.rating === 'loved')
    .map((p: any) => p.item_name)

  const dislikedDishes = preferences
    .filter((p: any) => p.rating === 'disliked')
    .map((p: any) => p.item_name)

  // Average feedback scores
  const completedFeedback = feedback.filter((f: any) => f.overall != null)
  const avgOverall =
    completedFeedback.length > 0
      ? completedFeedback.reduce((sum: number, f: any) => sum + f.overall, 0) /
        completedFeedback.length
      : null
  const avgFood =
    completedFeedback.length > 0
      ? completedFeedback.reduce((sum: number, f: any) => sum + (f.food_quality ?? 0), 0) /
        completedFeedback.length
      : null
  const avgComm =
    completedFeedback.length > 0
      ? completedFeedback.reduce((sum: number, f: any) => sum + (f.communication_rating ?? 0), 0) /
        completedFeedback.length
      : null

  // Upcoming milestones (within 30 days)
  const milestones = (client.personal_milestones as any[]) ?? []
  const upcomingMilestones = milestones.filter((m: any) => {
    if (!m.date) return false
    // Normalize the milestone date to current year for annual events
    const now = new Date()
    const milestoneDate = new Date(m.date)
    milestoneDate.setFullYear(now.getFullYear())
    if (milestoneDate < now) milestoneDate.setFullYear(now.getFullYear() + 1)
    const daysAway = (milestoneDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysAway <= 30 && daysAway >= 0
  })

  // Last event date
  const lastEvent = events[0]
  const daysSinceLastEvent = lastEvent?.event_date
    ? Math.floor((Date.now() - new Date(lastEvent.event_date).getTime()) / (1000 * 60 * 60 * 24))
    : null

  // Last feedback
  const lastFeedbackEntry = feedback[0]
  const lastFeedbackData = lastFeedbackEntry
    ? {
        overall: lastFeedbackEntry.overall,
        whatTheyLoved: lastFeedbackEntry.what_they_loved,
        whatCouldImprove: lastFeedbackEntry.what_could_improve,
        wouldBookAgain: lastFeedbackEntry.would_book_again,
        eventDate: (lastFeedbackEntry.events as any)?.event_date ?? null,
      }
    : null

  return {
    client: {
      id: client.id,
      full_name: client.full_name,
      client_status: client.client_status,
      vibe_notes: client.vibe_notes,
      tipping_pattern: client.tipping_pattern,
      what_they_care_about: client.what_they_care_about,
    },
    isRepeat: events.length > 1,
    eventCount: events.length,
    completedEventCount: completedEvents.length,
    totalSpentCents: totalSpent,
    averageSpendCents:
      completedEvents.length > 0 ? Math.round(totalSpent / completedEvents.length) : 0,
    lovedDishes,
    dislikedDishes,
    allergens: allergens.map((a: any) => ({
      allergen: a.allergen,
      severity: a.severity,
      confirmed: a.confirmed_by_chef,
    })),
    averageFeedback: {
      overall: avgOverall ? Math.round(avgOverall * 10) / 10 : null,
      foodQuality: avgFood ? Math.round(avgFood * 10) / 10 : null,
      communication: avgComm ? Math.round(avgComm * 10) / 10 : null,
      count: completedFeedback.length,
    },
    upcomingMilestones,
    lastFeedback: lastFeedbackData,
    daysSinceLastEvent,
    lastEventDate: lastEvent?.event_date ?? null,
  }
}
