// Server component: operating spine, dinner circles, collaboration banner, critical path
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getAARByEventId } from '@/lib/aar/actions'
import { getEventShares, getEventGuests, getEventRSVPSummary } from '@/lib/sharing/actions'
import { getEventCollaborators } from '@/lib/collaboration/actions'
import { getEventTicketTypes, getEventTickets, getEventTicketSummary } from '@/lib/tickets/actions'
import { getOrCreateChefCircleTokenForEvent } from '@/lib/hub/chef-circle-actions'
import { getPackingConfirmationCount } from '@/lib/packing/actions'
import { getEventGearStatus } from '@/lib/gear/actions'
import { getEventPrepBlocks } from '@/lib/scheduling/prep-block-actions'
import { getParAlerts } from '@/lib/inventory/count-actions'
import { getEventPhotosForChef } from '@/lib/events/photo-actions'
import { getMessageThread } from '@/lib/messages/actions'
import { getEventPrepTimeline } from '@/lib/prep-timeline/actions'
import { getLifecycleProgress } from '@/lib/lifecycle/actions'
import { getCriticalPath } from '@/lib/lifecycle/critical-path'
import { getEventPricingIntelligence } from '@/lib/finance/event-pricing-intelligence-actions'
import { getApprovalGates } from '@/lib/dinner-circles/corporate-actions'
import {
  buildDinnerCircleSnapshot,
  getDinnerCircleConfig,
  normalizeDinnerCircleConfig,
} from '@/lib/dinner-circles/event-circle'
import { getEventDefaultFlowSnapshotForTenant } from '@/lib/events/default-event-flow-data'
import { buildChefEventOperatingSpine } from '@/lib/events/operating-spine'
import { loadEventServiceSimulationPanelState } from '@/lib/service-simulation/state'
import { getCompletionForEntity } from '@/lib/completion/actions'
import { createServerClient } from '@/lib/db/server'
import { dateToDateString } from '@/lib/utils/format'
import { formatCurrency } from '@/lib/utils/currency'
import { getMarketplaceConversionData } from '@/lib/marketplace/conversion-actions'
import { EventOperatingSpineCard } from '@/components/events/event-operating-spine-card'
import { EventDefaultFlowPanel } from '@/components/events/event-default-flow-panel'
import { DinnerCircleCommandCenter } from '@/components/events/dinner-circle-command-center'
import { ServiceSimulationRollupCard } from '@/components/events/service-simulation-rollup-card'
import { CriticalPathCard } from '@/components/lifecycle/critical-path-card'
import { MarketplaceConvertBanner } from '@/components/events/marketplace-convert-banner'
import { QuickDebriefPrompt } from '@/components/events/quick-debrief-prompt'
import { Button } from '@/components/ui/button'

async function getEventMenusForCheck(eventId: string): Promise<string[] | null> {
  const db: any = createServerClient()
  const { data: menus } = await db.from('menus').select('id, name').eq('event_id', eventId)
  if (!menus || menus.length === 0) return null
  return menus.map((m: any) => m.id)
}

async function getEventFinancialSummary(eventId: string) {
  const db: any = createServerClient()
  const { data: summary } = await db
    .from('event_financial_summary')
    .select('*')
    .eq('event_id', eventId)
    .single()
  return {
    totalPaid: summary?.total_paid_cents ?? 0,
    totalRefunded: summary?.total_refunded_cents ?? 0,
    outstandingBalance: summary?.outstanding_balance_cents ?? 0,
    financialAvailable: Boolean(summary),
  }
}

async function getMenuCostSummary(eventId: string) {
  const db: any = createServerClient()
  const { data } = await db
    .from('menu_cost_summary')
    .select('total_recipe_cost_cents')
    .eq('event_id', eventId)
    .single()
  return data?.total_recipe_cost_cents ?? null
}

type Props = {
  eventId: string
  tenantId: string
  event: any
}

export async function EventSpineSection({ eventId, tenantId, event }: Props) {
  const user = await requireChef()
  const isCompletedOrBeyond = ['completed', 'in_progress'].includes(event.status)
  const isEventOwner = (event as any).tenant_id === user.entityId

  const [
    { totalPaid, totalRefunded, outstandingBalance, financialAvailable },
    guestList,
    rsvpSummary,
    guestShares,
    eventMenus,
    messages,
    prepBlocks,
    parAlerts,
    packingConfirmedCount,
    gearStatus,
    aar,
    hubGroupToken,
    ticketTypes,
    ticketList,
    ticketSummary,
    eventCollaborators,
    eventPhotos,
    dinnerCircleConfig,
    approvalGates,
    serviceSimulationState,
    pricingIntelligence,
    lifecycleProgress,
    criticalPath,
    completionResult,
    marketplaceConversion,
    menuCostCents,
  ] = await Promise.all([
    getEventFinancialSummary(eventId).catch(() => ({
      totalPaid: 0,
      totalRefunded: 0,
      outstandingBalance: 0,
      financialAvailable: false,
    })),
    getEventGuests(eventId).catch(() => []),
    getEventRSVPSummary(eventId).catch(() => ({
      attending: 0,
      maybe: 0,
      declined: 0,
      pending: 0,
    })),
    getEventShares(eventId).catch(() => []),
    getEventMenusForCheck(eventId).catch(() => null),
    getMessageThread('event', eventId, {
      includeInquiryMessages: !!event.inquiry_id,
      inquiryId: event.inquiry_id ?? undefined,
    }).catch(() => []),
    event.status !== 'cancelled'
      ? getEventPrepBlocks(eventId).catch(() => [])
      : Promise.resolve([]),
    ['confirmed', 'in_progress'].includes(event.status)
      ? getParAlerts().catch(() => [])
      : Promise.resolve([]),
    ['confirmed', 'in_progress'].includes(event.status)
      ? getPackingConfirmationCount(eventId).catch(() => 0)
      : Promise.resolve(0),
    ['confirmed', 'in_progress'].includes(event.status)
      ? getEventGearStatus(eventId).catch(() => ({
          gearChecked: false,
          gearCheckedAt: null,
          confirmedCount: 0,
        }))
      : Promise.resolve({ gearChecked: false, gearCheckedAt: null, confirmedCount: 0 }),
    isCompletedOrBeyond ? getAARByEventId(eventId) : Promise.resolve(null),
    getOrCreateChefCircleTokenForEvent(eventId).catch(() => null),
    getEventTicketTypes(eventId).catch(() => []),
    getEventTickets(eventId).catch(() => []),
    getEventTicketSummary(eventId).catch(() => null),
    getEventCollaborators(eventId).catch(() => []),
    isCompletedOrBeyond ? getEventPhotosForChef(eventId) : Promise.resolve([]),
    getDinnerCircleConfig(eventId).catch(() => null),
    getApprovalGates(eventId).catch(() => []),
    loadEventServiceSimulationPanelState(eventId).catch(() => null),
    getEventPricingIntelligence(eventId).catch(() => null),
    getLifecycleProgress(event.inquiry_id ?? undefined, eventId).catch(() => null),
    getCriticalPath({ inquiryId: event.inquiry_id ?? undefined, eventId }).catch(() => null),
    getCompletionForEntity('event', eventId).catch(() => null),
    event.status === 'completed'
      ? getMarketplaceConversionData(eventId).catch(() => null)
      : Promise.resolve(null),
    getMenuCostSummary(eventId).catch(() => null),
  ])

  // Prep timeline readiness
  const { timeline: prepTimeline } = await getEventPrepTimeline(eventId).catch(() => ({
    timeline: null,
  }))
  const prepTimelineReady = Boolean(
    prepTimeline &&
    (((prepTimeline as any).days ?? []).some((day: any) => (day.items ?? []).length > 0) ||
      ((prepTimeline as any).untimedItems ?? []).length > 0)
  )

  // Share URL
  const activeShare = (guestShares as any[]).find((s) => s.is_active) || null
  const fullShareUrl = activeShare
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/share/${activeShare.token}`
    : null

  // Public ticket share URL
  const publicTicketShareUrl = await (async () => {
    try {
      const db: any = createServerClient()
      const { data } = await db
        .from('event_share_settings')
        .select('share_token')
        .eq('event_id', eventId)
        .maybeSingle()
      if (data?.share_token) {
        return `${process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'}/e/${data.share_token}`
      }
      return null
    } catch {
      return null
    }
  })()

  // Default flow snapshot
  const defaultFlowSnapshot = await getEventDefaultFlowSnapshotForTenant(eventId, tenantId, {
    pricing: pricingIntelligence,
  }).catch(() => null)

  // Operating spine
  const operatingSpine = buildChefEventOperatingSpine({
    event,
    eventMenus: eventMenus as any,
    guestList: guestList as any[],
    rsvpSummary: rsvpSummary as any,
    totalPaidCents: totalPaid,
    totalRefundedCents: totalRefunded,
    outstandingBalanceCents: outstandingBalance,
    financialAvailable,
    messagesCount: messages.length,
    hasActiveShare: Boolean(activeShare),
    prepTimelineReady,
    prepBlocksCount: (prepBlocks as any[]).length,
    parAlertCount: (parAlerts as any[]).length,
    packingConfirmedCount,
    gearStatus,
    hasAAR: Boolean(aar),
  })

  // Dinner circle snapshot
  const dinnerCircleSnapshot = buildDinnerCircleSnapshot({
    event,
    config: dinnerCircleConfig ?? normalizeDinnerCircleConfig(null),
    ticketTypes: ticketTypes as any[],
    tickets: ticketList as any[],
    ticketSummary,
    collaborators: eventCollaborators as any[],
    eventMenus: eventMenus as any,
    eventPhotos: eventPhotos as any[],
    shareUrl: publicTicketShareUrl ?? fullShareUrl,
    hubGroupToken: hubGroupToken as string | null,
    prepTimelineReady,
    locationReady: Boolean(event.location_address || (event as any).location),
    totalPaidCents: totalPaid,
    outstandingBalanceCents: outstandingBalance,
    menuCostCents,
  })

  // Collaborator role banner
  const myCollaboratorRow = !isEventOwner
    ? (eventCollaborators as any[]).find(
        (c: any) => c.chef_id === user.entityId && c.status === 'accepted'
      )
    : null

  const COLLAB_ROLE_LABELS: Record<string, string> = {
    primary: 'Primary Chef',
    co_host: 'Co-Host',
    sous_chef: 'Sous Chef',
    observer: 'Observer',
  }

  const completionScore = completionResult?.score ?? null

  return (
    <>
      {event.status !== 'cancelled' && serviceSimulationState ? (
        <ServiceSimulationRollupCard
          eventId={eventId}
          panelState={serviceSimulationState}
          compact
          returnToHref={`/events/${eventId}?tab=ops#service-simulation`}
          description="Day-of snapshot from live event truth. Keep the full walkthrough in Ops, but keep this signal visible above the fold."
        />
      ) : null}

      {criticalPath && (
        <CriticalPathCard
          criticalPath={criticalPath}
          circleToken={hubGroupToken as string | null}
        />
      )}

      <EventOperatingSpineCard
        spine={operatingSpine}
        audience="chef"
        title="Event operating spine"
        description="One event view connects booking status, client readiness, menu, prep, stock, finance, communication, and follow-up."
      />

      <EventDefaultFlowPanel eventId={eventId} snapshot={defaultFlowSnapshot} />

      <DinnerCircleCommandCenter
        snapshot={dinnerCircleSnapshot}
        collaborators={eventCollaborators as any[]}
        ticketHolders={ticketList as any[]}
        approvalGates={approvalGates}
      />

      {/* Collaborator role banner */}
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

      {/* Deposit Shortfall Banner */}
      {['accepted', 'paid'].includes(event.status) &&
        (event as any).deposit_amount_cents > 0 &&
        totalPaid < (event as any).deposit_amount_cents && (
          <div className="rounded-lg border border-amber-300 bg-amber-950 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              Awaiting {formatCurrency((event as any).deposit_amount_cents - totalPaid)} deposit
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              {formatCurrency((event as any).deposit_amount_cents)} required,{' '}
              {formatCurrency(totalPaid)} collected. Record payment below to proceed to
              confirmation.
            </p>
          </div>
        )}

      {/* Marketplace Convert Banner */}
      {marketplaceConversion?.isMarketplace && marketplaceConversion.directBookingUrl && (
        <MarketplaceConvertBanner
          clientName={marketplaceConversion.clientName}
          directBookingUrl={marketplaceConversion.directBookingUrl}
          eventId={eventId}
          platformLabel={marketplaceConversion.platformLabel!}
        />
      )}

      {/* Quick Debrief */}
      {event.status === 'completed' && (
        <QuickDebriefPrompt
          eventId={eventId}
          hasAAR={!!aar}
          completedAt={(event as any).service_completed_at ?? event.updated_at}
        />
      )}
    </>
  )
}
