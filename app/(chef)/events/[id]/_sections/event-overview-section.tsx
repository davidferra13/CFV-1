// Server component: fetches overview-tab data for a single event
import { requireChef } from '@/lib/auth/get-user'
import { getEventById } from '@/lib/events/actions'
import { getEventDOPProgress } from '@/lib/scheduling/actions'
import { getEventLoyaltyImpactByTenant, getLoyaltyTransactions } from '@/lib/loyalty/actions'
import { getMessageThread, getResponseTemplates } from '@/lib/messages/actions'
import { getEventShares, getEventGuests, getEventRSVPSummary } from '@/lib/sharing/actions'
import {
  getOrCreateChefCircleTokenForEvent,
  getOrCreateChefHubProfileToken,
} from '@/lib/hub/chef-circle-actions'
import { getPackingConfirmationCount } from '@/lib/packing/actions'
import { getEventGuestLeadCount } from '@/lib/guests/lead-actions'
import { getEventMessagesForChef } from '@/lib/guests/message-actions'
import { getEventCollaborators } from '@/lib/collaboration/actions'
import { getMenuLibraryForEvent } from '@/lib/menus/showcase-actions'
import { getEventConstraintRadar } from '@/lib/events/constraint-radar-actions'
import { getEventRiskAssessment } from '@/lib/events/event-risk-assessment'
import { getChefPreferences } from '@/lib/chef/actions'
import { geocode, getDirections } from '@/lib/maps/mapbox'
import { shortenUrl } from '@/lib/links/url-shortener'
import { createServerClient } from '@/lib/db/server'
import { getGuestDietarySummaryForEvent } from '@/lib/dinner-circles/guest-dietary-summary'
import { EventDetailOverviewTab } from '../_components/event-detail-overview-tab'

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
    return { distanceMiles: directions.distanceMiles, durationMinutes: directions.durationMinutes }
  } catch {
    return null
  }
}

async function getEventMenusForCheck(eventId: string): Promise<string[] | null> {
  const db: any = createServerClient()
  const { data: menus } = await db.from('menus').select('id, name').eq('event_id', eventId)
  if (!menus || menus.length === 0) return null
  return menus.map((m: any) => m.id)
}

type Props = {
  eventId: string
  tenantId: string
  event: any
  activeTab: string
}

export async function EventOverviewSection({ eventId, tenantId, event, activeTab }: Props) {
  const user = await requireChef()

  const [
    dopProgress,
    messages,
    templates,
    guestShares,
    guestList,
    rsvpSummary,
    hubGroupToken,
    hubProfileToken,
    packingConfirmedCount,
    guestLeadCount,
    guestWallMessages,
    eventCollaborators,
    menuLibraryData,
    eventMenus,
    constraintRadarData,
    operationalRiskResult,
    dietarySummaryData,
  ] = await Promise.all([
    getEventDOPProgress(eventId).catch(() => null),
    getMessageThread('event', eventId, {
      includeInquiryMessages: !!event.inquiry_id,
      inquiryId: event.inquiry_id ?? undefined,
    }).catch(() => []),
    getResponseTemplates().catch(() => []),
    getEventShares(eventId).catch(() => []),
    getEventGuests(eventId).catch(() => []),
    getEventRSVPSummary(eventId).catch(() => ({
      attending: 0,
      maybe: 0,
      declined: 0,
      pending: 0,
    })),
    getOrCreateChefCircleTokenForEvent(eventId).catch(() => null),
    getOrCreateChefHubProfileToken().catch(() => null),
    ['confirmed', 'in_progress'].includes(event.status)
      ? getPackingConfirmationCount(eventId).catch(() => 0)
      : Promise.resolve(0),
    getEventGuestLeadCount(eventId).catch(() => 0),
    getEventMessagesForChef(eventId).catch(() => []),
    getEventCollaborators(eventId).catch(() => []),
    event.status !== 'cancelled'
      ? getMenuLibraryForEvent(eventId).catch(() => ({ menus: [], preferences: null }))
      : Promise.resolve({ menus: [], preferences: null }),
    getEventMenusForCheck(eventId).catch(() => [] as string[]),
    getEventConstraintRadar(eventId).catch(() => null),
    getEventRiskAssessment(eventId).catch(() => ({ data: null, error: null })),
    getGuestDietarySummaryForEvent(eventId, tenantId).catch(() => null),
  ])

  // Loyalty data
  const [eventLoyaltyTxs, eventLoyaltyImpact] = await Promise.all([
    event.status === 'completed' && event.client_id
      ? getLoyaltyTransactions(event.client_id)
          .then((txs) => txs.filter((tx) => tx.event_id === eventId))
          .catch(() => [])
      : Promise.resolve([]),
    event.client_id
      ? getEventLoyaltyImpactByTenant({
          tenantId,
          clientId: event.client_id,
          guestCount: event.guest_count || 0,
          eventTotalCents:
            (event as any).total_price_cents ?? (event as any).quoted_price_cents ?? 0,
        }).catch(() => null)
      : Promise.resolve(null),
  ])
  const eventLoyaltyPoints = (eventLoyaltyTxs as { points: number }[]).reduce(
    (sum, tx) => sum + tx.points,
    0
  )

  // Travel info
  const travelInfo =
    (event as any).location_lat && (event as any).location_lng
      ? await getChefToVenueTravel((event as any).location_lat, (event as any).location_lng)
      : null

  // Share URL
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
      // Non-blocking
    }
  }

  // Chat conversation
  const chatConversationId = await (async () => {
    try {
      const sb = createServerClient()
      const { data } = await sb
        .from('conversations')
        .select('id')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle()
      return (data?.id as string) || null
    } catch {
      return null
    }
  })()

  // Chef display name
  const chefDisplayName = await (async () => {
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
  })()

  // Client phone numbers
  const clientPhoneNumbers = event.client_id
    ? await (async () => {
        try {
          const { db: drizzleDb } = await import('@/lib/db')
          const { phoneNumbers: phoneNumbersTable } = await import('@/lib/db/schema/schema')
          const { and: andOp, eq: eqOp } = await import('drizzle-orm')
          const rows = await drizzleDb
            .select({
              id: phoneNumbersTable.id,
              phoneE164: phoneNumbersTable.phoneE164,
              phoneDisplay: phoneNumbersTable.phoneDisplay,
              label: phoneNumbersTable.label,
              type: phoneNumbersTable.type,
              canText: phoneNumbersTable.canText,
              verified: phoneNumbersTable.verified,
            })
            .from(phoneNumbersTable)
            .where(
              andOp(
                eqOp(phoneNumbersTable.entityType, 'client'),
                eqOp(phoneNumbersTable.entityId, event.client_id)
              )
            )
          return rows
        } catch {
          return []
        }
      })()
    : []

  const eventMenuData = (menuLibraryData?.menus ?? []).filter((m: any) =>
    eventMenus?.includes(m.id)
  )

  // Dietary nudge
  const dietaryNudgeData = dietarySummaryData
    ? {
        responded: dietarySummaryData.responded,
        total: dietarySummaryData.total,
        summary: dietarySummaryData.summary,
        guests: dietarySummaryData.guests,
        shareUrl: shortShareUrl,
      }
    : null

  return (
    <EventDetailOverviewTab
      activeTab={activeTab as any}
      event={event}
      dopProgress={dopProgress}
      packingConfirmedCount={packingConfirmedCount}
      travelInfo={travelInfo}
      eventLoyaltyImpact={eventLoyaltyImpact}
      eventLoyaltyPoints={eventLoyaltyPoints}
      activeShare={activeShare}
      shortShareUrl={shortShareUrl}
      fullShareUrl={fullShareUrl}
      eventMenus={eventMenus as any}
      hubGroupToken={hubGroupToken as string | null}
      hubProfileToken={hubProfileToken as string | null}
      guestList={guestList as any[]}
      rsvpSummary={rsvpSummary as any}
      chefDisplayName={chefDisplayName}
      guestLeadCount={guestLeadCount as number}
      guestWallMessages={guestWallMessages as any[]}
      messages={messages}
      templates={templates}
      chatConversationId={chatConversationId}
      collaborators={eventCollaborators as any[]}
      eventMenuData={eventMenuData}
      constraintRadarData={constraintRadarData}
      operationalRisk={(operationalRiskResult as any)?.data ?? null}
      clientPhones={clientPhoneNumbers as any[]}
      dietaryNudge={dietaryNudgeData}
    />
  )
}
