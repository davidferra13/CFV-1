'use server'

import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { getChefPreferences } from '@/lib/chef/actions'
import { createServerClient } from '@/lib/db/server'
import {
  getEventPricingIntelligence,
  type EventPricingIntelligencePayload,
} from '@/lib/finance/event-pricing-intelligence-actions'
import {
  evaluateEventReadinessAssistant,
  filterDismissedEventReadinessSuggestions,
  type EventReadinessAssistantResult,
  type EventReadinessMode,
} from '@/lib/events/event-readiness-assistant'
import { normalizeDinnerCircleConfig } from '@/lib/dinner-circles/event-circle'

function normalizeMode(value: unknown, fallback: EventReadinessMode): EventReadinessMode {
  return value === 'off' || value === 'quiet' || value === 'normal' ? value : fallback
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

async function getEventForAssistant(db: any, eventId: string, tenantId: string) {
  const selectWithAssistant =
    'id, tenant_id, status, created_at, event_date, serve_time, guest_count, guest_count_confirmed, quoted_price_cents, cost_needs_refresh, travel_time_minutes, mileage_miles, time_shopping_minutes, time_prep_minutes, time_travel_minutes, time_service_minutes, time_reset_minutes, location, location_address, location_notes, site_notes, kitchen_notes, access_instructions, service_style, pre_event_checklist_confirmed_at, debrief_completed_at, reset_complete, aar_filed, financial_closed, archived, readiness_assistant_enabled, readiness_assistant_mode'
  const selectFallback =
    'id, tenant_id, status, created_at, event_date, serve_time, guest_count, guest_count_confirmed, quoted_price_cents, cost_needs_refresh, travel_time_minutes, mileage_miles, time_shopping_minutes, time_prep_minutes, time_travel_minutes, time_service_minutes, time_reset_minutes, location, location_address, location_notes, site_notes, kitchen_notes, access_instructions, service_style, pre_event_checklist_confirmed_at, debrief_completed_at, reset_complete, aar_filed, financial_closed, archived'

  const result = await db
    .from('events')
    .select(selectWithAssistant)
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!result.error) return result.data

  const message = String(result.error.message ?? '')
  if (!message.includes('readiness_assistant')) {
    throw new Error(result.error.message || 'Failed to load event readiness settings')
  }

  const fallback = await db
    .from('events')
    .select(selectFallback)
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (fallback.error) {
    throw new Error(fallback.error.message || 'Failed to load event')
  }

  return {
    ...fallback.data,
    readiness_assistant_enabled: null,
    readiness_assistant_mode: null,
  }
}

function isMissingDismissalsTableError(error: { message?: string } | null | undefined): boolean {
  const message = String(error?.message ?? '')
  return (
    message.includes('event_readiness_suggestion_dismissals') ||
    (message.includes('relation') && message.includes('does not exist'))
  )
}

async function getDismissedSuggestionIds(
  db: any,
  eventId: string,
  tenantId: string
): Promise<string[]> {
  const { data, error } = await db
    .from('event_readiness_suggestion_dismissals')
    .select('suggestion_id')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)

  if (error) {
    if (isMissingDismissalsTableError(error)) return []
    throw new Error(error.message || 'Failed to load dismissed readiness suggestions')
  }

  return (data ?? [])
    .map((row: { suggestion_id?: unknown }) => row.suggestion_id)
    .filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
}

async function getAssistantDefaultContext(db: any, eventId: string, tenantId: string) {
  const [shareResult, ticketTypeResult, ticketResult, collaboratorResult, photoResult] =
    await Promise.allSettled([
      db
        .from('event_share_settings')
        .select(
          'share_token, tickets_enabled, show_menu, show_location, show_chef_name, is_active, circle_config, created_at'
        )
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .maybeSingle(),
      db
        .from('event_ticket_types')
        .select('capacity, sold_count, is_active')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId),
      db
        .from('event_tickets')
        .select('quantity, payment_status, created_at')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId),
      db.from('event_collaborators').select('role, status').eq('event_id', eventId),
      db
        .from('event_photos')
        .select('id, is_public, deleted_at')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .is('deleted_at', null),
    ])

  const share =
    shareResult.status === 'fulfilled' && !shareResult.value.error ? shareResult.value.data : null
  const ticketTypes =
    ticketTypeResult.status === 'fulfilled' && !ticketTypeResult.value.error
      ? (ticketTypeResult.value.data ?? [])
      : []
  const tickets =
    ticketResult.status === 'fulfilled' && !ticketResult.value.error
      ? (ticketResult.value.data ?? [])
      : []
  const collaborators =
    collaboratorResult.status === 'fulfilled' && !collaboratorResult.value.error
      ? (collaboratorResult.value.data ?? [])
      : []
  const photos =
    photoResult.status === 'fulfilled' && !photoResult.value.error
      ? (photoResult.value.data ?? [])
      : []

  const config = normalizeDinnerCircleConfig(share?.circle_config ?? null)
  const activeTicketTypes = ticketTypes.filter((ticketType: any) => ticketType.is_active !== false)
  const totalCapacity = activeTicketTypes.reduce((sum: number, ticketType: any) => {
    const capacity = numberOrNull(ticketType.capacity)
    return sum + (capacity ?? 0)
  }, 0)
  const visibleTickets = tickets.filter(
    (ticket: any) => !['cancelled', 'refunded'].includes(String(ticket.payment_status))
  )
  const paidTickets = tickets.filter((ticket: any) => ticket.payment_status === 'paid')
  const pendingTickets = tickets.filter((ticket: any) => ticket.payment_status === 'pending')
  const soldCount = paidTickets.reduce(
    (sum: number, ticket: any) => sum + (numberOrNull(ticket.quantity) ?? 0),
    0
  )
  const pendingCount = pendingTickets.reduce(
    (sum: number, ticket: any) => sum + (numberOrNull(ticket.quantity) ?? 0),
    0
  )
  const firstSaleAt =
    paidTickets
      .map((ticket: any) => ticket.created_at)
      .filter(Boolean)
      .sort()[0] ?? null
  const saleDates = paidTickets
    .map((ticket: any) => ticket.created_at)
    .filter(Boolean)
    .sort()
  const lastSaleAt = saleDates.length > 0 ? saleDates[saleDates.length - 1] : null
  const acceptedCollaborators = collaborators.filter(
    (collaborator: any) => collaborator.status === 'accepted'
  )
  const pendingCollaborators = collaborators.filter(
    (collaborator: any) => collaborator.status === 'pending'
  )
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const publicShareUrl =
    share?.share_token && appUrl ? `${appUrl.replace(/\/$/, '')}/e/${share.share_token}` : null

  return {
    tickets: {
      enabled: share?.tickets_enabled === true,
      totalCapacity,
      soldCount,
      pendingCount,
      paidOrderCount: paidTickets.length,
      visibleOrderCount: visibleTickets.length,
      firstSaleAt,
      lastSaleAt,
      shareCreatedAt: share?.created_at ?? null,
      publicShareUrl,
    },
    collaborators: {
      acceptedCount: acceptedCollaborators.length,
      pendingCount: pendingCollaborators.length,
      roles: acceptedCollaborators
        .map((collaborator: any) => collaborator.role)
        .filter((role: unknown): role is string => typeof role === 'string'),
    },
    publicPage: {
      photoCount: photos.filter((photo: any) => photo.is_public !== false).length,
      storyLength: config.publicPage?.story?.trim().length ?? 0,
      supplierLineCount: config.supplier?.ingredientLines?.length ?? 0,
      sourceLinkCount: config.supplier?.sourceLinks?.length ?? 0,
      layoutZoneCount: config.layout?.zones?.length ?? 0,
      timelineItemCount: config.layout?.timeline?.length ?? 0,
      farmEnabled: config.farm?.enabled === true,
      socialPostCount: config.social?.posts?.length ?? 0,
      showChefName: share?.show_chef_name !== false,
      showMenu: share?.show_menu !== false,
      showLocation: share?.show_location !== false,
    },
    hasPublicShare: Boolean(share?.share_token && share?.is_active !== false),
  }
}

async function assertChefOwnsEvent(db: any, eventId: string, tenantId: string) {
  const { data, error } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !data) {
    throw new Error('Event not found or access denied')
  }
}

function revalidateEventReadinessPaths(eventId: string) {
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/financial`)
}

export async function getEventReadinessAssistant(
  eventId: string,
  pricingOverride?: EventPricingIntelligencePayload | null
): Promise<EventReadinessAssistantResult | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()
  const [preferences, event] = await Promise.all([
    getChefPreferences(),
    getEventForAssistant(db, eventId, tenantId),
  ])

  if (!event) return null

  const globalEnabled = preferences.event_readiness_assistant_enabled === true
  const eventEnabled =
    typeof event.readiness_assistant_enabled === 'boolean'
      ? event.readiness_assistant_enabled
      : globalEnabled
  const inheritedMode = normalizeMode(
    preferences.event_readiness_assistant_default_mode,
    globalEnabled ? 'quiet' : 'off'
  )
  const mode = normalizeMode(event.readiness_assistant_mode, inheritedMode)

  if (!globalEnabled || !eventEnabled || mode === 'off') {
    return evaluateEventReadinessAssistant({
      enabled: false,
      mode: !globalEnabled || !eventEnabled ? 'off' : mode,
      event: {
        id: eventId,
      },
      pricing: {},
    })
  }

  const pricing = pricingOverride ?? (await getEventPricingIntelligence(eventId))
  if (!pricing) return null

  const timeLoggedMinutes =
    (numberOrNull(event.time_shopping_minutes) ?? 0) +
    (numberOrNull(event.time_prep_minutes) ?? 0) +
    (numberOrNull(event.time_travel_minutes) ?? 0) +
    (numberOrNull(event.time_service_minutes) ?? 0) +
    (numberOrNull(event.time_reset_minutes) ?? 0)
  const quoteOrRevenueCents =
    pricing.actual.revenueCents > 0
      ? pricing.actual.revenueCents
      : pricing.projected.quoteTotalCents
  const defaultContext = await getAssistantDefaultContext(db, eventId, tenantId)

  const result = evaluateEventReadinessAssistant({
    enabled: true,
    mode,
    categories: {
      financial: preferences.event_readiness_show_financial,
      pricingConfidence: preferences.event_readiness_show_pricing_confidence,
      ops: preferences.event_readiness_show_ops,
    },
    event: {
      id: eventId,
      status: event.status ?? null,
      createdAt: event.created_at ?? null,
      eventDate: event.event_date ?? null,
      serveTime: event.serve_time ?? null,
      guestCount: numberOrNull(event.guest_count),
      guestCountConfirmed:
        typeof event.guest_count_confirmed === 'boolean' ? event.guest_count_confirmed : null,
      hasMenu: Boolean(pricing.menu),
      menuIds: pricing.menu?.menuIds ?? [],
      hasAllRecipeCosts: pricing.menu?.hasAllRecipeCosts ?? null,
      costNeedsRefresh: event.cost_needs_refresh === true,
      travelTimeMinutes: numberOrNull(event.travel_time_minutes),
      mileageMiles: numberOrNull(event.mileage_miles),
      timeLoggedMinutes,
      locationText: event.location ?? event.location_address ?? null,
      locationNotes: event.location_notes ?? null,
      siteNotes: event.site_notes ?? null,
      kitchenNotes: event.kitchen_notes ?? null,
      accessInstructions: event.access_instructions ?? null,
      serviceStyle: event.service_style ?? null,
      preEventChecklistConfirmedAt: event.pre_event_checklist_confirmed_at ?? null,
      debriefCompletedAt: event.debrief_completed_at ?? null,
      resetComplete: event.reset_complete ?? null,
      aarFiled: event.aar_filed ?? null,
      financialClosed: event.financial_closed ?? null,
      archived: event.archived ?? null,
      hasPublicShare: defaultContext.hasPublicShare,
    },
    tickets: defaultContext.tickets,
    collaborators: defaultContext.collaborators,
    publicPage: defaultContext.publicPage,
    pricing: {
      quoteOrRevenueCents,
      projectedFoodCostCents: pricing.projected.foodCostCents,
      projectedFoodCostPercent: pricing.projected.projectedFoodCostPercent,
      suggestedPriceCents: pricing.projected.suggestedPriceCents,
      targetFoodCostPercent: pricing.projected.targetFoodCostPercent,
      targetMarginPercent: pricing.projected.targetMarginPercent,
      expectedMarginPercent: pricing.projected.expectedMarginPercent,
      actualFoodCostCents: pricing.actual.foodCostCents,
      actualTotalCostCents: pricing.actual.totalCostCents,
      actualFoodCostPercent: pricing.actual.actualFoodCostPercent,
      actualMarginPercent: pricing.actual.actualMarginPercent,
      estimatedVsActualPercent: pricing.variance.estimatedVsActualPercent,
      estimatedVsActualCostCents: pricing.variance.estimatedVsActualCostCents,
      fallbackUsed: pricing.confidence.fallbackUsed,
      stalePriceCount: pricing.confidence.stalePriceCount,
      lowConfidenceIngredientCount: pricing.confidence.lowConfidenceIngredientCount,
      missingPriceCount: pricing.confidence.missingPriceCount,
      totalIngredientCount: pricing.confidence.totalIngredientCount,
    },
  })

  const dismissedSuggestionIds = await getDismissedSuggestionIds(db, eventId, tenantId)
  return filterDismissedEventReadinessSuggestions(result, dismissedSuggestionIds)
}

export async function updateEventReadinessAssistantSettings(
  eventId: string,
  input: {
    enabled?: boolean
    mode?: EventReadinessMode
  }
) {
  const user = await requireChef()
  const payload: Record<string, unknown> = {}

  if (typeof input.enabled === 'boolean') {
    payload.readiness_assistant_enabled = input.enabled
  }
  if (input.mode) {
    payload.readiness_assistant_mode = normalizeMode(input.mode, 'quiet')
  }

  if (Object.keys(payload).length === 0) {
    return { success: true }
  }

  const db: any = createServerClient()
  const { error } = await db
    .from('events')
    .update(payload)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error(error.message || 'Failed to update readiness assistant settings')
  }

  revalidateEventReadinessPaths(eventId)
  return { success: true }
}

export async function dismissEventReadinessSuggestion(eventId: string, suggestionId: string) {
  const normalizedSuggestionId = suggestionId.trim()
  if (!normalizedSuggestionId) {
    throw new Error('Suggestion ID is required')
  }

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  await assertChefOwnsEvent(db, eventId, tenantId)

  const { error } = await db.from('event_readiness_suggestion_dismissals').upsert(
    {
      tenant_id: tenantId,
      event_id: eventId,
      suggestion_id: normalizedSuggestionId,
      dismissed_by: user.id,
      dismissed_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,event_id,suggestion_id' }
  )

  if (error) {
    throw new Error(error.message || 'Failed to dismiss readiness suggestion')
  }

  revalidateEventReadinessPaths(eventId)
  return { success: true }
}

export async function resetEventReadinessDismissals(eventId: string) {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  await assertChefOwnsEvent(db, eventId, tenantId)

  const { error } = await db
    .from('event_readiness_suggestion_dismissals')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)

  if (error) {
    throw new Error(error.message || 'Failed to reset dismissed readiness suggestions')
  }

  revalidateEventReadinessPaths(eventId)
  return { success: true }
}
