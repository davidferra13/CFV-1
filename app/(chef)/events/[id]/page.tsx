// Chef Event Detail Page
// Shows comprehensive event information and allows state transitions

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import {
  getEventById,
  getEventClosureStatus,
  updateEventTimeAndCard,
  startEventActivity,
  stopEventActivity,
} from '@/lib/events/actions'
import { getAARByEventId } from '@/lib/aar/actions'
import { getDocumentReadiness, getBusinessDocInfo } from '@/lib/documents/actions'
import { hasAllergyData } from '@/lib/documents/generate-allergy-card'
import { getEventExpenses, getEventProfitSummary, getBudgetGuardrail } from '@/lib/expenses/actions'
import { getUnrecordedComponentsForEvent } from '@/lib/recipes/actions'
import { isAIConfigured } from '@/lib/ai/parse'
import { getEventDOPProgress } from '@/lib/scheduling/actions'
import { getEventLoyaltyImpactByTenant, getLoyaltyTransactions } from '@/lib/loyalty/actions'
import { getMessageThread, getResponseTemplates } from '@/lib/messages/actions'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { DietaryComplexityBadge } from '@/components/events/dietary-complexity-badge'
import { EventRiskBadge } from '@/components/events/event-risk-badge'
import { calculateDietaryComplexity } from '@/lib/formulas/dietary-complexity'
import { calculateEventRisk } from '@/lib/formulas/event-risk-score'
import { EventTransitions } from '@/components/events/event-transitions'
import { EventClosureActions } from '@/components/events/event-closure-actions'
import { DocumentSection } from '@/components/documents/document-section'
import { RecipeCapturePrompt } from '@/components/recipes/recipe-capture-prompt'
import { DOPProgressBar } from '@/components/scheduling/dop-view'
import { getEventModifications } from '@/lib/menus/modifications'
import { getUnusedIngredients } from '@/lib/expenses/unused'
import { getSubstitutions } from '@/lib/shopping/substitutions'
import { MenuModifications } from '@/components/events/menu-modifications'
import { UnusedIngredients } from '@/components/events/unused-ingredients'
import { ShoppingSubstitutions } from '@/components/events/shopping-substitutions'
import { TimeTracking } from '@/components/events/time-tracking'
import { MessageThread } from '@/components/messages/message-thread'
import { MessageLogForm } from '@/components/messages/message-log-form'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EventExportButton } from '@/components/exports/event-export-button'
import { EventActionsOverflow } from '@/components/events/event-actions-overflow'
import { ChefGuestPanel } from '@/components/sharing/chef-guest-panel'
import { EventStatusRealtimeSync } from '@/components/events/event-status-realtime-sync'
import { getEventShares, getEventGuests, getEventRSVPSummary } from '@/lib/sharing/actions'
import { getEventPhotosForChef } from '@/lib/events/photo-actions'
import { EventPhotoGallery } from '@/components/events/event-photo-gallery'
import { getCancellationRefundRecommendation } from '@/lib/cancellation/refund-actions'
import { RecordPaymentPanel, ProcessRefundPanel } from '@/components/events/payment-actions-panel'
import { getEventMapUrl, geocode, getDirections } from '@/lib/maps/mapbox'
import { getChefPreferences } from '@/lib/chef/actions'
import { CostStaleBanner } from '@/components/pricing/cost-stale-banner'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import { createServerClient } from '@/lib/db/server'
import { getEventContingencyNotes, listEmergencyContacts } from '@/lib/contingency/actions'
import { getEventTempLog } from '@/lib/compliance/actions'
import { listStaffMembers, getEventStaffRoster } from '@/lib/staff/actions'
import { getMenuApprovalStatus } from '@/lib/events/menu-approval-actions'
import { ContingencyPanel } from '@/components/events/contingency-panel'
import { TempLogPanel } from '@/components/events/temp-log-panel'
import { EventStaffPanel } from '@/components/events/event-staff-panel'
import { MenuApprovalStatus } from '@/components/events/menu-approval-status'
import { MenuLibraryPicker } from '@/components/events/menu-library-picker'
import { PreServiceChecklistSection } from '@/components/events/pre-service-checklist-section'
import { getMenuLibraryForEvent } from '@/lib/menus/showcase-actions'
import { EventPrepSchedule } from '@/components/events/event-prep-schedule'
import { PrepBlockNudgeBanner } from '@/components/events/prep-block-nudge'
import { getEventPrepBlocks } from '@/lib/scheduling/prep-block-actions'
import { getParAlerts } from '@/lib/inventory/count-actions'
import { ReadinessGatePanel } from '@/components/events/readiness-gate-panel'
import { getEventReadiness } from '@/lib/events/readiness'
import { getTakeAChefConversionData } from '@/lib/inquiries/take-a-chef-capture-actions'
import { getTakeAChefEventFinance } from '@/lib/integrations/take-a-chef-finance-actions'
import { getMarketplaceConversionData } from '@/lib/marketplace/conversion-actions'
import { MarketplaceConvertBanner } from '@/components/events/marketplace-convert-banner'
import { EventCollaboratorsPanel } from '@/components/events/event-collaborators-panel'
import { getEventCollaborators } from '@/lib/collaboration/actions'
import { getEventCollaborators as getRevenueSplitCollaborators } from '@/lib/events/collaborator-actions'
import { ContractSection } from '@/components/contracts/contract-section'
import { QuickReceiptCapture } from '@/components/events/quick-receipt-capture'
import { AvailableLeftovers } from '@/components/events/available-leftovers'
import { getAvailableCarryForwardItems } from '@/lib/events/carry-forward'
import { getPackingConfirmationCount } from '@/lib/packing/actions'
import { getPaymentPlan } from '@/lib/finance/payment-plan-actions'
import { PaymentPlanPanel } from '@/components/finance/payment-plan-panel'
import { getMileageLogs } from '@/lib/finance/mileage-actions'
import { MileageLogPanel } from '@/components/finance/mileage-log-panel'
import { getEventTips } from '@/lib/finance/tip-actions'
import { TipLogPanel } from '@/components/finance/tip-log-panel'
import { QuickDebriefPrompt } from '@/components/events/quick-debrief-prompt'
import { BudgetTracker } from '@/components/events/budget-tracker'
import { WeatherPanel } from '@/components/events/weather-panel'
import { GeocodeAddressButton } from '@/components/events/geocode-address-button'
import { ClientPortalQR } from '@/components/events/client-portal-qr'
import {
  EventDetailMobileNav,
  EventDetailSection,
} from '@/components/events/event-detail-mobile-nav'
import { AllergenRiskPanel } from '@/components/ai/allergen-risk-panel'
import { ServiceTimelinePanel } from '@/components/ai/service-timeline-panel'
import { PrepTimelinePanel } from '@/components/ai/prep-timeline-panel'
import { StaffBriefingAIPanel } from '@/components/ai/staff-briefing-ai-panel'
import { ContingencyAIPanel } from '@/components/ai/contingency-ai-panel'
import { CarryForwardMatchPanel } from '@/components/ai/carry-forward-match-panel'
import { GroceryConsolidationPanel } from '@/components/ai/grocery-consolidation-panel'
import { MenuNutritionalPanel } from '@/components/ai/menu-nutritional-panel'
import { TempSafetyPanel } from '@/components/ai/temp-safety-panel'
import { PricingIntelligencePanel } from '@/components/ai/pricing-intelligence-panel'
import { ContractGeneratorPanel } from '@/components/ai/contract-generator-panel'
import { GuestCodePanel } from '@/components/events/guest-code-panel'
import { getEventGuestLeadCount } from '@/lib/guest-leads/actions'
import { HostMessageTemplate } from '@/components/sharing/host-message-template'
import { GuestMessagesPanel } from '@/components/events/guest-messages-panel'
import { PhotoConsentSummary } from '@/components/events/photo-consent-summary'
import { RSVPTrackerPanel } from '@/components/events/rsvp-tracker-panel'
import { getEventMessagesForChef } from '@/lib/guest-messages/actions'
import { getEntityActivityTimeline } from '@/lib/activity/entity-timeline'
import { getQrCodeUrl } from '@/lib/qr/qr-code'
import { shortenUrl } from '@/lib/links/url-shortener'
import { EventHubLinkPanel } from '@/components/hub/event-hub-link-panel'
import { getEventHubGroupToken } from '@/lib/hub/integration-actions'
import { getEventTicketTypes, getEventTickets, getEventTicketSummary } from '@/lib/tickets/actions'
import { EventDetailOverviewTab } from './_components/event-detail-overview-tab'
import { EventDetailMoneyTab } from './_components/event-detail-money-tab'
import { EventDetailTicketsTab } from './_components/event-detail-tickets-tab'
import { forecastMenuCost, type CostForecast } from '@/lib/openclaw/cost-forecast-actions'
import { EventDetailOpsTab } from './_components/event-detail-ops-tab'
import { EventDetailPrepTab } from './_components/event-detail-prep-tab'
import { EventDetailWrapTab } from './_components/event-detail-wrap-tab'
import { getEventPrepTimeline } from '@/lib/prep-timeline/actions'
import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { EventIntelligencePanel } from '@/components/intelligence/event-intelligence-panel'
import { getLifecycleProgress } from '@/lib/lifecycle/actions'
import { getChefArchetype } from '@/lib/archetypes/actions'
import { LifecycleProgressPanel } from '@/components/lifecycle/lifecycle-progress-panel'

async function getEventMenuCostSummary(eventId: string) {
  const db: any = createServerClient()
  const { data } = await db
    .from('menu_cost_summary')
    .select(
      'total_recipe_cost_cents, cost_per_guest_cents, food_cost_percentage, total_component_count, has_all_recipe_costs'
    )
    .eq('event_id', eventId)
    .single()

  if (!data) return null
  return {
    totalRecipeCostCents: data.total_recipe_cost_cents as number | null,
    costPerGuestCents: data.cost_per_guest_cents as number | null,
    foodCostPercentage: data.food_cost_percentage as number | null,
    totalComponentCount: data.total_component_count as number | null,
    hasAllRecipeCosts: data.has_all_recipe_costs as boolean | null,
  }
}

function isEventSoon(eventDate: Date | string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(today)
  dayAfter.setDate(dayAfter.getDate() + 2)
  const evDate = new Date(dateToDateString(eventDate) + 'T00:00:00')
  return evDate >= today && evDate < dayAfter
}

function isEventToday(eventDate: Date | string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const evDate = new Date(dateToDateString(eventDate) + 'T00:00:00')
  return evDate >= today && evDate < tomorrow
}

function isEventWithinDays(eventDate: Date | string, days: number): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const cutoff = new Date(today)
  cutoff.setDate(cutoff.getDate() + days)
  const evDate = new Date(dateToDateString(eventDate) + 'T00:00:00')
  return evDate >= today && evDate <= cutoff
}

async function getEventFinancialSummary(eventId: string) {
  const db: any = createServerClient()

  // Use the event_financial_summary view
  const { data: summary } = await db
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()

  return {
    totalPaid: summary?.total_paid_cents ?? 0,
    totalRefunded: summary?.total_refunded_cents ?? 0,
    outstandingBalance: summary?.outstanding_balance_cents ?? 0,
    paymentStatus: summary?.payment_status ?? null,
  }
}

async function getEventTransitions(eventId: string) {
  const db: any = createServerClient()

  const { data: transitions } = await db
    .from('event_state_transitions')
    .select('*')
    .eq('event_id', eventId)
    .order('transitioned_at', { ascending: true })

  return transitions || []
}

async function getEventMenusForCheck(eventId: string): Promise<string | false> {
  const db: any = createServerClient()

  const { data: menus } = await db.from('menus').select('id').eq('event_id', eventId).limit(1)

  return menus && menus.length > 0 ? menus[0].id : false
}

/**
 * Get driving distance/time from chef's home to event venue.
 * Geocodes chef home address on the fly, then calls Mapbox Directions API.
 * Returns null if either location is missing or geocoding fails.
 */
async function getChefToVenueTravel(
  eventLat: number,
  eventLng: number
): Promise<{ distanceMiles: number; durationMinutes: number } | null> {
  try {
    const prefs = await getChefPreferences()
    const homeAddr = [prefs.home_address, prefs.home_city, prefs.home_state, prefs.home_zip]
      .filter(Boolean)
      .join(', ')
    if (!homeAddr) return null

    const homeCoords = await geocode(homeAddr)
    if (!homeCoords) return null

    const directions = await getDirections(homeCoords.lng, homeCoords.lat, eventLng, eventLat)
    if (!directions) return null

    return {
      distanceMiles: directions.distanceMiles,
      durationMinutes: directions.durationMinutes,
    }
  } catch {
    return null
  }
}

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams?: { tab?: string }
}) {
  const activeTab = (searchParams?.tab ?? 'overview') as
    | 'overview'
    | 'money'
    | 'tickets'
    | 'ops'
    | 'wrap'
  const user = await requireChef()

  const event = await getEventById(params.id)

  if (!event) {
    notFound()
  }

  // Get financial summary, transitions, and closure data in parallel
  const isCompletedOrBeyond = ['completed', 'in_progress'].includes(event.status)
  const canTrackTime = !['draft', 'cancelled'].includes(event.status)

  const [
    { totalPaid, totalRefunded, outstandingBalance },
    transitions,
    closureStatus,
    aar,
    docReadiness,
    businessDocs,
    eventMenus,
    eventExpenseData,
    profitSummary,
    budgetGuardrail,
    unrecordedComponents,
    aiConfigured,
    dopProgress,
    messages,
    templates,
    eventLoyaltyTxs,
    eventLoyaltyImpact,
    menuMods,
    unusedItems,
    substitutionItems,
    eventReadiness,
    timelineEntries,
    lifecycleProgress,
    menuCostSummary,
    chefArchetype,
    ledgerEntries,
  ] = await Promise.all([
    getEventFinancialSummary(params.id),
    getEventTransitions(params.id),
    isCompletedOrBeyond
      ? getEventClosureStatus(params.id).catch(() => null)
      : Promise.resolve(null),
    isCompletedOrBeyond ? getAARByEventId(params.id) : Promise.resolve(null),
    getDocumentReadiness(params.id),
    getBusinessDocInfo(params.id).catch(() => null),
    getEventMenusForCheck(params.id),
    getEventExpenses(params.id),
    getEventProfitSummary(params.id),
    getBudgetGuardrail(params.id),
    isCompletedOrBeyond ? getUnrecordedComponentsForEvent(params.id) : Promise.resolve([]),
    isAIConfigured(),
    getEventDOPProgress(params.id),
    getMessageThread('event', params.id, {
      includeInquiryMessages: !!event.inquiry_id,
      inquiryId: event.inquiry_id ?? undefined,
    }),
    getResponseTemplates(),
    event.status === 'completed' && event.client_id
      ? getLoyaltyTransactions(event.client_id)
          .then((txs) => txs.filter((tx) => tx.event_id === params.id))
          .catch(() => [])
      : Promise.resolve([]),
    event.client_id
      ? getEventLoyaltyImpactByTenant({
          tenantId: (event as any).tenant_id,
          clientId: event.client_id,
          guestCount: event.guest_count || 0,
          eventTotalCents:
            (event as any).total_price_cents ?? (event as any).quoted_price_cents ?? 0,
        }).catch(() => null)
      : Promise.resolve(null),
    isCompletedOrBeyond ? getEventModifications(params.id) : Promise.resolve([]),
    isCompletedOrBeyond ? getUnusedIngredients(params.id) : Promise.resolve([]),
    getSubstitutions(params.id),
    getEventReadiness(params.id).catch(() => null),
    getEntityActivityTimeline('event', params.id),
    getLifecycleProgress(event.inquiry_id ?? undefined, params.id).catch(() => null),
    getEventMenuCostSummary(params.id).catch(() => null),
    getChefArchetype().catch(() => null),
    import('@/lib/events/offline-payment-actions')
      .then((m) => m.getEventLedgerEntries(params.id))
      .catch(() => []),
  ])

  const eventLoyaltyPoints = (eventLoyaltyTxs as { points: number }[]).reduce(
    (sum, tx) => sum + tx.points,
    0
  )
  const isEventOwner = (event as any).tenant_id === user.entityId

  const COLLAB_ROLE_LABELS: Record<string, string> = {
    primary: 'Primary Chef',
    co_host: 'Co-Host',
    sous_chef: 'Sous Chef',
    observer: 'Observer',
  }

  // ALL remaining fetches in a single Promise.all â€” eliminates sequential waterfalls
  const [
    refundRecommendationData,
    tacConversion,
    marketplaceConversion,
    guestShares,
    guestList,
    rsvpSummary,
    eventPhotos,
    carryForwardItems,
    paymentPlanInstallments,
    mileageEntries,
    eventTips,
    guestLeadCount,
    guestWallMessages,
    travelInfo,
    contingencyNotes,
    emergencyContacts,
    tempLogs,
    staffMembers,
    staffAssignments,
    menuApprovalData,
    prepBlocks,
    eventCollaborators,
    packingConfirmedCount,
    hubGroupToken,
    menuLibraryData,
    chefDisplayName,
    takeAChefFinance,
    eventHasAllergyData,
    eventChatConversationId,
    revenueSplitCollaborators,
    parAlerts,
  ] = await Promise.all([
    // Refund recommendation â€” only for cancelled events with payments
    event.status === 'cancelled' && totalPaid > 0
      ? getCancellationRefundRecommendation(params.id).catch(() => null)
      : Promise.resolve(null),
    // Take a Chef conversion (legacy) â€” only for completed events
    event.status === 'completed'
      ? getTakeAChefConversionData(params.id).catch(() => null)
      : Promise.resolve(null),
    // Generalized marketplace conversion â€” any platform, completed events
    event.status === 'completed'
      ? getMarketplaceConversionData(params.id).catch(() => null)
      : Promise.resolve(null),
    // Guest & sharing data
    getEventShares(params.id),
    getEventGuests(params.id),
    getEventRSVPSummary(params.id),
    isCompletedOrBeyond ? getEventPhotosForChef(params.id) : Promise.resolve([]),
    event.status !== 'cancelled'
      ? getAvailableCarryForwardItems(params.id).catch(() => [])
      : Promise.resolve([]),
    getPaymentPlan(params.id).catch(() => []),
    getMileageLogs().catch(() => []),
    getEventTips(params.id).catch(() => []),
    getEventGuestLeadCount(params.id).catch(() => 0),
    getEventMessagesForChef(params.id).catch(() => []),
    (event as any).location_lat && (event as any).location_lng
      ? getChefToVenueTravel((event as any).location_lat, (event as any).location_lng)
      : Promise.resolve(null),
    // Operational panel data
    event.status !== 'cancelled'
      ? getEventContingencyNotes(params.id).catch(() => [])
      : Promise.resolve([]),
    event.status !== 'cancelled' ? listEmergencyContacts().catch(() => []) : Promise.resolve([]),
    ['in_progress', 'completed'].includes(event.status)
      ? getEventTempLog(params.id).catch(() => [])
      : Promise.resolve([]),
    !['draft', 'cancelled'].includes(event.status)
      ? listStaffMembers().catch(() => [])
      : Promise.resolve([]),
    !['draft', 'cancelled'].includes(event.status)
      ? getEventStaffRoster(params.id).catch(() => [])
      : Promise.resolve([]),
    eventMenus && event.status !== 'cancelled'
      ? getMenuApprovalStatus(params.id).catch(() => null)
      : Promise.resolve(null),
    event.status !== 'cancelled'
      ? getEventPrepBlocks(params.id).catch(() => [])
      : Promise.resolve([]),
    getEventCollaborators(params.id).catch(() => []),
    ['confirmed', 'in_progress'].includes(event.status)
      ? getPackingConfirmationCount(params.id).catch(() => 0)
      : Promise.resolve(0),
    getEventHubGroupToken(params.id).catch(() => null),
    event.status !== 'cancelled'
      ? getMenuLibraryForEvent(params.id).catch(() => ({ menus: [], preferences: null }))
      : Promise.resolve({ menus: [], preferences: null }),
    // Chef display name for templates
    (async () => {
      try {
        const sb = createServerClient()
        const { data } = await sb
          .from('chefs')
          .select('display_name, business_name')
          .eq('id', user.entityId!)
          .single()
        return (data?.display_name || data?.business_name || 'your chef') as string
      } catch {
        return 'your chef'
      }
    })(),
    getTakeAChefEventFinance(params.id).catch(() => null),
    hasAllergyData(params.id).catch(() => false),
    // Check for linked real-time chat conversation
    (async () => {
      try {
        const sb = createServerClient()
        const { data } = await sb
          .from('conversations')
          .select('id')
          .eq('event_id', params.id)
          .eq('tenant_id', user.tenantId!)
          .limit(1)
          .maybeSingle()
        return (data?.id as string) || null
      } catch {
        return null
      }
    })(),
    getRevenueSplitCollaborators(params.id).catch(() => []),
    // Par level alerts - only for upcoming confirmed/in_progress events
    ['confirmed', 'in_progress'].includes(event.status) && isEventWithinDays(event.event_date, 7)
      ? getParAlerts().catch(() => [])
      : Promise.resolve([]),
  ])

  // Ticket sales data
  const [ticketTypes, ticketList, ticketSummary] = await Promise.all([
    getEventTicketTypes(params.id).catch(() => []),
    getEventTickets(params.id).catch(() => []),
    getEventTicketSummary(params.id).catch(() => null),
  ])

  // Cost forecast for future events with menus
  let costForecast: CostForecast | null = null
  if (eventMenus && typeof eventMenus === 'string' && event.event_date) {
    const eventDay = new Date(event.event_date)
    if (eventDay > new Date()) {
      costForecast = await forecastMenuCost(eventMenus, event.event_date).catch(() => null)
    }
  }

  // Compute dietary complexity from guest data
  const guestProfiles = (guestList as any[]).map((g: any) => ({
    dietaryRestrictions: g.dietary_restrictions ?? [],
    allergies: g.allergies ?? [],
  }))
  const dietaryComplexity = calculateDietaryComplexity({
    guests: guestProfiles,
    totalGuestCount: event.guest_count || 1,
  })

  // Compute event risk score
  const allGuestRestrictions = guestProfiles.flatMap((g) => g.dietaryRestrictions)
  const allGuestAllergies = guestProfiles.flatMap((g) => g.allergies)
  const eventTotalCents = (event as any).total_price_cents ?? (event as any).quoted_price_cents ?? 0
  const eventRisk = calculateEventRisk({
    eventDate: event.event_date,
    status: event.status as any,
    paymentStatus:
      totalPaid >= eventTotalCents && eventTotalCents > 0
        ? 'paid'
        : totalPaid > 0
          ? 'partial'
          : 'unpaid',
    guestCount: event.guest_count ?? 0,
    dietaryRestrictions: allGuestRestrictions,
    allergies: allGuestAllergies,
    hasMenu: !!eventMenus,
    hasSignedContract: false, // conservative default
    isRepeatClient: false, // conservative default
    serviceStyle: (event as any).service_style ?? undefined,
    quotedPriceCents: (event as any).quoted_price_cents ?? null,
    outstandingBalanceCents: outstandingBalance,
    travelDistanceMiles: travelInfo?.distanceMiles ?? null,
    guestCountConfirmed: (event as any).guest_count_confirmed ?? undefined,
    occasion: event.occasion ?? null,
  })

  // Compute share URL (shortenUrl depends on guestShares resolving)
  const activeShare = (guestShares as any[]).find((s) => s.is_active) || null
  const fullShareUrl = activeShare
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/share/${activeShare.token}`
    : null
  let shortShareUrl = fullShareUrl
  if (fullShareUrl) {
    try {
      const shortened = await shortenUrl(fullShareUrl)
      if (shortened) shortShareUrl = shortened
    } catch {
      // Non-blocking: use the full URL
    }
  }

  // For collaborating chefs (non-owners): find their row to show role context in the banner
  const myCollaboratorRow = !isEventOwner
    ? (eventCollaborators as any[]).find(
        (c: any) => c.chef_id === user.entityId && c.status === 'accepted'
      )
    : null

  return (
    <div className="space-y-6">
      {/* Realtime event status subscription - auto-refreshes when FSM state changes */}
      <EventStatusRealtimeSync eventId={params.id} />

      {/* Cost stale banner - shows when ingredient prices changed since last costing */}
      <CostStaleBanner
        eventId={params.id}
        costNeedsRefresh={(event as any).cost_needs_refresh === true}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">
              {event.occasion || 'Untitled Event'}
            </h1>
            <EventStatusBadge status={event.status} />
            <DietaryComplexityBadge result={dietaryComplexity} />
            <EventRiskBadge result={eventRisk} />
          </div>
          <p className="text-stone-300 mt-1">
            {format(new Date(event.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            {(event as any).event_timezone && (
              <span className="ml-2 text-xs text-stone-300 font-normal">
                {(event as any).event_timezone.replace('America/', '').replace('_', ' ')}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {event.status === 'draft' && (
            <Link href={`/events/${event.id}/edit`}>
              <Button variant="secondary">Edit Event</Button>
            </Link>
          )}
          {/* Event-day quick actions - promoted to primary buttons when event is today */}
          {isEventToday(event.event_date) && !['draft', 'cancelled'].includes(event.status) && (
            <>
              <Link href={`/events/${event.id}/pack`}>
                <Button variant="primary">Pack List</Button>
              </Link>
              {eventMenus && (
                <Link href={`/events/${event.id}/grocery-quote`}>
                  <Button variant="primary">Grocery List</Button>
                </Link>
              )}
            </>
          )}
          <Link href={`/events/${event.id}/schedule`}>
            <Button variant="secondary">Schedule</Button>
          </Link>
          <Link href={`/events/${event.id}/documents`}>
            <Button variant="secondary">Documents</Button>
          </Link>
          <EventActionsOverflow
            actions={[
              ...(!isEventToday(event.event_date) && !['draft', 'cancelled'].includes(event.status)
                ? [{ label: 'Packing List', href: `/events/${event.id}/pack` }]
                : []),
              ...(!isEventToday(event.event_date) &&
              eventMenus &&
              !['cancelled'].includes(event.status)
                ? [{ label: 'Grocery Quote', href: `/events/${event.id}/grocery-quote` }]
                : []),
              { label: 'Travel Plan', href: `/events/${event.id}/travel` },
              ...(event.status === 'completed'
                ? [{ label: 'Create Story', href: `/events/${event.id}/story` }]
                : []),
            ]}
          />
          <Link href="/events">
            <Button variant="ghost">Back to Events</Button>
          </Link>
        </div>
      </div>

      {/* Collaborator role banner â€” shown when viewing another chef's event */}
      {!isEventOwner && myCollaboratorRow && (
        <div className="rounded-lg border border-brand-700 bg-brand-950/50 px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-brand-200">
              You are collaborating on this event as{' '}
              <span className="font-semibold">
                {COLLAB_ROLE_LABELS[myCollaboratorRow.role] ?? myCollaboratorRow.role}
              </span>
            </p>
            <p className="text-xs text-brand-400 mt-0.5">
              This event is owned by another chef. Some sections may be limited to the owner.
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      )}

      {/* Deposit Shortfall Banner â€” accepted/paid events with uncollected deposit */}
      {['accepted', 'paid'].includes(event.status) &&
        (event as any).deposit_amount_cents > 0 &&
        totalPaid < (event as any).deposit_amount_cents && (
          <div className="rounded-lg border border-amber-300 bg-amber-950 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              Awaiting {formatCurrency((event as any).deposit_amount_cents - totalPaid)} deposit
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {formatCurrency((event as any).deposit_amount_cents)} required â€¢{' '}
              {formatCurrency(totalPaid)} collected â€” record payment below to proceed to
              confirmation.
            </p>
          </div>
        )}

      {/* Take a Chef â†’ Direct Conversion Banner */}
      {/* Marketplace Convert Banner â€" works for all platforms (TAC, Yhangry, Cozymeal, etc.) */}
      {marketplaceConversion?.isMarketplace && marketplaceConversion.directBookingUrl && (
        <MarketplaceConvertBanner
          clientName={marketplaceConversion.clientName}
          directBookingUrl={marketplaceConversion.directBookingUrl}
          eventId={params.id}
          platformLabel={marketplaceConversion.platformLabel!}
        />
      )}

      {/* Quick Debrief â€” surfaces within 48h of completion when no AAR exists */}
      {event.status === 'completed' && (
        <QuickDebriefPrompt
          eventId={params.id}
          hasAAR={!!aar}
          completedAt={(event as any).service_completed_at ?? event.updated_at}
        />
      )}

      {/* Event Intelligence */}
      <WidgetErrorBoundary name="Event Intelligence" compact>
        <Suspense fallback={null}>
          <EventIntelligencePanel
            eventId={params.id}
            guestCount={event.guest_count ?? null}
            occasion={event.occasion ?? null}
            quotedPriceCents={(event as any).quoted_price_cents ?? null}
            status={event.status}
            eventDate={event.event_date ?? null}
          />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Lifecycle Progress */}
      {lifecycleProgress && lifecycleProgress.stages.length > 0 && (
        <WidgetErrorBoundary name="Lifecycle Progress" compact>
          <LifecycleProgressPanel
            eventId={params.id}
            inquiryId={event.inquiry_id ?? undefined}
            stages={lifecycleProgress.stages}
            overallPercent={lifecycleProgress.overallPercent}
            currentStage={lifecycleProgress.currentStage}
            nextActions={lifecycleProgress.nextActions}
          />
        </WidgetErrorBoundary>
      )}

      {/* Schedule Summary & DOP Progress */}
      {dopProgress && !['cancelled'].includes(event.status) && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-sm font-semibold text-stone-300">Preparation Progress</h3>
                <Link
                  href={`/events/${event.id}/schedule`}
                  className="text-xs text-brand-500 hover:text-brand-400"
                >
                  View full schedule &rarr;
                </Link>
              </div>
              <DOPProgressBar completed={dopProgress.completed} total={dopProgress.total} />
            </div>
          </div>
        </Card>
      )}

      {/* Packing Progress â€” for confirmed/in_progress events */}
      {['confirmed', 'in_progress'].includes(event.status) && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-sm font-semibold text-stone-300">Packing</h3>
                <Link
                  href={`/events/${event.id}/pack`}
                  className="text-xs text-brand-500 hover:text-brand-400"
                >
                  Open checklist &rarr;
                </Link>
              </div>
              {(event as any).car_packed ? (
                <p className="text-sm text-emerald-700 font-medium">Car packed</p>
              ) : packingConfirmedCount > 0 ? (
                <p className="text-sm text-stone-300">
                  {packingConfirmedCount} item{packingConfirmedCount !== 1 ? 's' : ''} confirmed
                  packed
                </p>
              ) : (
                <p className="text-sm text-stone-300">Not started â€” open checklist to begin</p>
              )}
            </div>
            {(event as any).car_packed && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900 text-emerald-800">
                Packed
              </span>
            )}
          </div>
        </Card>
      )}

      {/* Pre-Service Checklist (Phase 4) - shown for today/tomorrow events */}
      {['confirmed', 'paid', 'in_progress', 'accepted'].includes(event.status) &&
        isEventSoon(event.event_date) && <PreServiceChecklistSection eventId={event.id} />}

      {/* Prep Block Nudge - confirmed events with no prep blocks scheduled */}
      {event.status === 'confirmed' && (prepBlocks as any[]).length === 0 && (
        <PrepBlockNudgeBanner eventId={event.id} />
      )}

      {/* Par Level Alert - items below par for upcoming events */}
      {(parAlerts as any[]).length > 0 && (
        <Card className="p-4 border-amber-700/50 bg-amber-950/20">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-400">
                {(parAlerts as any[]).length} item{(parAlerts as any[]).length !== 1 ? 's' : ''}{' '}
                below par level
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                {(parAlerts as any[])
                  .slice(0, 3)
                  .map((a: any) => a.ingredientName)
                  .join(', ')}
                {(parAlerts as any[]).length > 3 ? ` +${(parAlerts as any[]).length - 3} more` : ''}
              </p>
            </div>
            <Link
              href="/inventory"
              className="shrink-0 text-xs text-amber-400 hover:underline font-medium"
            >
              Check inventory
            </Link>
          </div>
        </Card>
      )}

      {/* Prep Schedule */}
      {event.status !== 'cancelled' && (
        <EventPrepSchedule eventId={event.id} initialBlocks={prepBlocks as any} />
      )}

      {/* ============================================ */}
      {/* MOBILE TAB NAV â€” hidden on md+               */}
      {/* ============================================ */}
      <EventDetailMobileNav />

      {/* ============================================ */}
      {/* ============================================ */}
      {/* TAB: OVERVIEW - Event details, client, comms */}
      {/* ============================================ */}
      <EventDetailOverviewTab
        activeTab={activeTab}
        event={event}
        dopProgress={dopProgress}
        packingConfirmedCount={packingConfirmedCount}
        travelInfo={travelInfo}
        eventLoyaltyImpact={eventLoyaltyImpact}
        eventLoyaltyPoints={eventLoyaltyPoints}
        activeShare={activeShare}
        shortShareUrl={shortShareUrl}
        fullShareUrl={fullShareUrl}
        eventMenus={eventMenus}
        hubGroupToken={hubGroupToken as string | null}
        guestList={guestList as any[]}
        rsvpSummary={rsvpSummary as any}
        chefDisplayName={chefDisplayName}
        guestLeadCount={guestLeadCount as number}
        guestWallMessages={guestWallMessages as any[]}
        messages={messages}
        templates={templates}
        chatConversationId={eventChatConversationId as string | null}
      />

      {/* TAB: MONEY â€” Financials, payments, expenses  */}
      {/* ============================================ */}
      <EventDetailMoneyTab
        activeTab={activeTab}
        event={event}
        menuLibraryData={menuLibraryData}
        eventMenus={eventMenus}
        menuApprovalData={menuApprovalData}
        totalPaid={totalPaid}
        outstandingBalance={outstandingBalance}
        paymentPlanInstallments={paymentPlanInstallments}
        mileageEntries={mileageEntries}
        eventTips={eventTips}
        refundRecommendationData={refundRecommendationData}
        totalRefunded={totalRefunded}
        budgetGuardrail={budgetGuardrail}
        eventExpenseData={eventExpenseData}
        profitSummary={profitSummary}
        eventLoyaltyPoints={eventLoyaltyPoints}
        takeAChefFinance={takeAChefFinance}
        costForecast={costForecast}
        menuCostSummary={menuCostSummary}
        chefArchetype={chefArchetype}
        ledgerEntries={ledgerEntries as any[]}
      />

      {/* TAB: TICKETS - Ticket sales and management   */}
      {/* ============================================ */}
      <EventDetailTicketsTab
        activeTab={activeTab}
        eventId={event.id}
        eventStatus={event.status}
        ticketTypes={ticketTypes as any[]}
        tickets={ticketList as any[]}
        summary={ticketSummary}
        shareToken={(activeShare as any)?.share_token ?? null}
      />

      {/* ============================================ */}
      {/* TAB: OPS - Staff, temps, docs, transitions   */}
      {/* ============================================ */}
      <EventDetailOpsTab
        activeTab={activeTab}
        event={event}
        canTrackTime={canTrackTime}
        updateEventTimeAndCard={updateEventTimeAndCard}
        startEventActivity={startEventActivity}
        stopEventActivity={stopEventActivity}
        staffMembers={staffMembers as any[]}
        staffAssignments={staffAssignments as any[]}
        isEventOwner={isEventOwner}
        eventCollaborators={eventCollaborators as any[]}
        tempLogs={tempLogs as any[]}
        substitutionItems={substitutionItems}
        isCompletedOrBeyond={isCompletedOrBeyond}
        menuMods={menuMods as any[]}
        carryForwardItems={carryForwardItems}
        unusedItems={unusedItems as any[]}
        contingencyNotes={contingencyNotes as any[]}
        emergencyContacts={emergencyContacts as any[]}
        docReadiness={docReadiness}
        businessDocs={businessDocs}
        eventReadiness={eventReadiness}
        closureStatus={closureStatus}
        aar={aar}
        eventPhotos={eventPhotos}
        eventMenus={eventMenus}
        unrecordedComponents={unrecordedComponents}
        aiConfigured={aiConfigured}
        hasAllergyData={eventHasAllergyData as boolean}
        revenueSplitCollaborators={revenueSplitCollaborators as any[]}
        eventTotalCents={eventTotalCents}
      />
      {/* TAB: WRAP-UP â€” Debrief, survey, history      */}
      {/* ============================================ */}
      <EventDetailWrapTab
        activeTab={activeTab}
        eventId={event.id}
        eventStatus={event.status}
        eventClientId={event.client_id}
        followUpSent={(event as any).follow_up_sent ?? false}
        followUpSentAt={(event as any).follow_up_sent_at ?? null}
        debriefCompletedAt={(event as any).debrief_completed_at ?? null}
        hasAAR={!!aar}
        hasClosureStatus={!!closureStatus}
        transitions={transitions as any[]}
        timelineEntries={timelineEntries}
      />
    </div>
  )
}
