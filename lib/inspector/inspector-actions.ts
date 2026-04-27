'use server'

// Context Inspector - aggregates all relevant data for a client/event/inquiry
// into a single payload that powers the collapsible inspector panel.

import { requireChef } from '@/lib/auth/get-user'
import { getClientWithStats } from '@/lib/clients/actions'
import { getRepeatClientIntelligence } from '@/lib/clients/intelligence'
import { getClientMenuHistory } from '@/lib/menus/repeat-detection'
import { getEventById } from '@/lib/events/actions'
import { getInquiryById } from '@/lib/inquiries/actions'

// ─── Types ───────────────────────────────────────────────────────────────────

export type InspectorClientProfile = {
  id: string
  fullName: string
  email: string | null
  phone: string | null
  dietaryRestrictions: string[]
  allergies: string[]
  vibeNotes: string | null
  whatTheyCareAbout: string | null
  tippingPattern: string | null
  loyaltyTier: string | null
  totalEvents: number
  completedEvents: number
  totalSpentCents: number
  averageEventValueCents: number
  lastEventDate: string | null
  daysSinceLastEvent: number | null
  isRepeat: boolean
  isVip: boolean
}

export type InspectorPastMeal = {
  eventId: string
  eventDate: string | null
  eventOccasion: string | null
  menuName: string | null
  dishes: string[]
}

export type InspectorAllergen = {
  allergen: string
  severity: string | null
  confirmed: boolean
}

export type InspectorFeedback = {
  overall: number | null
  foodQuality: number | null
  communication: number | null
  whatTheyLoved: string | null
  whatCouldImprove: string | null
  wouldBookAgain: boolean | null
  eventDate: string | null
}

export type InspectorEventDetails = {
  id: string
  occasion: string | null
  eventDate: string | null
  guestCount: number | null
  status: string | null
  venueAddress: string | null
  serviceStyle: string | null
  startTime: string | null
  endTime: string | null
  quotedPriceCents: number | null
  clientName: string | null
  clientId: string | null
  notes: string | null
}

export type InspectorDinnerCircle = {
  eventId: string
  hasCircle: boolean
  // Add more circle fields as needed
}

export type InspectorData = {
  client: InspectorClientProfile | null
  allergens: InspectorAllergen[]
  pastMeals: InspectorPastMeal[]
  lovedDishes: string[]
  dislikedDishes: string[]
  lastFeedback: InspectorFeedback | null
  averageFeedback: { overall: number | null; count: number } | null
  event: InspectorEventDetails | null
  lastVenueNotes: {
    kitchenNotes: string | null
    siteNotes: string | null
    location: string | null
  } | null
  upcomingMilestones: Array<{ type: string; date: string; description: string }>
}

// ─── Main Aggregator ─────────────────────────────────────────────────────────

export async function getInspectorData(params: {
  clientId?: string | null
  eventId?: string | null
  inquiryId?: string | null
}): Promise<InspectorData> {
  await requireChef()

  const result: InspectorData = {
    client: null,
    allergens: [],
    pastMeals: [],
    lovedDishes: [],
    dislikedDishes: [],
    lastFeedback: null,
    averageFeedback: null,
    event: null,
    lastVenueNotes: null,
    upcomingMilestones: [],
  }

  let resolvedClientId = params.clientId ?? null

  // If we have an event, load event details and resolve client from it
  if (params.eventId) {
    try {
      const event = await getEventById(params.eventId)
      if (event) {
        const locationParts = [
          event.location_address,
          event.location_city,
          event.location_state,
        ].filter((v: any) => v && v !== 'TBD')

        result.event = {
          id: event.id,
          occasion: event.occasion ?? null,
          eventDate: event.event_date ?? null,
          guestCount: event.guest_count ?? null,
          status: event.status ?? null,
          venueAddress: locationParts.length > 0 ? locationParts.join(', ') : null,
          serviceStyle: event.service_style ?? null,
          startTime: null,
          endTime: null,
          quotedPriceCents: event.quoted_price_cents ?? null,
          clientName: event.client?.full_name ?? null,
          clientId: event.client_id ?? null,
          notes: event.site_notes || event.kitchen_notes || event.location_notes || null,
        }
        if (!resolvedClientId && event.client_id) {
          resolvedClientId = event.client_id
        }
      }
    } catch {
      // Non-blocking
    }
  }

  // If we have an inquiry, resolve client from it
  if (params.inquiryId && !resolvedClientId) {
    try {
      const inquiry = await getInquiryById(params.inquiryId)
      if (inquiry?.client_id) {
        resolvedClientId = inquiry.client_id
      }
      // If no event loaded yet, build partial event-like context from inquiry
      if (!result.event && inquiry) {
        const inq = inquiry as any
        result.event = {
          id: inquiry.id,
          occasion: inq.confirmed_occasion ?? null,
          eventDate: inq.confirmed_date ?? null,
          guestCount: inq.confirmed_guest_count ?? inq.guest_count ?? null,
          status: inquiry.status ?? null,
          venueAddress: inq.confirmed_location ?? null,
          serviceStyle: null,
          startTime: null,
          endTime: null,
          quotedPriceCents: inq.confirmed_budget_cents ?? null,
          clientName: inq.client_name ?? null,
          clientId: inquiry.client_id ?? null,
          notes: inq.notes ?? null,
        }
      }
    } catch {
      // Non-blocking
    }
  }

  // Load all client-related data in parallel
  if (resolvedClientId) {
    const [clientStats, intelligence, menuHistory] = await Promise.all([
      getClientWithStats(resolvedClientId).catch(() => null),
      getRepeatClientIntelligence(resolvedClientId).catch(() => null),
      getClientMenuHistory(resolvedClientId).catch(() => []),
    ])

    if (clientStats) {
      const dietary = Array.isArray(clientStats.dietary_restrictions)
        ? clientStats.dietary_restrictions
        : typeof clientStats.dietary_restrictions === 'string' && clientStats.dietary_restrictions
          ? [clientStats.dietary_restrictions]
          : []
      const allergies = Array.isArray(clientStats.allergies)
        ? clientStats.allergies
        : typeof clientStats.allergies === 'string' && clientStats.allergies
          ? [clientStats.allergies]
          : []

      result.client = {
        id: clientStats.id,
        fullName: clientStats.full_name ?? 'Unknown',
        email: clientStats.email ?? null,
        phone: clientStats.phone ?? null,
        dietaryRestrictions: dietary,
        allergies: allergies,
        vibeNotes: clientStats.vibe_notes ?? null,
        whatTheyCareAbout: clientStats.what_they_care_about ?? null,
        tippingPattern: clientStats.tipping_pattern ?? null,
        loyaltyTier: clientStats.loyalty_tier ?? null,
        totalEvents: clientStats.totalEvents ?? 0,
        completedEvents: clientStats.completedEvents ?? 0,
        totalSpentCents: clientStats.totalSpentCents ?? 0,
        averageEventValueCents: clientStats.averageEventValueCents ?? 0,
        lastEventDate: clientStats.lastEventDate ?? null,
        daysSinceLastEvent: null,
        isRepeat: (clientStats.totalEvents ?? 0) >= 2,
        isVip: clientStats.loyalty_tier === 'vip' || clientStats.loyalty_tier === 'gold',
      }

      // Compute days since last event
      if (clientStats.lastEventDate) {
        const diff = Date.now() - new Date(clientStats.lastEventDate).getTime()
        result.client.daysSinceLastEvent = Math.floor(diff / 86400000)
      }
    }

    if (intelligence) {
      result.lovedDishes = intelligence.lovedDishes ?? []
      result.dislikedDishes = intelligence.dislikedDishes ?? []
      result.allergens = (intelligence.allergens ?? []).map((a: any) => ({
        allergen: a.allergen,
        severity: a.severity ?? null,
        confirmed: a.confirmed ?? false,
      }))
      result.upcomingMilestones = (intelligence.upcomingMilestones ?? []).map((m: any) => ({
        type: m.type,
        date: m.date,
        description: m.description,
      }))

      if (intelligence.lastFeedback) {
        result.lastFeedback = {
          overall: intelligence.lastFeedback.overall ?? null,
          foodQuality:
            ((intelligence.lastFeedback as Record<string, unknown>).foodQuality as number) ?? null,
          communication:
            ((intelligence.lastFeedback as Record<string, unknown>).communication as number) ??
            null,
          whatTheyLoved: intelligence.lastFeedback.whatTheyLoved ?? null,
          whatCouldImprove: intelligence.lastFeedback.whatCouldImprove ?? null,
          wouldBookAgain: intelligence.lastFeedback.wouldBookAgain ?? null,
          eventDate: intelligence.lastFeedback.eventDate ?? null,
        }
      }

      if (intelligence.averageFeedback) {
        result.averageFeedback = {
          overall: intelligence.averageFeedback.overall ?? null,
          count: intelligence.averageFeedback.count ?? 0,
        }
      }

      if (intelligence.lastVenueNotes) {
        result.lastVenueNotes = {
          kitchenNotes: intelligence.lastVenueNotes.kitchen_notes ?? null,
          siteNotes: intelligence.lastVenueNotes.site_notes ?? null,
          location: intelligence.lastVenueNotes.location ?? null,
        }
      }

      // Merge intelligence client data if we have it
      if (result.client && intelligence.client) {
        result.client.vibeNotes = result.client.vibeNotes ?? intelligence.client.vibe_notes ?? null
        result.client.whatTheyCareAbout =
          result.client.whatTheyCareAbout ?? intelligence.client.what_they_care_about ?? null
        result.client.tippingPattern =
          result.client.tippingPattern ?? intelligence.client.tipping_pattern ?? null
      }
    }

    // Map menu history to past meals
    if (menuHistory.length > 0) {
      result.pastMeals = menuHistory.slice(0, 10).map((entry) => ({
        eventId: entry.eventId,
        eventDate: entry.eventDate ?? null,
        eventOccasion: entry.eventOccasion ?? null,
        menuName: entry.menuName ?? null,
        dishes: entry.dishes.flatMap((d) =>
          d.components.map((c) => c.recipeName ?? c.componentName)
        ),
      }))
    }
  }

  return result
}
