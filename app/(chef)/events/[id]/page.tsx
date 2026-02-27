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
import { getEventExpenses, getEventProfitSummary, getBudgetGuardrail } from '@/lib/expenses/actions'
import { getUnrecordedComponentsForEvent } from '@/lib/recipes/actions'
import { isAIConfigured } from '@/lib/ai/parse'
import { getEventDOPProgress } from '@/lib/scheduling/actions'
import { getLoyaltyTransactions } from '@/lib/loyalty/actions'
import { getMessageThread, getResponseTemplates } from '@/lib/messages/actions'
import { EventStatusBadge } from '@/components/events/event-status-badge'
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
import { ChefGuestPanel } from '@/components/sharing/chef-guest-panel'
import { EventStatusRealtimeSync } from '@/components/events/event-status-realtime-sync'
import { getEventShares, getEventGuests, getEventRSVPSummary } from '@/lib/sharing/actions'
import { getEventPhotosForChef } from '@/lib/events/photo-actions'
import { EventPhotoGallery } from '@/components/events/event-photo-gallery'
import { getCancellationRefundRecommendation } from '@/lib/cancellation/refund-actions'
import { RecordPaymentPanel, ProcessRefundPanel } from '@/components/events/payment-actions-panel'
import { getEventMapUrl, geocode, getDirections } from '@/lib/maps/mapbox'
import { getChefPreferences } from '@/lib/chef/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import { createServerClient } from '@/lib/supabase/server'
import { getEventContingencyNotes, listEmergencyContacts } from '@/lib/contingency/actions'
import { getEventTempLog } from '@/lib/compliance/actions'
import { listStaffMembers, getEventStaffRoster } from '@/lib/staff/actions'
import { getMenuApprovalStatus } from '@/lib/events/menu-approval-actions'
import { ContingencyPanel } from '@/components/events/contingency-panel'
import { TempLogPanel } from '@/components/events/temp-log-panel'
import { EventStaffPanel } from '@/components/events/event-staff-panel'
import { MenuApprovalStatus } from '@/components/events/menu-approval-status'
import { EventPrepSchedule } from '@/components/events/event-prep-schedule'
import { PrepBlockNudgeBanner } from '@/components/events/prep-block-nudge'
import { getEventPrepBlocks } from '@/lib/scheduling/prep-block-actions'
import { ReadinessGatePanel } from '@/components/events/readiness-gate-panel'
import { getEventReadiness } from '@/lib/events/readiness'
import { getTakeAChefConversionData } from '@/lib/inquiries/take-a-chef-capture-actions'
import { TakeAChefConvertBanner } from '@/components/events/take-a-chef-convert-banner'
import { EventCollaboratorsPanel } from '@/components/events/event-collaborators-panel'
import { getEventCollaborators } from '@/lib/collaboration/actions'
import { sendClientSurvey } from '@/lib/surveys/actions'
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
import { TempLogAnomalyPanel } from '@/components/ai/temp-log-anomaly-panel'
import { PricingIntelligencePanel } from '@/components/ai/pricing-intelligence-panel'
import { ContractGeneratorPanel } from '@/components/ai/contract-generator-panel'
import { AARGeneratorPanel } from '@/components/ai/aar-generator-panel'
import { ReviewRequestPanel } from '@/components/ai/review-request-panel'
import { GratuityPanel } from '@/components/ai/gratuity-panel'
import { SocialCaptionsPanel } from '@/components/ai/social-captions-panel'
import { GuestCodePanel } from '@/components/events/guest-code-panel'
import { getEventGuestLeadCount } from '@/lib/guest-leads/actions'
import { HostMessageTemplate } from '@/components/sharing/host-message-template'
import { GuestMessagesPanel } from '@/components/events/guest-messages-panel'
import { PostEventOutreachPanel } from '@/components/events/post-event-outreach-panel'
import { PhotoConsentSummary } from '@/components/events/photo-consent-summary'
import { RSVPTrackerPanel } from '@/components/events/rsvp-tracker-panel'
import { getEventMessagesForChef } from '@/lib/guest-messages/actions'
import { EntityActivityTimeline } from '@/components/activity/entity-activity-timeline'
import { getEntityActivityTimeline } from '@/lib/activity/entity-timeline'
import { getQrCodeUrl } from '@/lib/qr/qr-code'
import { shortenUrl } from '@/lib/links/url-shortener'

async function getEventFinancialSummary(eventId: string) {
  const supabase = createServerClient()

  // Use the event_financial_summary view
  const { data: summary } = await supabase
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
  const supabase = createServerClient()

  const { data: transitions } = await supabase
    .from('event_state_transitions')
    .select('*')
    .eq('event_id', eventId)
    .order('transitioned_at', { ascending: true })

  return transitions || []
}

async function getEventMenusForCheck(eventId: string): Promise<string | false> {
  const supabase = createServerClient()

  const { data: menus } = await supabase.from('menus').select('id').eq('event_id', eventId).limit(1)

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
  const activeTab = (searchParams?.tab ?? 'overview') as 'overview' | 'money' | 'ops' | 'wrap'
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
    menuMods,
    unusedItems,
    substitutionItems,
    eventReadiness,
    timelineEntries,
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
    isCompletedOrBeyond ? getEventModifications(params.id) : Promise.resolve([]),
    isCompletedOrBeyond ? getUnusedIngredients(params.id) : Promise.resolve([]),
    getSubstitutions(params.id),
    getEventReadiness(params.id).catch(() => null),
    getEntityActivityTimeline('event', params.id),
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

  // Fetch refund recommendation for cancelled events with prior payments
  const refundRecommendationData =
    event.status === 'cancelled' && totalPaid > 0
      ? await getCancellationRefundRecommendation(params.id).catch(() => null)
      : null

  // Check if this is a Take a Chef-sourced event (only on completed events)
  const tacConversion =
    event.status === 'completed'
      ? await getTakeAChefConversionData(params.id).catch(() => null)
      : null

  // Fetch guest RSVP data, event photos, carry-forward inventory, and travel info
  const [
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
  ] = await Promise.all([
    getEventShares(params.id),
    getEventGuests(params.id),
    getEventRSVPSummary(params.id),
    isCompletedOrBeyond ? getEventPhotosForChef(params.id) : Promise.resolve([]),
    event.status !== 'cancelled'
      ? getAvailableCarryForwardItems(params.id).catch(() => [])
      : Promise.resolve([]),
    getPaymentPlan(params.id).catch(() => []),
    getMileageLogs(params.id).catch(() => []),
    getEventTips(params.id).catch(() => []),
    getEventGuestLeadCount(params.id).catch(() => 0),
    getEventMessagesForChef(params.id).catch(() => []),
    (event as any).location_lat && (event as any).location_lng
      ? getChefToVenueTravel((event as any).location_lat, (event as any).location_lng)
      : Promise.resolve(null),
  ])
  const activeShare = (guestShares as any[]).find((s) => s.is_active) || null
  // Pre-compute shortened share URL for QR codes and templates (non-blocking)
  const fullShareUrl = activeShare
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://chefflow.app'}/share/${activeShare.token}`
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

  // Fetch operational panel data — wrapped in catch so the page works before migrations are applied
  const [
    contingencyNotes,
    emergencyContacts,
    tempLogs,
    staffMembers,
    staffAssignments,
    menuApprovalData,
    prepBlocks,
    eventCollaborators,
    packingConfirmedCount,
  ] = await Promise.all([
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
  ])

  // Fetch chef display name for templates
  const chefDisplayName = await (async () => {
    const sb = createServerClient()
    const { data } = await sb
      .from('chefs')
      .select('display_name, business_name')
      .eq('id', user.entityId!)
      .single()
    return (data?.display_name || data?.business_name || 'your chef') as string
  })()

  // For collaborating chefs (non-owners): find their row to show role context in the banner
  const myCollaboratorRow = !isEventOwner
    ? (eventCollaborators as any[]).find(
        (c: any) => c.chef_id === user.entityId && c.status === 'accepted'
      )
    : null

  return (
    <div className="space-y-6">
      {/* Realtime event status subscription — auto-refreshes when FSM state changes */}
      <EventStatusRealtimeSync eventId={params.id} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">
              {event.occasion || 'Untitled Event'}
            </h1>
            <EventStatusBadge status={event.status} />
          </div>
          <p className="text-stone-400 mt-1">
            {format(new Date(event.event_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            {(event as any).event_timezone && (
              <span className="ml-2 text-xs text-stone-400 font-normal">
                {(event as any).event_timezone.replace('America/', '').replace('_', ' ')}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {event.status === 'draft' && (
            <Link href={`/events/${event.id}/edit`}>
              <Button variant="secondary">Edit Event</Button>
            </Link>
          )}
          <Link href={`/events/${event.id}/schedule`}>
            <Button variant="secondary">Schedule</Button>
          </Link>
          {!['draft', 'cancelled'].includes(event.status) && (
            <Link href={`/events/${event.id}/pack`}>
              <Button variant="secondary">Packing List</Button>
            </Link>
          )}
          {eventMenus && !['cancelled'].includes(event.status) && (
            <Link href={`/events/${event.id}/grocery-quote`}>
              <Button variant="secondary">Grocery Quote</Button>
            </Link>
          )}
          <Link href={`/events/${event.id}/travel`}>
            <Button variant="secondary">Travel Plan</Button>
          </Link>
          <Link href="/events">
            <Button variant="ghost">Back to Events</Button>
          </Link>
        </div>
      </div>

      {/* Collaborator role banner — shown when viewing another chef's event */}
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

      {/* Deposit Shortfall Banner — accepted/paid events with uncollected deposit */}
      {['accepted', 'paid'].includes(event.status) &&
        (event as any).deposit_amount_cents > 0 &&
        totalPaid < (event as any).deposit_amount_cents && (
          <div className="rounded-lg border border-amber-300 bg-amber-950 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              Awaiting {formatCurrency((event as any).deposit_amount_cents - totalPaid)} deposit
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {formatCurrency((event as any).deposit_amount_cents)} required •{' '}
              {formatCurrency(totalPaid)} collected — record payment below to proceed to
              confirmation.
            </p>
          </div>
        )}

      {/* Take a Chef → Direct Conversion Banner */}
      {tacConversion?.isTakeAChef && tacConversion.directBookingUrl && (
        <TakeAChefConvertBanner
          clientName={tacConversion.clientName}
          directBookingUrl={tacConversion.directBookingUrl}
          eventId={params.id}
        />
      )}

      {/* Quick Debrief — surfaces within 48h of completion when no AAR exists */}
      {event.status === 'completed' && (
        <QuickDebriefPrompt
          eventId={params.id}
          hasAAR={!!aar}
          completedAt={(event as any).service_completed_at ?? event.updated_at}
        />
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
                  className="text-xs text-brand-600 hover:text-brand-400"
                >
                  View full schedule &rarr;
                </Link>
              </div>
              <DOPProgressBar completed={dopProgress.completed} total={dopProgress.total} />
            </div>
          </div>
        </Card>
      )}

      {/* Packing Progress — for confirmed/in_progress events */}
      {['confirmed', 'in_progress'].includes(event.status) && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-sm font-semibold text-stone-300">Packing</h3>
                <Link
                  href={`/events/${event.id}/pack`}
                  className="text-xs text-brand-600 hover:text-brand-400"
                >
                  Open checklist &rarr;
                </Link>
              </div>
              {(event as any).car_packed ? (
                <p className="text-sm text-emerald-700 font-medium">Car packed</p>
              ) : packingConfirmedCount > 0 ? (
                <p className="text-sm text-stone-400">
                  {packingConfirmedCount} item{packingConfirmedCount !== 1 ? 's' : ''} confirmed
                  packed
                </p>
              ) : (
                <p className="text-sm text-stone-400">Not started — open checklist to begin</p>
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

      {/* Prep Block Nudge — confirmed events with no prep blocks scheduled */}
      {event.status === 'confirmed' && (prepBlocks as any[]).length === 0 && (
        <PrepBlockNudgeBanner eventId={event.id} />
      )}

      {/* Prep Schedule */}
      {event.status !== 'cancelled' && (
        <EventPrepSchedule eventId={event.id} initialBlocks={prepBlocks as any} />
      )}

      {/* ============================================ */}
      {/* MOBILE TAB NAV — hidden on md+               */}
      {/* ============================================ */}
      <EventDetailMobileNav />

      {/* ============================================ */}
      {/* TAB: OVERVIEW — Event details, client, comms */}
      {/* ============================================ */}
      <EventDetailSection tab="overview" activeTab={activeTab}>
        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Event Details */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Event Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-stone-500">Location</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  {[
                    event.location_address,
                    event.location_city,
                    event.location_state,
                    event.location_zip,
                  ]
                    .filter(Boolean)
                    .join(', ') || 'Not set'}
                </dd>
                {(event as any).location_lat && (event as any).location_lng ? (
                  <div className="mt-2 space-y-2">
                    {/* Mapbox static map — clickable to open Google Maps directions */}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${(event as any).location_lat},${(event as any).location_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getEventMapUrl(
                          (event as any).location_lng,
                          (event as any).location_lat
                        )}
                        alt="Event location map"
                        className="w-full h-[200px] object-cover rounded-lg border border-stone-700"
                      />
                    </a>
                    {/* Travel distance/time from chef's home */}
                    {travelInfo && (
                      <p className="text-xs text-stone-400">
                        {travelInfo.distanceMiles} miles &middot; ~{travelInfo.durationMinutes} min
                        drive from home
                      </p>
                    )}
                    {/* Open-Meteo weather forecast for the event date */}
                    <WeatherPanel
                      lat={(event as any).location_lat}
                      lng={(event as any).location_lng}
                      eventDate={event.event_date}
                    />
                  </div>
                ) : event.location_address ? (
                  <GeocodeAddressButton eventId={event.id} />
                ) : null}
              </div>
              {(event as any).referral_partner && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Partner Venue</dt>
                  <dd className="text-sm text-stone-100 mt-1">
                    <Link
                      href={`/partners/${(event as any).referral_partner_id}`}
                      className="text-brand-600 hover:underline font-medium"
                    >
                      {(event as any).referral_partner.name}
                    </Link>
                    {(event as any).partner_location && (
                      <span className="text-stone-500">
                        {' '}
                        → {(event as any).partner_location.name}
                        {(event as any).partner_location.city && (
                          <span className="text-stone-400">
                            {' '}
                            (
                            {[
                              (event as any).partner_location.city,
                              (event as any).partner_location.state,
                            ]
                              .filter(Boolean)
                              .join(', ')}
                            )
                          </span>
                        )}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-stone-500">Number of Guests</dt>
                <dd className="text-sm text-stone-100 mt-1">{event.guest_count}</dd>
              </div>
              {event.special_requests && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Special Requests</dt>
                  <dd className="text-sm text-stone-100 mt-1 whitespace-pre-wrap">
                    {event.special_requests}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-stone-500">Created</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  {format(new Date(event.created_at), 'MMM d, yyyy')}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Client Information */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Client Information</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-stone-500">Name</dt>
                <dd className="text-sm text-stone-100 mt-1">{event.client?.full_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-stone-500">Email</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  <a
                    href={`mailto:${event.client?.email}`}
                    className="text-brand-600 hover:underline"
                  >
                    {event.client?.email}
                  </a>
                </dd>
              </div>
              {event.client?.phone && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Phone</dt>
                  <dd className="text-sm text-stone-100 mt-1">
                    <a
                      href={`tel:${event.client.phone}`}
                      className="text-brand-600 hover:underline"
                    >
                      {event.client.phone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </div>

        {/* Client Portal QR Code */}
        {event.status !== 'cancelled' && event.status !== 'draft' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Client Portal Access</h2>
            <p className="text-sm text-stone-500 mb-4">
              Share this QR code or link so your client can view their event portal.
            </p>
            <ClientPortalQR eventId={event.id} />
          </Card>
        )}

        {/* Share QR Code — only when an active event share link exists */}
        {activeShare && shortShareUrl && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Share QR</h2>
            <p className="text-sm text-stone-500 mb-4">
              Guests scan this code to view event details, RSVP, and more.
            </p>
            <div className="flex items-center gap-5">
              <div className="flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getQrCodeUrl(shortShareUrl, 150)}
                  alt="Event share QR code"
                  width={150}
                  height={150}
                  className="rounded-lg border border-stone-700 shadow-sm"
                />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-xs text-stone-400 break-all">{shortShareUrl}</p>
                <a
                  href={fullShareUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-xs text-brand-600 hover:underline"
                >
                  Open share page ↗
                </a>
              </div>
            </div>
          </Card>
        )}

        {/* Service Contract */}
        <ContractSection eventId={event.id} eventStatus={event.status} />

        {/* AI Contract Generator */}
        {!['cancelled'].includes(event.status) && <ContractGeneratorPanel eventId={event.id} />}

        {/* Guests & RSVPs */}
        {event.status !== 'draft' && event.status !== 'cancelled' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Guests & RSVPs</h2>
            <ChefGuestPanel
              eventShareId={activeShare?.id || null}
              guests={guestList as any[]}
              summary={rsvpSummary as any}
              originalGuestCount={event.guest_count}
              visibility={(activeShare?.visibility_settings as any) || null}
            />
            {activeShare && shortShareUrl && (
              <HostMessageTemplate
                shareUrl={shortShareUrl}
                occasion={event.occasion}
                eventDate={event.event_date}
                chefName={chefDisplayName}
              />
            )}

            {/* RSVP Tracker + Photo Consent — below the guest panel */}
            {(guestList as any[]).length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <RSVPTrackerPanel
                  guests={guestList as any[]}
                  totalExpected={event.guest_count}
                  shareUrl={shortShareUrl}
                  occasion={event.occasion}
                />
                <PhotoConsentSummary guests={guestList as any[]} />
              </div>
            )}
          </Card>
        )}

        {/* Share Recap — for completed events with an active share link */}
        {event.status === 'completed' && activeShare && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-stone-100">Event Recap</h3>
                <p className="text-sm text-stone-500 mt-0.5">
                  Share a keepsake page with guests — photos, messages, and a booking link.
                </p>
              </div>
              <a
                href={`${process.env.NEXT_PUBLIC_APP_URL || 'https://chefflow.app'}/share/${activeShare.token}/recap`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="secondary">View Recap Page</Button>
              </a>
            </div>
          </Card>
        )}

        {/* Guest Pipeline QR Code */}
        {event.status !== 'cancelled' && (event as any).guest_code && (
          <GuestCodePanel
            eventId={event.id}
            guestCode={(event as any).guest_code}
            guestLeadCount={guestLeadCount as number}
          />
        )}

        {/* Guest Excitement Wall — Chef Moderation */}
        {event.status !== 'cancelled' && (guestWallMessages as any[]).length > 0 && (
          <GuestMessagesPanel messages={guestWallMessages as any[]} eventId={event.id} />
        )}

        {/* Post-Event Guest Outreach (completed events only) */}
        {event.status === 'completed' && <PostEventOutreachPanel eventId={event.id} />}

        {/* AI Allergen Risk Matrix */}
        {event.status !== 'draft' && event.status !== 'cancelled' && (
          <AllergenRiskPanel eventId={event.id} />
        )}

        {/* AI Menu Nutritional Summary */}
        {eventMenus && event.status !== 'cancelled' && <MenuNutritionalPanel eventId={event.id} />}

        {/* Communication Log */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Communication</h2>
          {event.inquiry_id && messages.some((m) => m.inquiry_id) && (
            <p className="text-xs text-stone-400 mb-3">
              Includes messages from the original inquiry.
            </p>
          )}
          <MessageThread messages={messages} />
          <div className="mt-4 pt-4 border-t border-stone-700">
            <MessageLogForm
              eventId={event.id}
              clientId={event.client_id ?? undefined}
              templates={templates}
            />
          </div>
        </Card>
      </EventDetailSection>

      {/* ============================================ */}
      {/* TAB: MONEY — Financials, payments, expenses  */}
      {/* ============================================ */}
      <EventDetailSection tab="money" activeTab={activeTab}>
        {/* Menu Approval */}
        {eventMenus && event.status !== 'cancelled' && menuApprovalData && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Menu Approval</h2>
              {typeof eventMenus === 'string' && (
                <Link href={`/menus/${eventMenus}/editor`}>
                  <Button variant="secondary" size="sm">
                    Edit Menu
                  </Button>
                </Link>
              )}
            </div>
            <MenuApprovalStatus
              eventId={event.id}
              status={((menuApprovalData as any).event?.menu_approval_status ?? 'not_sent') as any}
              sentAt={(menuApprovalData as any).event?.menu_sent_at ?? null}
              approvedAt={(menuApprovalData as any).event?.menu_approved_at ?? null}
              revisionNotes={(menuApprovalData as any).event?.menu_revision_notes ?? null}
            />
          </Card>
        )}

        {/* Financial Summary */}
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Financial Summary</h2>
            <div className="flex items-center gap-2">
              <Link href={`/events/${event.id}/invoice`}>
                <Button variant="ghost" size="sm">
                  View Invoice
                </Button>
              </Link>
              <EventExportButton eventId={event.id} />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <dt className="text-sm font-medium text-stone-500">Quoted Price</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                {formatCurrency(event.quoted_price_cents ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Deposit Amount</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                {formatCurrency(event.deposit_amount_cents ?? 0)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Amount Paid</dt>
              <dd className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(totalPaid)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Balance Due</dt>
              <dd
                className={`text-xl sm:text-2xl font-bold mt-1 ${outstandingBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {formatCurrency(outstandingBalance)}
              </dd>
            </div>
          </div>
        </Card>

        {/* AI Pricing Intelligence */}
        {['proposed', 'accepted'].includes(event.status) && (
          <PricingIntelligencePanel eventId={event.id} />
        )}

        {/* Record Payment — for accepted events with outstanding balance */}
        {['accepted', 'paid'].includes(event.status) && outstandingBalance > 0 && (
          <RecordPaymentPanel
            eventId={event.id}
            outstandingBalanceCents={outstandingBalance}
            depositAmountCents={event.deposit_amount_cents ?? 0}
            totalPaidCents={totalPaid}
          />
        )}

        {/* Payment Plan — installment schedule */}
        {event.status !== 'cancelled' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Payment Plan</h2>
            <PaymentPlanPanel
              eventId={event.id}
              initialInstallments={paymentPlanInstallments}
              quotedPriceCents={event.quoted_price_cents}
            />
          </Card>
        )}

        {/* Mileage Log */}
        {event.status !== 'cancelled' && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Mileage Log</h2>
            <MileageLogPanel eventId={event.id} initialEntries={mileageEntries} />
          </Card>
        )}

        {/* Tip Log */}
        {(event.status === 'in_progress' || event.status === 'completed') && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Tips Received</h2>
            <TipLogPanel eventId={event.id} initialTips={eventTips} />
          </Card>
        )}

        {/* Process Refund — for cancelled events with prior payments */}
        {event.status === 'cancelled' && totalPaid > 0 && refundRecommendationData && (
          <ProcessRefundPanel
            eventId={event.id}
            totalPaidCents={totalPaid}
            totalRefundedCents={totalRefunded}
            depositPaidCents={refundRecommendationData.depositPaidCents}
            recommendation={refundRecommendationData.recommendation}
          />
        )}

        {/* Budget Tracker — shows budget vs. actual spend, lets chef set a custom budget */}
        {budgetGuardrail.quotedPriceCents > 0 && (
          <BudgetTracker eventId={event.id} guardrail={budgetGuardrail} />
        )}

        {/* Quick Receipt Capture — shown for active/confirmed events */}
        {['confirmed', 'in_progress'].includes(event.status) && (
          <QuickReceiptCapture eventId={event.id} />
        )}

        {/* Expenses Section */}
        {eventExpenseData.expenses.length > 0 && (
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Expenses</h2>
              <div className="flex items-center gap-2">
                <Link href={`/events/${event.id}/receipts`}>
                  <Button size="sm" variant="ghost">
                    Receipt Summary
                  </Button>
                </Link>
                <Link href={`/expenses/new?event_id=${event.id}`}>
                  <Button size="sm" variant="secondary">
                    Add Expense
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-2">
              {eventExpenseData.expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-stone-100">{exp.description}</p>
                      <p className="text-xs text-stone-500">
                        {exp.vendor_name && `${exp.vendor_name} · `}
                        {format(new Date(exp.expense_date), 'MMM d')}
                        {!exp.is_business && (
                          <span className="ml-1 text-amber-600 font-medium">(Personal)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(exp.amount_cents)}</span>
                    <Link href={`/expenses/${exp.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Category Subtotals */}
            {Object.keys(eventExpenseData.subtotals).length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {Object.entries(eventExpenseData.subtotals).map(([cat, total]) => (
                    <div key={cat}>
                      <span className="text-stone-500 capitalize">{cat.replace('_', ' ')}</span>
                      <p className="font-medium">{formatCurrency(total)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-3 pt-3 border-t border-stone-800 font-medium text-sm">
                  <span>Total Business Expenses</span>
                  <span>{formatCurrency(eventExpenseData.totalBusinessCents)}</span>
                </div>
                {eventExpenseData.totalPersonalCents > 0 && (
                  <div className="flex justify-between mt-1 text-sm text-amber-600">
                    <span>Personal (excluded)</span>
                    <span>{formatCurrency(eventExpenseData.totalPersonalCents)}</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Profit Summary — when both revenue and expenses exist */}
        {profitSummary.expenses.totalBusinessCents > 0 &&
          profitSummary.revenue.totalPaidCents > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Profit Summary</h2>
              <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <dt className="text-sm font-medium text-stone-500">Revenue</dt>
                  <dd className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1">
                    {formatCurrency(
                      profitSummary.revenue.totalPaidCents + profitSummary.revenue.tipCents
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-stone-500">Expenses</dt>
                  <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                    {formatCurrency(profitSummary.expenses.totalBusinessCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-stone-500">Profit</dt>
                  <dd
                    className={`text-xl sm:text-2xl font-bold mt-1 ${
                      profitSummary.profit.grossProfitCents >= 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(profitSummary.profit.grossProfitCents)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-stone-500">Margin</dt>
                  <dd
                    className={`text-xl sm:text-2xl font-bold mt-1 ${
                      profitSummary.profit.profitMarginPercent >= 60
                        ? 'text-emerald-600'
                        : profitSummary.profit.profitMarginPercent >= 40
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}
                  >
                    {profitSummary.profit.profitMarginPercent}%
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-stone-500">
                {profitSummary.profit.foodCostPercent > 0 && (
                  <span>
                    Food cost: {profitSummary.profit.foodCostPercent}% of revenue
                    {profitSummary.profit.chefAvgFoodCostPercent !== null && (
                      <span
                        className={`ml-1.5 font-medium ${
                          profitSummary.profit.foodCostPercent >
                          profitSummary.profit.chefAvgFoodCostPercent
                            ? 'text-amber-600'
                            : 'text-emerald-600'
                        }`}
                      >
                        (
                        {profitSummary.profit.foodCostPercent >
                        profitSummary.profit.chefAvgFoodCostPercent
                          ? '↑'
                          : '↓'}{' '}
                        avg {profitSummary.profit.chefAvgFoodCostPercent}%)
                      </span>
                    )}
                  </span>
                )}
                {/* Estimated vs Actual food cost from grocery quote */}
                {profitSummary.estimatedFoodCost.estimatedCents !== null &&
                  profitSummary.estimatedFoodCost.actualCents !== null &&
                  profitSummary.estimatedFoodCost.deltaPct !== null && (
                    <span
                      className={`font-medium ${
                        Math.abs(Number(profitSummary.estimatedFoodCost.deltaPct)) <= 10
                          ? 'text-emerald-600'
                          : 'text-amber-600'
                      }`}
                    >
                      Estimated: {formatCurrency(profitSummary.estimatedFoodCost.estimatedCents)}
                      {' → '}Actual: {formatCurrency(profitSummary.estimatedFoodCost.actualCents)} (
                      {Number(profitSummary.estimatedFoodCost.deltaPct) > 0 ? '+' : ''}
                      {profitSummary.estimatedFoodCost.deltaPct}%)
                    </span>
                  )}
                {profitSummary.estimatedFoodCost.estimatedCents !== null &&
                  profitSummary.estimatedFoodCost.actualCents === null && (
                    <span className="text-stone-500">
                      Estimated food cost:{' '}
                      {formatCurrency(profitSummary.estimatedFoodCost.estimatedCents)} (from grocery
                      quote)
                    </span>
                  )}
                {profitSummary.profit.effectiveHourlyRateCents && (
                  <span className="font-medium text-stone-300">
                    Effective rate: {formatCurrency(profitSummary.profit.effectiveHourlyRateCents)}
                    /hr
                  </span>
                )}
                {(event as any).leftover_value_received_cents > 0 && (
                  <span className="text-emerald-600">
                    Leftover credit applied: −
                    {formatCurrency((event as any).leftover_value_received_cents)}
                  </span>
                )}
                {profitSummary.cashback && (
                  <span className="text-emerald-600">
                    Est. cash back: {formatCurrency(profitSummary.cashback.estimatedCents)}
                  </span>
                )}
              </div>
              {profitSummary.perGuest && (
                <div className="mt-3 pt-3 border-t border-stone-800 flex flex-wrap gap-4 text-sm text-stone-500">
                  <span className="font-medium text-stone-400">
                    Per guest ({profitSummary.perGuest.guestCount} guests):
                  </span>
                  <span>{formatCurrency(profitSummary.perGuest.revenuePerGuestCents)} revenue</span>
                  <span className="text-red-600">
                    {formatCurrency(profitSummary.perGuest.costPerGuestCents)} cost
                  </span>
                  <span
                    className={
                      profitSummary.perGuest.profitPerGuestCents >= 0
                        ? 'text-emerald-600 font-medium'
                        : 'text-red-600 font-medium'
                    }
                  >
                    {formatCurrency(profitSummary.perGuest.profitPerGuestCents)} profit
                  </span>
                </div>
              )}
            </Card>
          )}

        {/* Loyalty Points Awarded */}
        {event.status === 'completed' && eventLoyaltyPoints > 0 && (
          <Card className="p-6 border-purple-200 bg-purple-950">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-semibold text-purple-900">Loyalty Points Awarded</h2>
                <p className="text-sm text-purple-700 mt-1">
                  {eventLoyaltyPoints} points earned for this event ({event.guest_count} guests)
                </p>
              </div>
              {event.client_id && (
                <Link href={`/clients/${event.client_id}`}>
                  <Button variant="secondary" size="sm">
                    View Client Loyalty
                  </Button>
                </Link>
              )}
            </div>
          </Card>
        )}
      </EventDetailSection>

      {/* ============================================ */}
      {/* TAB: OPS — Staff, temps, docs, transitions   */}
      {/* ============================================ */}
      <EventDetailSection tab="ops" activeTab={activeTab}>
        {/* Time Tracking */}
        {canTrackTime && (
          <TimeTracking
            eventId={event.id}
            initialData={{
              time_shopping_minutes: (event as any).time_shopping_minutes ?? null,
              time_prep_minutes: (event as any).time_prep_minutes ?? null,
              time_travel_minutes: (event as any).time_travel_minutes ?? null,
              time_service_minutes: (event as any).time_service_minutes ?? null,
              time_reset_minutes: (event as any).time_reset_minutes ?? null,
              shopping_started_at: (event as any).shopping_started_at ?? null,
              shopping_completed_at: (event as any).shopping_completed_at ?? null,
              prep_started_at: (event as any).prep_started_at ?? null,
              prep_completed_at: (event as any).prep_completed_at ?? null,
              travel_started_at: (event as any).travel_started_at ?? null,
              travel_completed_at: (event as any).travel_completed_at ?? null,
              service_started_at: (event as any).service_started_at ?? null,
              service_completed_at: (event as any).service_completed_at ?? null,
              reset_started_at: (event as any).reset_started_at ?? null,
              reset_completed_at: (event as any).reset_completed_at ?? null,
            }}
            onSave={updateEventTimeAndCard}
            onStart={startEventActivity}
            onStop={stopEventActivity}
          />
        )}

        {/* Event Staff */}
        {!['draft', 'cancelled'].includes(event.status) && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Event Staff</h2>
            <EventStaffPanel
              eventId={event.id}
              roster={staffMembers as any}
              assignments={staffAssignments as any}
            />
          </Card>
        )}

        {/* AI Staff Briefing */}
        {!['draft', 'cancelled'].includes(event.status) && (
          <StaffBriefingAIPanel eventId={event.id} />
        )}

        {/* AI Prep Timeline */}
        {['confirmed', 'in_progress'].includes(event.status) && (
          <PrepTimelinePanel eventId={event.id} />
        )}

        {/* AI Service Timeline */}
        {['confirmed', 'in_progress'].includes(event.status) && (
          <ServiceTimelinePanel eventId={event.id} />
        )}

        {/* Chef Collaboration — shown to event owner on any non-cancelled event */}
        {event.status !== 'cancelled' && (
          <EventCollaboratorsPanel
            eventId={event.id}
            isOwner={isEventOwner}
            collaborators={eventCollaborators as any}
          />
        )}

        {/* Temperature Log — active and completed events */}
        {['in_progress', 'completed'].includes(event.status) && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Temperature Log</h2>
            <TempLogPanel eventId={event.id} initialLogs={tempLogs as any} />
          </Card>
        )}

        {/* AI Temperature Log Anomaly Detection */}
        {['in_progress', 'completed'].includes(event.status) && (
          <TempLogAnomalyPanel eventId={event.id} />
        )}

        {/* Shopping Substitutions — available for any non-draft event */}
        {!['draft', 'cancelled'].includes(event.status) && (
          <ShoppingSubstitutions eventId={event.id} initialItems={substitutionItems} />
        )}

        {/* Menu Modifications — for completed events */}
        {isCompletedOrBeyond && (
          <MenuModifications eventId={event.id} initialModifications={menuMods as any} />
        )}

        {/* Carry-Forward Inventory — leftovers from other events available for use here */}
        {event.status !== 'cancelled' && (
          <AvailableLeftovers eventId={event.id} items={carryForwardItems} />
        )}

        {/* AI Carry-Forward Ingredient Matching */}
        {event.status !== 'cancelled' && <CarryForwardMatchPanel eventId={event.id} />}

        {/* AI Grocery List Consolidation */}
        {eventMenus && event.status !== 'cancelled' && (
          <GroceryConsolidationPanel eventId={event.id} />
        )}

        {/* Unused Ingredients — for completed events */}
        {isCompletedOrBeyond && (
          <UnusedIngredients eventId={event.id} initialItems={unusedItems as any} />
        )}

        {/* Contingency Plans */}
        {event.status !== 'cancelled' && (
          <Card className="p-6">
            <ContingencyPanel
              eventId={event.id}
              initialNotes={contingencyNotes as any}
              emergencyContacts={emergencyContacts as any}
            />
          </Card>
        )}

        {/* AI Contingency Suggestions */}
        {event.status !== 'cancelled' && <ContingencyAIPanel eventId={event.id} />}

        {/* Printed Documents (8 Sheets) + Business Documents */}
        <DocumentSection eventId={event.id} readiness={docReadiness} businessDocs={businessDocs} />

        {/* Readiness Gate Panel — shown for events approaching their next transition */}
        {eventReadiness && eventReadiness.gates.length > 0 && (
          <ReadinessGatePanel
            eventId={event.id}
            readiness={eventReadiness}
            targetLabel={
              event.status === 'paid'
                ? 'Confirm Event'
                : event.status === 'confirmed'
                  ? 'Start Service'
                  : event.status === 'in_progress'
                    ? 'Complete Service'
                    : 'Next Step'
            }
          />
        )}

        {/* Event Transitions (Actions) */}
        <EventTransitions event={event} readiness={eventReadiness} />

        {/* Closure Status — for completed events */}
        {event.status === 'completed' && closureStatus && (
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Post-Event Closure</h2>
              {closureStatus.allComplete && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900 text-green-800">
                  All Complete
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.aarFiled ? 'bg-green-900 text-emerald-600' : 'bg-red-900 text-red-600'}`}
                >
                  {closureStatus.aarFiled ? '\u2713' : '\u2717'}
                </span>
                <span className="text-sm text-stone-300">AAR Filed</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.resetComplete ? 'bg-green-900 text-emerald-600' : 'bg-red-900 text-red-600'}`}
                >
                  {closureStatus.resetComplete ? '\u2713' : '\u2717'}
                </span>
                <span className="text-sm text-stone-300">Reset Complete</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.followUpSent ? 'bg-green-900 text-emerald-600' : 'bg-red-900 text-red-600'}`}
                >
                  {closureStatus.followUpSent ? '\u2713' : '\u2717'}
                </span>
                <span className="text-sm text-stone-300">Follow-Up Sent</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${closureStatus.financiallyClosed ? 'bg-green-900 text-emerald-600' : 'bg-red-900 text-red-600'}`}
                >
                  {closureStatus.financiallyClosed ? '\u2713' : '\u2717'}
                </span>
                <span className="text-sm text-stone-300">Financially Closed</span>
              </div>
            </div>

            {/* Action buttons for incomplete items */}
            <div className="flex flex-wrap gap-2">
              {!closureStatus.aarFiled && (
                <Link href={`/events/${event.id}/aar`}>
                  <Button size="sm">File Event Review</Button>
                </Link>
              )}
              <EventClosureActions
                eventId={event.id}
                resetComplete={closureStatus.resetComplete}
                followUpSent={closureStatus.followUpSent}
              />
              <Link href={`/events/${event.id}/financial`}>
                <Button size="sm" variant={closureStatus.financiallyClosed ? 'ghost' : 'secondary'}>
                  {closureStatus.financiallyClosed
                    ? 'View Financial Summary'
                    : 'Open Financial Summary'}
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* AAR Summary — if filed */}
        {aar && (
          <Card className="p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold">Event Review</h2>
              <div className="flex gap-2">
                <Link href={`/events/${event.id}/aar`}>
                  <Button variant="ghost" size="sm">
                    Edit Review
                  </Button>
                </Link>
              </div>
            </div>

            <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <div>
                <dt className="text-sm font-medium text-stone-500">Calm Rating</dt>
                <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                  {aar.calm_rating}/5
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-stone-500">Preparation Rating</dt>
                <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                  {aar.preparation_rating}/5
                </dd>
              </div>
              {aar.forgotten_items && aar.forgotten_items.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Forgotten Items</dt>
                  <dd className="mt-1">
                    <div className="flex flex-wrap gap-1">
                      {aar.forgotten_items.map((item: string) => (
                        <span
                          key={item}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900 text-red-800"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </dd>
                </div>
              )}
            </dl>

            {(aar.what_went_well || aar.what_went_wrong) && (
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-stone-800">
                {aar.what_went_well && (
                  <div>
                    <dt className="text-sm font-medium text-stone-500">What went well</dt>
                    <dd className="text-sm text-stone-100 mt-1 whitespace-pre-wrap">
                      {aar.what_went_well}
                    </dd>
                  </div>
                )}
                {aar.what_went_wrong && (
                  <div>
                    <dt className="text-sm font-medium text-stone-500">What went wrong</dt>
                    <dd className="text-sm text-stone-100 mt-1 whitespace-pre-wrap">
                      {aar.what_went_wrong}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </Card>
        )}

        {/* Dinner Photos — upload and manage dish photos after the event */}
        {isCompletedOrBeyond && (
          <EventPhotoGallery eventId={event.id} initialPhotos={eventPhotos} />
        )}

        {/* Recipe Capture — for completed/in_progress events with menus */}
        {isCompletedOrBeyond && eventMenus && (
          <RecipeCapturePrompt
            eventId={event.id}
            unrecordedComponents={unrecordedComponents}
            aiConfigured={aiConfigured}
          />
        )}
      </EventDetailSection>

      {/* ============================================ */}
      {/* TAB: WRAP-UP — Debrief, survey, history      */}
      {/* ============================================ */}
      <EventDetailSection tab="wrap" activeTab={activeTab}>
        {/* File AAR button — prominent, for completed events without AAR */}
        {event.status === 'completed' && !aar && !closureStatus && (
          <Card className="p-6 border-brand-700 bg-brand-950">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-semibold text-brand-200">Ready to review this dinner?</h2>
                <p className="text-sm text-brand-400 mt-1">
                  File your Event Review to track what went well and what to improve.
                </p>
              </div>
              <Link href={`/events/${event.id}/aar`}>
                <Button>File Event Review</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Post-Event Debrief CTA — capture what you learned while it's fresh */}
        {event.status === 'completed' && !(event as any).debrief_completed_at && (
          <Card className="p-6 border-amber-200 bg-amber-950">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-semibold text-amber-900">Capture what you learned tonight</h2>
                <p className="text-sm text-amber-700 mt-1">
                  Client insights, recipe notes, dish photos &#8212; while it&#39;s still fresh.
                </p>
              </div>
              <Link href={`/events/${event.id}/debrief`}>
                <Button>Start Debrief</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Debrief complete indicator */}
        {event.status === 'completed' && (event as any).debrief_completed_at && (
          <Card className="p-4 border-green-200 bg-green-950">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-medium">&#10003;</span>
                <span className="text-sm font-medium text-green-900">Debrief complete</span>
                <span className="text-xs text-emerald-600">
                  {format(new Date((event as any).debrief_completed_at), 'MMM d')}
                </span>
              </div>
              <Link href={`/events/${event.id}/debrief`}>
                <Button variant="ghost" size="sm">
                  View / Edit
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Client Satisfaction Survey */}
        {event.status === 'completed' && event.client_id && (
          <Card className="p-6 border-blue-200 bg-blue-950">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-semibold text-blue-900">Client Satisfaction Survey</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Send a post-event survey to collect NPS score, ratings, and a testimonial.
                </p>
              </div>
              <form
                action={async (_: FormData) => {
                  'use server'
                  await sendClientSurvey(event.id)
                }}
              >
                <Button variant="secondary" size="sm" type="submit">
                  Send Survey
                </Button>
              </form>
            </div>
          </Card>
        )}

        {/* AI AAR Generator — for completed events without a filed review */}
        {event.status === 'completed' && !aar && <AARGeneratorPanel eventId={event.id} />}

        {/* AI Review Request Drafter */}
        {event.status === 'completed' && <ReviewRequestPanel eventId={event.id} />}

        {/* AI Gratuity Framing */}
        {event.status === 'completed' && <GratuityPanel eventId={event.id} />}

        {/* AI Social Media Captions */}
        {event.status === 'completed' && <SocialCaptionsPanel eventId={event.id} />}

        {/* Transition History */}
        {transitions.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Status History</h2>
            <div className="space-y-3">
              {transitions.map((transition) => (
                <div key={transition.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-brand-9500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {transition.from_status && (
                        <>
                          <span className="text-sm font-medium text-stone-100 capitalize">
                            {transition.from_status}
                          </span>
                          <span className="text-stone-400">&rarr;</span>
                        </>
                      )}
                      <span className="text-sm font-medium text-stone-100 capitalize">
                        {transition.to_status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1">
                      {format(new Date(transition.transitioned_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                    {transition.metadata &&
                      typeof transition.metadata === 'object' &&
                      'reason' in (transition.metadata as Record<string, unknown>) && (
                        <p className="text-sm text-stone-400 mt-1">
                          Reason: {String((transition.metadata as Record<string, unknown>).reason)}
                        </p>
                      )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <EntityActivityTimeline entityType="event" entityId={event.id} entries={timelineEntries} />
      </EventDetailSection>
    </div>
  )
}
