// Inquiry Detail Page
// Shows everything about a single inquiry and allows the chef to work it through the pipeline

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getInquiryById } from '@/lib/inquiries/actions'
import {
  getInquiryNotes,
  getLinkedRecipes,
  getRecipesForLinker,
} from '@/lib/inquiries/note-actions'
import { getQuotesForInquiry } from '@/lib/quotes/actions'
import { buildQuoteDraftHref } from '@/lib/quotes/quote-prefill'
import { getMessageThread, getResponseTemplates } from '@/lib/messages/actions'
import {
  InquiryStatusBadge,
  InquiryChannelBadge,
} from '@/components/inquiries/inquiry-status-badge'
import { InquiryTransitions } from '@/components/inquiries/inquiry-transitions'
import { InquiryDeadlineForm } from '@/components/inquiries/inquiry-deadline-form'
import { InquiryResponseComposer } from '@/components/inquiries/inquiry-response-composer'
import { PlatformResponseDrafter } from '@/components/marketplace/platform-response-drafter'
import { InquiryNotes } from '@/components/inquiries/inquiry-notes'
import { InquiryRecipeLinker } from '@/components/inquiries/inquiry-recipe-linker'
import { QuoteStatusBadge, PricingModelBadge } from '@/components/quotes/quote-status-badge'
import { MessageThread } from '@/components/messages/message-thread'
import { MessageLogForm } from '@/components/messages/message-log-form'
import { getGoogleConnection } from '@/lib/google/auth'
import { getLinkedContactSubmission } from '@/lib/contact/claim'
import { getEventPhotosForChef } from '@/lib/events/photo-actions'
import { EventPhotoGallery } from '@/components/events/event-photo-gallery'
import { getDocumentReadiness } from '@/lib/documents/actions'
import { DocumentSection } from '@/components/documents/document-section'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format, formatDistanceToNow } from 'date-fns'
import { getClientTimeline } from '@/lib/activity/actions'
import { computeEngagementScore } from '@/lib/activity/engagement'
import { EngagementBadge } from '@/components/activity/engagement-badge'
import { InquirySummary, type InquirySummaryData } from '@/components/inquiries/inquiry-summary'
import { InquiryAddClientButton } from '@/components/inquiries/inquiry-add-client-button'
import { getBookingScoreForInquiry } from '@/lib/analytics/booking-score'
import { BookingScoreBadge } from '@/components/analytics/booking-score-badge'
import { LeadScoreBadge } from '@/components/inquiries/lead-score-badge'
import { scoreInquiryFields, type LeadScoreData } from '@/lib/gmail/extract-inquiry-fields'
import { TacStatusPrompt } from '@/components/inquiries/tac-status-prompt'
import { TacAddressLead } from '@/components/inquiries/tac-address-lead'
import { TacTranscriptPrompt } from '@/components/inquiries/tac-transcript-prompt'
import { TacMenuNudge } from '@/components/inquiries/tac-menu-nudge'
import { LikelihoodToggle } from '@/components/inquiries/likelihood-toggle'
import { TacWorkflowGuide } from '@/components/inquiries/tac-workflow-guide'
import { LeadScoreFactors } from '@/components/inquiries/lead-score-factors'
import {
  MarketplaceActionPanel,
  MarketplaceFallbackBanner,
} from '@/components/marketplace/marketplace-action-panel'
import { MarketplaceSnapshotCard } from '@/components/marketplace/marketplace-snapshot-card'
import {
  getPlatformRecordByInquiry,
  getPlatformSnapshots,
  getPlatformPayout,
} from '@/lib/marketplace/platform-record-readers'
import { EntityActivityTimeline } from '@/components/activity/entity-activity-timeline'
import { getEntityActivityTimeline } from '@/lib/activity/entity-timeline'
import { ScheduleRequestSchema, summarizeScheduleRequest } from '@/lib/booking/schedule-schema'
import { Suspense } from 'react'
import { InquiryIntelligencePanel } from '@/components/intelligence/inquiry-intelligence-panel'
import { ContextInspector } from '@/components/inspector/context-inspector'
import { getInquiryCircleToken } from '@/lib/hub/inquiry-circle-actions'
import { SoftCloseLeverageCard } from '@/components/inquiries/soft-close-leverage-card'
import { getCriticalPath } from '@/lib/lifecycle/critical-path'
import { CriticalPathCard } from '@/components/lifecycle/critical-path-card'
import { getEmailSnapshot } from '@/lib/lifecycle/email-snapshot'
import { getLifecycleProgress } from '@/lib/lifecycle/actions'
import { LifecycleProgressPanel } from '@/components/lifecycle/lifecycle-progress-panel'
import { getNextActions } from '@/lib/lifecycle/next-action'
import { NextActionBanner } from '@/components/lifecycle/next-action-banner'
import { RepeatClientPanel } from '@/components/clients/repeat-client-panel'
import { getHandoffForInquiry } from '@/lib/network/collab-actions'
import {
  readPublicSeasonalMarketPulseIntentFromUnknownFields,
  type PublicSeasonalMarketPulseIntent,
} from '@/lib/public/public-seasonal-market-pulse'

function getDisplayName(inquiry: {
  client: { id: string; full_name: string; email: string; phone: string | null } | null
  unknown_fields: unknown
}): string {
  if (inquiry.client?.full_name) return inquiry.client.full_name
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_name as string) || 'Unknown Lead'
}

function getDisplayEmail(inquiry: {
  client: { email: string } | null
  unknown_fields: unknown
}): string | null {
  if (inquiry.client?.email) return inquiry.client.email
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_email as string) || null
}

function getDisplayPhone(inquiry: {
  client: { phone: string | null } | null
  unknown_fields: unknown
}): string | null {
  if (inquiry.client?.phone) return inquiry.client.phone
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.client_phone as string) || null
}

function getReferralSource(inquiry: { unknown_fields: unknown }): string | null {
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  return (unknown?.referral_source as string) || null
}

function getTakeAChefPageCapture(inquiry: { unknown_fields: unknown }) {
  const unknown = inquiry.unknown_fields as Record<string, unknown> | null
  const capture =
    unknown?.take_a_chef_page_capture &&
    typeof unknown.take_a_chef_page_capture === 'object' &&
    !Array.isArray(unknown.take_a_chef_page_capture)
      ? (unknown.take_a_chef_page_capture as Record<string, unknown>)
      : null
  const workflow =
    unknown?.take_a_chef_workflow &&
    typeof unknown.take_a_chef_workflow === 'object' &&
    !Array.isArray(unknown.take_a_chef_workflow)
      ? (unknown.take_a_chef_workflow as Record<string, unknown>)
      : null

  if (!capture) return null

  return {
    captureType:
      typeof capture.capture_type === 'string' ? (capture.capture_type as string) : 'other',
    capturedAt:
      typeof capture.last_captured_at === 'string' ? (capture.last_captured_at as string) : null,
    pageUrl: typeof capture.page_url === 'string' ? (capture.page_url as string) : null,
    pageTitle: typeof capture.page_title === 'string' ? (capture.page_title as string) : null,
    summary: typeof capture.summary === 'string' ? (capture.summary as string) : null,
    notes: typeof capture.notes === 'string' ? (capture.notes as string) : null,
    extractedEmail:
      typeof capture.extracted_email === 'string' ? (capture.extracted_email as string) : null,
    extractedPhone:
      typeof capture.extracted_phone === 'string' ? (capture.extracted_phone as string) : null,
    extractedBookingDate:
      typeof capture.extracted_booking_date === 'string'
        ? (capture.extracted_booking_date as string)
        : null,
    extractedLocation:
      typeof capture.extracted_location === 'string'
        ? (capture.extracted_location as string)
        : null,
    proposalCapturedAt:
      typeof workflow?.proposal_captured_at === 'string'
        ? (workflow.proposal_captured_at as string)
        : null,
    proposalAmountCents:
      typeof workflow?.proposal_amount_cents === 'number'
        ? (workflow.proposal_amount_cents as number)
        : null,
    menuCapturedAt:
      typeof workflow?.menu_captured_at === 'string' ? (workflow.menu_captured_at as string) : null,
    menuSeen: workflow?.menu_seen === true,
  }
}

function formatSeasonalScopeLabel(intent: PublicSeasonalMarketPulseIntent): string {
  return intent.scope.isFallback ? `${intent.scope.label} fallback` : intent.scope.label
}

function getSeasonalIntentEvidenceLabel(intent: PublicSeasonalMarketPulseIntent): string {
  if (intent.sourceMode === 'market-backed') {
    return 'Market-backed'
  }

  if (intent.provenance.fallbackReason === 'stale_market_evidence') {
    return 'Calendar fallback, stale market evidence withheld'
  }

  return 'Calendar fallback, market evidence unavailable'
}

function getSeasonalIntentFreshnessLabel(intent: PublicSeasonalMarketPulseIntent): string {
  if (intent.provenance.marketAsOf) {
    const asOf = format(new Date(intent.provenance.marketAsOf), 'MMM d, yyyy')

    if (intent.provenance.marketStatus === 'fresh') {
      return `Fresh public snapshots as of ${asOf}`
    }

    if (intent.provenance.marketStatus === 'stale') {
      return `Stale public snapshots from ${asOf}`
    }

    return `Point-in-time public snapshots from ${asOf}`
  }

  if (intent.provenance.fallbackReason === 'stale_market_evidence') {
    return 'Available public snapshots were older than 72 hours'
  }

  if (intent.provenance.fallbackReason === 'market_data_unavailable') {
    return 'No public snapshots were available'
  }

  return 'No public snapshot timestamp stored'
}

export default async function InquiryDetailPage({ params }: { params: { id: string } }) {
  await requireChef()

  const [
    inquiry,
    quotes,
    messages,
    templates,
    gmailStatus,
    linkedSubmission,
    inquiryNotes,
    recipeLinks,
    availableRecipes,
    bookingScore,
    timelineEntries,
    circleToken,
    criticalPath,
    snapshotData,
    lifecycleProgress,
    nextActions,
    handoffInfo,
  ] = await Promise.all([
    getInquiryById(params.id),
    getQuotesForInquiry(params.id),
    getMessageThread('inquiry', params.id),
    getResponseTemplates(),
    getGoogleConnection(),
    getLinkedContactSubmission(params.id),
    getInquiryNotes(params.id),
    getLinkedRecipes(params.id),
    getRecipesForLinker(),
    getBookingScoreForInquiry(params.id).catch(() => null),
    getEntityActivityTimeline('inquiry', params.id),
    getInquiryCircleToken(params.id).catch(() => null),
    getCriticalPath({ inquiryId: params.id }).catch(() => null),
    getEmailSnapshot(params.id).catch(() => null),
    getLifecycleProgress(params.id).catch(() => null),
    getNextActions(params.id).catch(() => null),
    getHandoffForInquiry(params.id).catch(() => null),
  ])

  if (!inquiry) {
    notFound()
  }

  // Fetch platform record data (non-blocking, catches errors gracefully)
  const isMarketplaceInquiry = !!(inquiry as any).external_platform
  const [platformRecord, platformSnapshots, platformPayout] = isMarketplaceInquiry
    ? await Promise.all([
        getPlatformRecordByInquiry(params.id).catch(() => null),
        getPlatformSnapshots(params.id).catch(() => []),
        getPlatformPayout(params.id).catch(() => null),
      ])
    : [null, [], null]

  // Compute client engagement score (only if inquiry is linked to a registered client)
  const clientActivity = inquiry.client?.id
    ? await getClientTimeline(inquiry.client.id, 50).catch(() => [])
    : []
  const engagementScore = computeEngagementScore(clientActivity)

  // If this inquiry was converted to an event, fetch its dinner photos
  const convertedEventId = (inquiry as any).converted_to_event_id as string | null
  const [eventPhotos, docReadiness] = await Promise.all([
    convertedEventId
      ? getEventPhotosForChef(convertedEventId).catch(() => [])
      : Promise.resolve([]),
    convertedEventId
      ? getDocumentReadiness(convertedEventId).catch(() => null)
      : Promise.resolve(null),
  ])

  // Find the first outbound draft (auto-generated by reactive pipeline)
  // If none exists and inquiry needs chef action, generate one proactively
  let pendingDraft = (() => {
    const draft = (messages as any[]).find(
      (m) => m.status === 'draft' && m.direction === 'outbound'
    )
    if (!draft) return null
    return {
      id: draft.id as string,
      subject: (draft.subject ?? '') as string,
      body: (draft.body ?? '') as string,
    }
  })()

  // Proactive draft: if no draft exists and inquiry needs response, generate one now
  if (!pendingDraft && ['new', 'awaiting_chef'].includes(inquiry.status)) {
    try {
      const { ensureInquiryDraft } = await import('@/lib/inquiries/proactive-draft-engine')
      const generated = await ensureInquiryDraft(params.id)
      if (generated) {
        // Re-fetch messages to pick up the new draft
        const { getMessagesForInquiry: refetchMessages } = await import('@/lib/gmail/actions')
        const freshMessages = await refetchMessages(params.id).catch(() => [])
        const newDraft = (freshMessages as any[]).find(
          (m: any) => m.status === 'draft' && m.direction === 'outbound'
        )
        if (newDraft) {
          pendingDraft = {
            id: newDraft.id as string,
            subject: (newDraft.subject ?? '') as string,
            body: (newDraft.body ?? '') as string,
          }
        }
      }
    } catch {
      // Non-blocking: if draft generation fails, page renders normally without a draft
    }
  }

  const name = getDisplayName(inquiry)
  const email = getDisplayEmail(inquiry)
  const phone = getDisplayPhone(inquiry)
  const referralSource = getReferralSource(inquiry)
  const parsedScheduleRequest = ScheduleRequestSchema.safeParse(
    (inquiry as any).schedule_request_jsonb ?? undefined
  )
  const scheduleRequest = parsedScheduleRequest.success ? parsedScheduleRequest.data : undefined
  const scheduleSummary = summarizeScheduleRequest(scheduleRequest)
  const tacPageCapture = inquiry.channel === 'take_a_chef' ? getTakeAChefPageCapture(inquiry) : null
  const seasonalIntent = readPublicSeasonalMarketPulseIntentFromUnknownFields(
    inquiry.unknown_fields
  )
  const hasResolvedRequestScope =
    seasonalIntent?.requestScope && seasonalIntent.requestScope.label !== seasonalIntent.scope.label

  // Compute GOLDMINE lead score (used for badge + factors display)
  const uf = inquiry.unknown_fields as Record<string, unknown> | null
  let leadScore: LeadScoreData | null = null
  if (uf?.lead_score != null && uf?.lead_tier) {
    leadScore = {
      lead_score: uf.lead_score as number,
      lead_tier: uf.lead_tier as 'hot' | 'warm' | 'cold',
      lead_score_factors: (uf.lead_score_factors as string[]) || [],
    }
  } else {
    leadScore = scoreInquiryFields({
      confirmed_date: inquiry.confirmed_date ?? null,
      confirmed_guest_count: inquiry.confirmed_guest_count ?? null,
      confirmed_budget_cents: inquiry.confirmed_budget_cents ?? null,
      confirmed_location: (inquiry as any).confirmed_location ?? null,
      confirmed_occasion: inquiry.confirmed_occasion ?? null,
      confirmed_dietary_restrictions: (inquiry as any).confirmed_dietary_restrictions ?? null,
      confirmed_cannabis_preference: null,
    })
  }

  // Track which confirmed facts are still missing
  const missingFacts: string[] = []
  if (!inquiry.confirmed_date) missingFacts.push('Event Date')
  if (!inquiry.confirmed_guest_count) missingFacts.push('Guest Count')
  if (!inquiry.confirmed_location) missingFacts.push('Location')
  if (!inquiry.confirmed_occasion) missingFacts.push('Occasion')
  if (!inquiry.confirmed_budget_cents) missingFacts.push('Budget')

  // Build summary data for the shared InquirySummary component
  const summaryData: InquirySummaryData = {
    id: inquiry.id,
    status: inquiry.status as any,
    channel: inquiry.channel,
    confirmed_occasion: inquiry.confirmed_occasion,
    confirmed_date: inquiry.confirmed_date,
    confirmed_guest_count: inquiry.confirmed_guest_count,
    confirmed_location: inquiry.confirmed_location,
    confirmed_budget_cents: inquiry.confirmed_budget_cents,
    confirmed_dietary_restrictions: inquiry.confirmed_dietary_restrictions,
    confirmed_service_expectations: inquiry.confirmed_service_expectations,
    source_message: inquiry.source_message,
    first_contact_at: inquiry.first_contact_at,
    last_response_at: inquiry.last_response_at,
    updated_at: inquiry.updated_at,
    transitions: inquiry.transitions as any,
    quotes: quotes.map((q: any) => ({
      id: q.id,
      quote_name: q.quote_name,
      total_quoted_cents: q.total_quoted_cents,
      status: q.status,
      pricing_model: q.pricing_model,
    })),
    converted_to_event_id: convertedEventId,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">{name}</h1>
            <InquiryStatusBadge status={inquiry.status as any} />
            <InquiryChannelBadge channel={inquiry.channel} />
            {inquiry.client?.id && (
              <EngagementBadge level={engagementScore.level} signals={engagementScore.signals} />
            )}
            {bookingScore && <BookingScoreBadge score={bookingScore} />}
            {leadScore ? <LeadScoreBadge score={leadScore} /> : null}
            {handoffInfo && (
              <Link href={`/network?tab=handoffs`}>
                <Badge variant="info">
                  Referred ({handoffInfo.conversions}/{handoffInfo.recipientCount} converted)
                </Badge>
              </Link>
            )}
            {inquiry.channel === 'take_a_chef' && (
              <LikelihoodToggle
                inquiryId={inquiry.id}
                currentLikelihood={(inquiry as any).chef_likelihood ?? null}
              />
            )}
          </div>
          {inquiry.confirmed_occasion && (
            <p className="text-stone-400 mt-1">{inquiry.confirmed_occasion}</p>
          )}
          <p className="text-sm text-stone-400 mt-1">
            First contact{' '}
            {formatDistanceToNow(new Date(inquiry.first_contact_at), { addSuffix: true })}
          </p>
        </div>
        <Link href="/inquiries">
          <Button variant="ghost">Back to Pipeline</Button>
        </Link>
      </div>

      {/* Confirmed inquiry warning - no event linked after commitment */}
      {!convertedEventId &&
        inquiry.status === 'confirmed' &&
        Date.now() - new Date(inquiry.created_at).getTime() > 5 * 60 * 1000 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="text-sm font-medium text-amber-300">No event linked to this inquiry</p>
            <p className="text-xs text-amber-400/70 mt-1">
              Inquiry-first lanes should stay eventless until commitment. If this inquiry is truly
              booked, convert it now or check whether the accepted quote failed to materialize the
              event.
            </p>
          </div>
        )}

      {/* Next Action - what to do right now */}
      {nextActions && <NextActionBanner data={nextActions} />}

      {/* Soft-Close Leverage Card - State 1: detected soft close, inquiry still open */}
      {nextActions?.softCloseWorkflow?.futureInterest && inquiry.status === 'awaiting_chef' && (
        <SoftCloseLeverageCard
          inquiryId={inquiry.id}
          inquiryStatus={inquiry.status}
          declineReason={(inquiry as any).decline_reason ?? null}
          futureInterest={nextActions.softCloseWorkflow.futureInterest}
          inquiryDietary={
            Array.isArray((inquiry as any).confirmed_dietary_restrictions)
              ? ((inquiry as any).confirmed_dietary_restrictions as string[])
              : []
          }
          inquiryDishes={
            Array.isArray((inquiry as any).discussed_dishes)
              ? ((inquiry as any).discussed_dishes as string[])
              : []
          }
          contactName={(inquiry as any).contact_name ?? inquiry.client?.full_name ?? null}
          closedAt={inquiry.updated_at ?? null}
          clientId={inquiry.client_id ?? null}
          contactEmail={(inquiry as any).contact_email ?? inquiry.client?.email ?? null}
        />
      )}

      {/* Critical Path - the go/no-go status for this dinner */}
      {criticalPath && <CriticalPathCard criticalPath={criticalPath} circleToken={circleToken} />}

      {/* Service Lifecycle Progress - expanded checkpoint tracking */}
      {lifecycleProgress && lifecycleProgress.stages.length > 0 && (
        <LifecycleProgressPanel
          inquiryId={params.id}
          stages={lifecycleProgress.stages}
          overallPercent={lifecycleProgress.overallPercent}
          currentStage={lifecycleProgress.currentStage}
          nextActions={lifecycleProgress.nextActions}
        />
      )}

      {/* Dinner Circle Link */}
      {circleToken && !criticalPath && (
        <Card className="bg-stone-800/50 border-stone-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-200">Dinner Circle</p>
              <p className="text-xs text-stone-400">
                This inquiry has an active Dinner Circle where the client can view updates
              </p>
            </div>
            <Link href={`/my-hub/g/${circleToken}`}>
              <Button variant="ghost" className="text-sm">
                View Circle
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Lead Score Factors - visible breakdown for mobile users */}
      {leadScore && leadScore.lead_score_factors.length > 0 && (
        <LeadScoreFactors factors={leadScore.lead_score_factors} />
      )}

      {/* Missing Facts Warning */}
      {missingFacts.length > 0 && inquiry.status !== 'declined' && inquiry.status !== 'expired' && (
        <div className="bg-amber-950 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800">Missing confirmed facts:</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {missingFacts.map((fact) => (
              <Badge key={fact} variant="warning">
                {fact}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-amber-600 mt-2">
            These need to be confirmed before converting to an event.
          </p>
        </div>
      )}

      {seasonalIntent && (
        <Card className="p-6 border-stone-700 bg-stone-900/70">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xxs font-semibold uppercase tracking-wider text-emerald-300">
                Seasonal Intent
              </p>
              <h2 className="mt-2 text-lg font-semibold text-stone-100">
                {seasonalIntent.season} market note
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                {seasonalIntent.leadIngredients.join(', ')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {seasonalIntent.leadIngredients.map((ingredient) => (
                <span
                  key={ingredient}
                  className="rounded-full border border-stone-700 bg-stone-950 px-3 py-1 text-xs text-stone-300"
                >
                  {ingredient}
                </span>
              ))}
            </div>
            <dl
              className={`grid gap-3 text-sm text-stone-300 ${
                hasResolvedRequestScope ? 'md:grid-cols-4' : 'md:grid-cols-3'
              }`}
            >
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Market Note Scope
                </dt>
                <dd className="mt-1">{formatSeasonalScopeLabel(seasonalIntent)}</dd>
              </div>
              {hasResolvedRequestScope && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Booking Scope
                  </dt>
                  <dd className="mt-1">{seasonalIntent.requestScope?.label}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Evidence
                </dt>
                <dd className="mt-1">{getSeasonalIntentEvidenceLabel(seasonalIntent)}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Freshness
                </dt>
                <dd className="mt-1">{getSeasonalIntentFreshnessLabel(seasonalIntent)}</dd>
              </div>
            </dl>
            {(seasonalIntent.endingSoon || seasonalIntent.comingNext) && (
              <p className="text-xs leading-5 text-stone-400">
                {seasonalIntent.endingSoon
                  ? `${seasonalIntent.endingSoon} was flagged as ending soon. `
                  : ''}
                {seasonalIntent.comingNext
                  ? `${seasonalIntent.comingNext} was flagged as the next move.`
                  : ''}
              </p>
            )}
            <p className="text-xs leading-5 text-stone-500">
              {seasonalIntent.sourceMode === 'market-backed'
                ? 'Fresh public market evidence was carried from the public note into this request.'
                : 'This request carried the public note as a calendar fallback because fresh public market evidence was unavailable or withheld.'}{' '}
              {hasResolvedRequestScope
                ? 'The booking location was resolved separately so the chef can compare note scope to request scope.'
                : 'The stored note scope matches the booking context carried into the request.'}
            </p>
          </div>
        </Card>
      )}

      {/* Inquiry Summary - visual snapshot */}
      <InquirySummary data={summaryData} variant="chef" />

      {/* Conversion Intelligence */}
      <Suspense fallback={null}>
        <InquiryIntelligencePanel
          inquiryId={inquiry.id}
          guestCount={inquiry.confirmed_guest_count ?? null}
          occasion={inquiry.confirmed_occasion ?? null}
          budgetCents={inquiry.confirmed_budget_cents ?? null}
          channel={inquiry.channel}
          createdAt={inquiry.created_at}
        />
      </Suspense>

      {/* Context Inspector - consolidated client context */}
      {inquiry.client_id && (
        <ContextInspector
          clientId={inquiry.client_id}
          inquiryId={inquiry.id}
          sections={[
            'client',
            'dietary',
            'preferences',
            'pastMeals',
            'feedback',
            'venue',
            'milestones',
          ]}
          defaultCollapsed={true}
        />
      )}

      {(inquiry as any).service_mode === 'multi_day' && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Series Request</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-stone-500">Service Mode</dt>
              <dd className="text-stone-100 mt-1">Multi-day Service</dd>
            </div>
            <div>
              <dt className="text-stone-500">Date Window</dt>
              <dd className="text-stone-100 mt-1">
                {scheduleRequest?.start_date || inquiry.confirmed_date || 'TBD'} to{' '}
                {scheduleRequest?.end_date ||
                  scheduleRequest?.start_date ||
                  inquiry.confirmed_date ||
                  'TBD'}
              </dd>
            </div>
            <div>
              <dt className="text-stone-500">Requested Sessions</dt>
              <dd className="text-stone-100 mt-1">{scheduleRequest?.sessions?.length || 0}</dd>
            </div>
          </dl>
          {scheduleSummary && <p className="text-sm text-stone-400 mt-4">{scheduleSummary}</p>}
          {scheduleRequest?.outline && (
            <p className="text-sm text-stone-300 mt-3 whitespace-pre-wrap">
              {scheduleRequest.outline}
            </p>
          )}
        </Card>
      )}

      {/* TakeAChef workflow guide - collapsible overview for first-time users */}
      {inquiry.channel === 'take_a_chef' && <TacWorkflowGuide inquiryStatus={inquiry.status} />}

      {tacPageCapture && (
        <Card className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold">Latest Marketplace Capture</h2>
                <Badge variant="info">{tacPageCapture.captureType.replace('_', ' ')}</Badge>
              </div>
              {tacPageCapture.capturedAt && (
                <p className="mt-1 text-sm text-stone-400">
                  Captured{' '}
                  {formatDistanceToNow(new Date(tacPageCapture.capturedAt), { addSuffix: true })}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/marketplace/capture">
                <Button variant="ghost">Capture another page</Button>
              </Link>
              {tacPageCapture.pageUrl && (
                <a
                  href={tacPageCapture.pageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
                >
                  Open captured page
                </a>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {tacPageCapture.pageTitle && (
              <p className="text-stone-200">
                <span className="text-stone-500">Page title:</span> {tacPageCapture.pageTitle}
              </p>
            )}
            {tacPageCapture.summary && <p className="text-stone-300">{tacPageCapture.summary}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-stone-400">
              {tacPageCapture.extractedBookingDate && (
                <span>Date: {tacPageCapture.extractedBookingDate}</span>
              )}
              {tacPageCapture.extractedLocation && (
                <span>Location: {tacPageCapture.extractedLocation}</span>
              )}
              {tacPageCapture.extractedEmail && <span>Email: {tacPageCapture.extractedEmail}</span>}
              {tacPageCapture.extractedPhone && <span>Phone: {tacPageCapture.extractedPhone}</span>}
            </div>
            {(tacPageCapture.proposalCapturedAt ||
              tacPageCapture.proposalAmountCents != null ||
              tacPageCapture.menuSeen) && (
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-stone-400">
                {tacPageCapture.proposalCapturedAt && (
                  <span>
                    Proposal captured{' '}
                    {formatDistanceToNow(new Date(tacPageCapture.proposalCapturedAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
                {tacPageCapture.proposalAmountCents != null && (
                  <span>Proposal amount: {formatCurrency(tacPageCapture.proposalAmountCents)}</span>
                )}
                {tacPageCapture.menuSeen && (
                  <span>
                    Menu captured
                    {tacPageCapture.menuCapturedAt
                      ? ` ${formatDistanceToNow(new Date(tacPageCapture.menuCapturedAt), {
                          addSuffix: true,
                        })}`
                      : ''}
                  </span>
                )}
              </div>
            )}
            {tacPageCapture.notes && (
              <p className="whitespace-pre-wrap text-stone-300">{tacPageCapture.notes}</p>
            )}
          </div>
        </Card>
      )}

      {/* TakeAChef-specific panels - only for take_a_chef channel */}
      {inquiry.channel === 'take_a_chef' && inquiry.status === 'new' && (
        <TacAddressLead
          inquiryId={inquiry.id}
          clientName={name}
          eventDate={inquiry.confirmed_date}
          tacLink={(inquiry as any).external_link ?? null}
          createdAt={inquiry.created_at}
        />
      )}
      {inquiry.channel === 'take_a_chef' && inquiry.status === 'awaiting_chef' && (
        <TacStatusPrompt
          inquiryId={inquiry.id}
          clientName={name}
          eventDate={inquiry.confirmed_date}
          tacLink={(inquiry as any).external_link ?? null}
        />
      )}
      {inquiry.channel === 'take_a_chef' && convertedEventId && inquiry.status === 'confirmed' && (
        <TacMenuNudge
          inquiryId={inquiry.id}
          eventId={convertedEventId}
          clientName={name}
          hasMenu={false}
        />
      )}

      {/* Marketplace Action Panel: shows platform status, action buttons, payout info, deep links.
          Uses platform_records when available, falls back to legacy inquiry fields for older inquiries. */}
      {isMarketplaceInquiry && platformRecord ? (
        <MarketplaceActionPanel
          record={platformRecord}
          payout={platformPayout}
          inquiryId={inquiry.id}
          clientName={name}
        />
      ) : (inquiry as any).external_link &&
        (inquiry as any).external_platform &&
        !(
          inquiry.channel === 'take_a_chef' &&
          (inquiry.status === 'new' || inquiry.status === 'awaiting_chef')
        ) ? (
        <MarketplaceFallbackBanner
          platform={(inquiry as any).external_platform}
          externalLink={(inquiry as any).external_link}
          externalInquiryId={(inquiry as any).external_inquiry_id ?? null}
          clientName={name}
          status={inquiry.status}
        />
      ) : null}

      {/* Platform activity timeline (snapshots from Gmail sync + page captures) */}
      {platformSnapshots.length > 0 && <MarketplaceSnapshotCard snapshots={platformSnapshots} />}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Contact</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-stone-500">Name</dt>
              <dd className="text-sm text-stone-100 mt-1">{name}</dd>
            </div>
            {email && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Email</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  <a href={`mailto:${email}`} className="text-brand-600 hover:underline">
                    {email}
                  </a>
                </dd>
              </div>
            )}
            {phone && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Phone</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  <a href={`tel:${phone}`} className="text-brand-600 hover:underline">
                    {phone}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-stone-500">Linked Client</dt>
              <dd className="text-sm mt-1">
                {inquiry.client ? (
                  <Link
                    href={`/clients/${inquiry.client.id}`}
                    className="text-brand-600 hover:underline"
                  >
                    {inquiry.client.full_name}
                  </Link>
                ) : (
                  <div>
                    <span className="text-stone-400 text-sm">Not linked to a client record</span>
                    <InquiryAddClientButton
                      inquiryId={inquiry.id}
                      prefillName={name !== 'Unknown Lead' ? name : undefined}
                      prefillEmail={email ?? undefined}
                      prefillPhone={phone ?? undefined}
                    />
                  </div>
                )}
              </dd>
            </div>
            {referralSource && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Referral Source</dt>
                <dd className="text-sm text-stone-100 mt-1">{referralSource}</dd>
              </div>
            )}
          </dl>
        </Card>

        {/* Confirmed Facts */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Confirmed Facts</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-stone-500">Event Date</dt>
              <dd className="text-sm mt-1">
                {inquiry.confirmed_date ? (
                  <span className="text-stone-100">
                    {format(new Date(inquiry.confirmed_date), 'EEEE, MMMM d, yyyy')}
                  </span>
                ) : (
                  <span className="text-stone-400 italic">Not confirmed</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Guest Count</dt>
              <dd className="text-sm mt-1">
                {inquiry.confirmed_guest_count ? (
                  <span className="text-stone-100">{inquiry.confirmed_guest_count} guests</span>
                ) : (
                  <span className="text-stone-400 italic">Not confirmed</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Location</dt>
              <dd className="text-sm mt-1">
                {inquiry.confirmed_location ? (
                  <span className="text-stone-100">{inquiry.confirmed_location}</span>
                ) : (
                  <span className="text-stone-400 italic">Not confirmed</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Budget</dt>
              <dd className="text-sm mt-1">
                {inquiry.confirmed_budget_cents ? (
                  <span className="text-stone-100">
                    {formatCurrency(inquiry.confirmed_budget_cents)}
                  </span>
                ) : (
                  <span className="text-stone-400 italic">Not confirmed</span>
                )}
              </dd>
            </div>
            {inquiry.confirmed_dietary_restrictions &&
              inquiry.confirmed_dietary_restrictions.length > 0 && (
                <div>
                  <dt className="text-sm font-medium text-stone-500">Dietary Restrictions</dt>
                  <dd className="text-sm text-stone-100 mt-1">
                    {inquiry.confirmed_dietary_restrictions.join(', ')}
                  </dd>
                </div>
              )}
            {inquiry.confirmed_service_expectations && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Service Expectations</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  {inquiry.confirmed_service_expectations}
                </dd>
              </div>
            )}
            {inquiry.confirmed_cannabis_preference && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Cannabis Preference</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  {inquiry.confirmed_cannabis_preference}
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      {/* Repeat Client Intelligence - only renders for clients with 2+ prior events */}
      {inquiry.client_id && <RepeatClientPanel clientId={inquiry.client_id} />}

      {/* Pipeline Management */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Pipeline</h2>
        {inquiry.next_action_required || inquiry.follow_up_due_at ? (
          <dl className="space-y-3">
            {inquiry.next_action_required && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Next Action</dt>
                <dd className="text-sm text-stone-100 mt-1">{inquiry.next_action_required}</dd>
              </div>
            )}
            {inquiry.next_action_by && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Action By</dt>
                <dd className="text-sm text-stone-100 mt-1">{inquiry.next_action_by}</dd>
              </div>
            )}
            {inquiry.follow_up_due_at && (
              <div>
                <dt className="text-sm font-medium text-stone-500">Follow-up Due</dt>
                <dd className="text-sm text-stone-100 mt-1">
                  {format(new Date(inquiry.follow_up_due_at), 'MMM d, yyyy')}{' '}
                  <span className="text-stone-400">
                    ({formatDistanceToNow(new Date(inquiry.follow_up_due_at), { addSuffix: true })})
                  </span>
                </dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-sm text-stone-500">No follow-up deadline set.</p>
        )}

        <InquiryDeadlineForm
          inquiryId={inquiry.id}
          currentDeadline={inquiry.follow_up_due_at}
          currentNextAction={inquiry.next_action_required}
        />
      </Card>

      {/* Quotes Section */}
      <Card className="p-6" data-testid="inquiry-quotes-section">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Quotes</h2>
          <Link
            href={buildQuoteDraftHref({
              source: 'inquiry',
              inquiry_id: inquiry.id,
              client_id: inquiry.client_id ?? undefined,
            })}
            data-testid="inquiry-create-quote"
          >
            <Button size="sm">+ Create Quote</Button>
          </Link>
        </div>
        {quotes.length === 0 ? (
          <p className="text-stone-500 text-sm">No quotes created for this inquiry yet.</p>
        ) : (
          <div className="space-y-2">
            {quotes.map((quote: any) => (
              <div key={quote.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <Link href={`/quotes/${quote.id}`} className="flex-1 min-w-0 hover:underline">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-100 text-sm">
                        {quote.quote_name || formatCurrency(quote.total_quoted_cents)}
                      </span>
                      <QuoteStatusBadge status={quote.status as any} />
                      {quote.pricing_model && (
                        <PricingModelBadge model={quote.pricing_model as any} />
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-sm font-semibold text-stone-100">
                      {formatCurrency(quote.total_quoted_cents)}
                    </span>
                    {(quote.status === 'sent' || quote.status === 'accepted') && (
                      <a
                        href={`/api/documents/quote/${quote.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-stone-500 hover:text-stone-200 border border-stone-700 rounded px-2 py-0.5 hover:bg-stone-800"
                      >
                        PDF
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Platform Response Drafter - for marketplace leads that require copy/paste on the source platform */}
      {inquiry.status !== 'declined' &&
        inquiry.status !== 'expired' &&
        [
          'take_a_chef',
          'private_chef_manager',
          'yhangry',
          'bark',
          'thumbtack',
          'cozymeal',
          'gigsalad',
          'theknot',
          'hireachef',
          'cuisineist',
        ].includes(inquiry.channel ?? '') && (
          <PlatformResponseDrafter
            inquiryId={inquiry.id}
            channel={inquiry.channel ?? ''}
            externalLink={(inquiry as any).external_link ?? null}
          />
        )}

      {/* Soft-Close Leverage Card - State 2: already declined for future reasons */}
      {inquiry.status === 'declined' &&
        (inquiry as any).decline_reason === 'Plans changed / maybe future' && (
          <SoftCloseLeverageCard
            inquiryId={inquiry.id}
            inquiryStatus={inquiry.status}
            declineReason={(inquiry as any).decline_reason ?? null}
            futureInterest={true}
            inquiryDietary={
              Array.isArray((inquiry as any).confirmed_dietary_restrictions)
                ? ((inquiry as any).confirmed_dietary_restrictions as string[])
                : []
            }
            inquiryDishes={
              Array.isArray((inquiry as any).discussed_dishes)
                ? ((inquiry as any).discussed_dishes as string[])
                : []
            }
            contactName={(inquiry as any).contact_name ?? inquiry.client?.full_name ?? null}
            closedAt={inquiry.updated_at ?? null}
            clientId={inquiry.client_id ?? null}
            contactEmail={(inquiry as any).contact_email ?? inquiry.client?.email ?? null}
          />
        )}

      {/* AI Response Composer (Gmail send - for direct/email inquiries) */}
      {/* Also shown for soft-close declined inquiries to allow optional courtesy closeout */}
      {(inquiry.status !== 'declined' && inquiry.status !== 'expired') ||
      (inquiry.status === 'declined' &&
        (inquiry as any).decline_reason === 'Plans changed / maybe future') ? (
        <InquiryResponseComposer
          inquiryId={inquiry.id}
          clientId={inquiry.client_id}
          clientEmail={email}
          gmailConnected={gmailStatus.gmail.connected}
          circleToken={circleToken}
          chefName={null}
          contactName={name}
          isFirstResponse={!(inquiry as any).first_response_at}
          snapshotData={snapshotData}
          pendingDraft={pendingDraft}
          softCloseMode={
            inquiry.status === 'declined' &&
            (inquiry as any).decline_reason === 'Plans changed / maybe future'
          }
        />
      ) : null}

      {/* TakeAChef transcript prompt - encourage pasting the TAC conversation */}
      {inquiry.channel === 'take_a_chef' &&
        (inquiry.status === 'awaiting_chef' || inquiry.status === 'quoted') && (
          <TacTranscriptPrompt
            inquiryId={inquiry.id}
            clientName={name}
            tacMessageCount={messages.filter((m: any) => m.channel === 'take_a_chef').length}
          />
        )}

      {/* Communication Log */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Communication</h2>
        <MessageThread messages={(messages as any[]).filter((m) => m.status !== 'draft')} />
        <div className="mt-4 pt-4 border-t border-stone-700">
          <MessageLogForm
            inquiryId={inquiry.id}
            clientId={inquiry.client_id ?? undefined}
            templates={templates}
          />
        </div>
      </Card>

      {/* Actions (Transitions) */}
      <InquiryTransitions
        inquiry={inquiry}
        canRelease={!!linkedSubmission && inquiry.status === 'new'}
      />

      {/* Notes */}
      <InquiryNotes inquiryId={inquiry.id} initialNotes={inquiryNotes} />

      {/* Recipe Ideas */}
      <InquiryRecipeLinker
        inquiryId={inquiry.id}
        initialLinks={recipeLinks}
        availableRecipes={availableRecipes}
      />

      {/* Dinner Photos - shown when this inquiry was converted to an event with photos */}
      {convertedEventId && (
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-xl font-semibold text-stone-100">Dinner Photos</h2>
            {eventPhotos.length === 0 && (
              <span className="text-sm text-stone-400">
                No photos uploaded yet for this dinner.{' '}
                <a href={`/events/${convertedEventId}`} className="text-brand-600 hover:underline">
                  Go to event &rarr;
                </a>
              </span>
            )}
          </div>
          <EventPhotoGallery eventId={convertedEventId} initialPhotos={eventPhotos} />
        </div>
      )}

      {/* Documents - shown when this inquiry was converted to an event */}
      {convertedEventId && docReadiness ? (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Link href={`/events/${convertedEventId}/documents`}>
              <Button variant="secondary" size="sm">
                Open Documents Hub
              </Button>
            </Link>
          </div>
          <DocumentSection eventId={convertedEventId} readiness={docReadiness} />
        </div>
      ) : convertedEventId ? (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-3">Printed Documents</h2>
          <p className="text-stone-500 text-sm">
            Documents will be available once a menu is added to the linked event.{' '}
            <a href={`/events/${convertedEventId}`} className="text-brand-600 hover:underline">
              Go to event &rarr;
            </a>
          </p>
        </Card>
      ) : (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-3">Printed Documents</h2>
          <p className="text-stone-500 text-sm">
            Documents will be available once this inquiry converts to a confirmed event.
          </p>
        </Card>
      )}

      <EntityActivityTimeline
        entityType="inquiry"
        entityId={inquiry.id}
        entries={timelineEntries}
      />

      {/* Metadata */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-3 text-stone-500">Metadata</h2>
        <dl className="grid grid-cols-2 gap-3 text-xs text-stone-400">
          <div>
            <dt className="font-medium">Created</dt>
            <dd>{format(new Date(inquiry.created_at), "MMM d, yyyy 'at' h:mm a")}</dd>
          </div>
          <div>
            <dt className="font-medium">Last Updated</dt>
            <dd>{format(new Date(inquiry.updated_at), "MMM d, yyyy 'at' h:mm a")}</dd>
          </div>
          {inquiry.last_response_at && (
            <div>
              <dt className="font-medium">Last Response</dt>
              <dd>{format(new Date(inquiry.last_response_at), "MMM d, yyyy 'at' h:mm a")}</dd>
            </div>
          )}
          <div>
            <dt className="font-medium">Inquiry ID</dt>
            <dd className="font-mono">{inquiry.id.slice(0, 8)}...</dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
