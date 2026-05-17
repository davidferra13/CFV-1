// Server component: event header with badges, countdown, action buttons
import Link from 'next/link'
import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getEventGuests } from '@/lib/sharing/actions'
import { getEventCollaborators } from '@/lib/collaboration/actions'
import { getDocumentReadiness, type DocumentReadiness } from '@/lib/documents/actions'
import { evaluateReadinessForDocumentGeneration } from '@/lib/events/readiness'
import { calculateDietaryComplexity } from '@/lib/formulas/dietary-complexity'
import { calculateEventRisk } from '@/lib/formulas/event-risk-score'
import { createServerClient } from '@/lib/db/server'
import { format } from 'date-fns'
import { dateToDateString } from '@/lib/utils/format'
import { EventStatusBadge } from '@/components/events/event-status-badge'
import { ChefEventCountdown } from '@/components/events/chef-event-countdown'
import { DietaryComplexityBadge } from '@/components/events/dietary-complexity-badge'
import { EventRiskBadge } from '@/components/events/event-risk-badge'
import { AuditSummaryBadge } from '@/components/audit-trail/audit-summary-badge'
import { EventPacketDrawer } from '@/components/documents/event-packet-drawer'
import { QuickProposalButton } from '@/components/events/quick-proposal-button'
import { EventCloneButton } from '@/components/events/event-clone-button'
import { EventActionsOverflow } from '@/components/events/event-actions-overflow'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProgressPill } from '@/components/ui/progress-pill'
import { getCompletionForEntity } from '@/lib/completion/actions'

function isEventToday(eventDate: Date | string): boolean {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const evDate = new Date(dateToDateString(eventDate) + 'T00:00:00')
  return evDate >= today && evDate < tomorrow
}

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
    outstandingBalance: summary?.outstanding_balance_cents ?? 0,
  }
}

type Props = {
  eventId: string
  tenantId: string
  event: any
}

export async function EventHeaderSection({ eventId, tenantId, event }: Props) {
  const user = await requireChef()

  const [
    guestList,
    eventCollaborators,
    docReadiness,
    documentReadinessGate,
    eventMenus,
    { totalPaid, outstandingBalance },
    inquiryReferralSource,
    completion,
  ] = await Promise.all([
    getEventGuests(eventId).catch(() => []),
    getEventCollaborators(eventId).catch(() => []),
    getDocumentReadiness(eventId).catch(
      (): DocumentReadiness => ({
        eventSummary: { ready: false, missing: [] },
        groceryList: { ready: false, missing: [] },
        frontOfHouseMenu: { ready: false, missing: [] },
        prepSheet: { ready: false, missing: [] },
        executionSheet: { ready: false, missing: [] },
        checklist: { ready: false, missing: [] },
        packingList: { ready: false, missing: [] },
        resetChecklist: { ready: false, missing: [] },
        travelRoute: { ready: false, missing: [] },
        platingGuide: { ready: false, missing: [] },
        allergenReference: { ready: false, missing: [] },
        venueRecon: { ready: false, missing: [] },
        beverageNotes: { ready: false, missing: [] },
        clientContact: { ready: false, missing: [] },
        miseCheck: { ready: false, missing: [] },
      })
    ),
    evaluateReadinessForDocumentGeneration(eventId).catch(() => null),
    getEventMenusForCheck(eventId).catch(() => null),
    getEventFinancialSummary(eventId).catch(() => ({
      totalPaid: 0,
      outstandingBalance: 0,
    })),
    event.inquiry_id
      ? (async () => {
          try {
            const sb = createServerClient()
            const { data } = await sb
              .from('inquiries')
              .select('referral_source')
              .eq('id', event.inquiry_id!)
              .eq('tenant_id', tenantId)
              .maybeSingle()
            const referralSource = (data?.referral_source as string | null | undefined)?.trim()
            return referralSource || null
          } catch {
            return null
          }
        })()
      : Promise.resolve(null),
    getCompletionForEntity('event', eventId).catch(() => null),
  ])

  // Supplier calling feature flag
  const supplierCallingEnabled = await (async () => {
    try {
      const flagDb: any = createServerClient()
      const { data: flagRow } = await flagDb
        .from('chef_feature_flags')
        .select('enabled')
        .eq('chef_id', user.tenantId!)
        .eq('flag_name', 'supplier_calling')
        .maybeSingle()
      return flagRow?.enabled === true
    } catch {
      return false
    }
  })()

  // Dietary complexity
  const guestProfiles = (guestList as any[]).map((g: any) => ({
    dietaryRestrictions: g.dietary_restrictions ?? [],
    allergies: g.allergies ?? [],
  }))
  const dietaryComplexity = calculateDietaryComplexity({
    guests: guestProfiles,
    totalGuestCount: event.guest_count || 1,
  })

  // Event risk
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
    hasSignedContract: false,
    isRepeatClient: false,
    serviceStyle: (event as any).service_style ?? undefined,
    quotedPriceCents: (event as any).quoted_price_cents ?? null,
    outstandingBalanceCents: outstandingBalance,
    travelDistanceMiles: null,
    guestCountConfirmed: (event as any).guest_count_confirmed ?? undefined,
    occasion: event.occasion ?? null,
  })

  const referralSourceLabel = inquiryReferralSource?.replace(/_/g, ' ') ?? null

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">
            {event.occasion || 'Untitled Event'}
          </h1>
          <EventStatusBadge status={event.status} />
          {referralSourceLabel && <Badge variant="info">Referral: {referralSourceLabel}</Badge>}
          <DietaryComplexityBadge result={dietaryComplexity} />
          <EventRiskBadge result={eventRisk} />
          {completion && (
            <ProgressPill
              current={completion.requirements.filter((r) => r.met).length}
              total={completion.requirements.length}
              label="complete"
            />
          )}
        </div>
        <div className="mt-1">
          <Suspense fallback={null}>
            <AuditSummaryBadge entityType="event" entityId={event.id} />
          </Suspense>
        </div>
        <p className="text-stone-300 mt-1">
          {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
          {(event as any).serve_time ? (
            <> at {(event as any).serve_time}</>
          ) : (
            <span className="ml-1 text-amber-400 font-medium text-sm">(time TBD)</span>
          )}
          {(event as any).event_timezone && (
            <span className="ml-2 text-xs text-stone-300 font-normal">
              {(event as any).event_timezone.replace('America/', '').replace('_', ' ')}
            </span>
          )}
        </p>
        <ChefEventCountdown
          eventDate={dateToDateString(event.event_date)}
          serveTime={(event as any).serve_time}
          status={event.status}
        />
        {(() => {
          const acceptedCollabs = (eventCollaborators as any[]).filter(
            (c: any) => c.status === 'accepted' && c.chef
          )
          if (acceptedCollabs.length === 0) return null
          const names = acceptedCollabs
            .map((c: any) => c.chef?.display_name || c.chef?.business_name || 'Co-host')
            .join(', ')
          return <p className="text-stone-400 text-sm mt-0.5">Co-hosting with {names}</p>
        })()}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {event.status === 'draft' && (
          <Link href={`/events/${event.id}/edit`}>
            <Button variant="secondary">Edit Event</Button>
          </Link>
        )}
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
        <Link href={`/events/${event.id}/god-mode`}>
          <Button variant="secondary">GOD MODE</Button>
        </Link>
        {event.status !== 'cancelled' && (
          <EventPacketDrawer
            eventId={event.id}
            readiness={docReadiness}
            readinessGate={documentReadinessGate}
          />
        )}
        {event.client_id && !['cancelled'].includes(event.status) && (
          <QuickProposalButton eventId={event.id} />
        )}
        {event.status !== 'cancelled' && (
          <EventCloneButton
            sourceEventId={event.id}
            sourceEventName={event.occasion || 'Untitled Event'}
          />
        )}
        {supplierCallingEnabled && event.status !== 'cancelled' && (
          <Link href={`/culinary/sourcing?eventId=${event.id}`}>
            <Button variant="secondary">Source Ingredients</Button>
          </Link>
        )}
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
  )
}
