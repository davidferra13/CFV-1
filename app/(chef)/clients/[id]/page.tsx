// Chef Client Detail Page
// Shows client information, statistics, and event history

import { Suspense } from 'react'
import { WidgetErrorBoundary } from '@/components/ui/widget-error-boundary'
import { requireChef } from '@/lib/auth/get-user'
import {
  getClientWithStats,
  getClientEvents,
  getClientFinancialDetail,
} from '@/lib/clients/actions'
import { getClientLoyaltyProfile } from '@/lib/loyalty/actions'
import { getMessageThread, getResponseTemplates } from '@/lib/messages/actions'
import { MessageThread } from '@/components/messages/message-thread'
import { MessageLogForm } from '@/components/messages/message-log-form'
import {
  AwardBonusForm,
  RedeemRewardButton,
  ManualLoyaltyAdjustment,
} from '@/app/(chef)/loyalty/client-loyalty-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClientEventsTable } from './client-events-table'
import { MilestoneManager } from '@/components/clients/milestone-manager'
import { AddressManager } from '@/components/clients/address-manager'
import { AddressHandoff, EmailHandoff, PhoneHandoff } from '@/components/ui/handoff-actions'
import { PersonalInfoEditor } from '@/components/clients/personal-info-editor'
import { QuickNotes } from '@/components/clients/quick-notes'
import { getClientNotes } from '@/lib/notes/actions'
import { getClientConnections } from '@/lib/connections/actions'
import { getClients } from '@/lib/clients/actions'
import { ClientConnections } from '@/components/clients/client-connections'
import { getClientChefActivity } from '@/lib/activity/chef-actions'
import { getClientTimeline } from '@/lib/activity/actions'
import type { Milestone } from '@/lib/clients/milestones'
import { ClientEmailToggle } from '@/components/clients/client-email-toggle'
import { ClientFinancialPanel } from '@/components/clients/client-financial-panel'
import { FunQADisplay } from '@/components/clients/fun-qa-display'
import {
  getClientFunQA,
  getClientCulinaryProfileGuidance,
} from '@/lib/clients/client-profile-actions'
import { getClientAllergyRecords } from '@/lib/events/readiness'
import { getTasteProfile } from '@/lib/clients/taste-profile-actions'
import { TasteProfileForm } from '@/components/clients/taste-profile-form'
import { AllergyRecordsPanel } from '@/components/clients/allergy-records-panel'
import { getClientOutreachHistory } from '@/lib/marketing/actions'
import { DirectOutreachPanel } from '@/components/marketing/direct-outreach-panel'
import { ClientMenuHistory } from '@/components/menus/client-menu-history'
import { ClientStatusBadge } from '@/components/clients/client-status-badge'
import { getClientDormancyInfo } from '@/lib/clients/actions'
import { getChefReviews } from '@/lib/reviews/actions'
import { getClientProfitabilityHistory } from '@/lib/clients/profitability'
import { getSingleClientHealthScore } from '@/lib/clients/health-score'
import { ClientHealthBadge } from '@/components/clients/health-score-badge'
import { getClientLTVTrajectory } from '@/lib/clients/ltv-trajectory'
import { LTVChart } from '@/components/clients/ltv-chart'
import { getClientMenuHistory } from '@/lib/clients/menu-history'
import { MenuHistoryPanel } from '@/components/clients/menu-history-panel'
import { getUnifiedClientTimeline } from '@/lib/clients/unified-timeline'
import { UnifiedClientTimeline } from '@/components/clients/unified-client-timeline'
import { getClientTags, getAllUsedTags } from '@/lib/clients/tag-actions'
import { ClientTags } from '@/components/clients/client-tags'
import { getClientNextBestAction } from '@/lib/clients/next-best-action'
import { NextBestActionCard } from '@/components/clients/next-best-action-card'
import { RelationshipStrengthBadge } from '@/components/clients/relationship-strength-badge'
import { getClientPortalToken } from '@/lib/client-portal/actions'
import { PortalLinkManager } from '@/components/clients/portal-link-manager'
import { ClientPreferencePanel } from '@/components/ai/client-preference-panel'
import { SentimentBadge } from '@/components/ai/sentiment-badge'
import { NDAPanel } from '@/components/protection/nda-panel'
import { DemographicsEditor } from '@/components/clients/demographics-editor'
import { ClientCountryPanel } from '@/components/clients/client-country-panel'
import { PetManager } from '@/components/clients/pet-manager'
import { SecurityAccessPanel } from '@/components/clients/security-access-panel'
import { ServiceDefaultsPanel } from '@/components/clients/service-defaults-panel'
import { BusinessIntelPanel } from '@/components/clients/business-intel-panel'
import { PrivateContextPanel } from '@/components/events/private-context-panel'
import { loadEntityPrivateContexts } from '@/lib/private-context/loaders'
import { ClientPhotoGallery } from '@/components/clients/client-photo-gallery'
import { getClientPhotos } from '@/lib/clients/photo-actions'
import { computeEngagementScore } from '@/lib/activity/engagement'
import { EngagementBadge } from '@/components/activity/engagement-badge'
import { KitchenProfilePanel } from '@/components/clients/kitchen-profile-panel'
import { ClientIntelligencePanel } from '@/components/intelligence/client-intelligence-panel'
import { CulinaryProfilePanel } from '@/components/clients/culinary-profile-panel'
import { findPotentialClientMatches } from '@/lib/clients/cross-platform-matching'
import { PotentialDuplicatesCard } from '@/components/clients/potential-duplicates-card'
import { EntityPhotoUpload } from '@/components/entities/entity-photo-upload'
import { ScheduleMessageDialog } from '@/components/communication/schedule-message-dialog'
import { CompletionCard, CompletionCardSkeleton } from '@/components/completion/completion-card'
import { getCompletionForEntity } from '@/lib/completion/actions'
import { buildClientWorkGraph } from '@/lib/client-work-graph/build'
import {
  buildClientActionRequiredSummary,
  getSharedClientWorkGraphSnapshot,
} from '@/lib/client-work-graph/shared-snapshot'
import { getHouseholdForClient } from '@/lib/hub/household-actions'
import { ClientHouseholdPanel } from '@/components/clients/client-household-panel'
import { getCallsLoadState } from '@/lib/calls/actions'
import { buildClientCallMemorySnapshot } from '@/lib/clients/client-call-memory'
import { ClientCallMemoryPanel } from '@/components/clients/client-call-memory-panel'

async function ClientCompletionSection({ clientId }: { clientId: string }) {
  const result = await getCompletionForEntity('client', clientId)
  if (!result.success) throw new Error(result.error)
  if (!result.data) return null
  return <CompletionCard result={result.data} />
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-900 text-amber-800',
  silver: 'bg-stone-700 text-stone-200',
  gold: 'bg-yellow-900 text-yellow-800',
  platinum: 'bg-purple-900 text-purple-800',
}

const TIER_LABELS: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
  platinum: 'Platinum',
}

const EMPTY_HUB_SUMMARY = {
  groupCount: 0,
  friendCount: 0,
  pendingFriendRequestCount: 0,
  totalUnreadCount: 0,
} as const

const EMPTY_NOTIFICATION_SUMMARY = {
  unreadCount: 0,
  unread: [],
}

interface ClientDetailPageProps {
  params: {
    id: string
  }
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const chefUser = await requireChef()

  const [
    client,
    messages,
    templates,
    loyaltyProfile,
    clientNotes,
    connections,
    allClients,
    chefActivity,
    clientPortalActivity,
    financialDetail,
    funQAAnswers,
    allergyRecords,
    outreachHistory,
    dormancyInfo,
    allReviews,
    profitabilityHistory,
    ltvTrajectory,
    menuHistory,
    healthScore,
    unifiedTimeline,
    clientTags,
    allUsedTags,
    clientNBA,
    portalTokenData,
    clientPhotos,
    tasteProfile,
    culinaryGuidance,
    clientOpsSnapshotState,
    householdData,
    clientPrivateContexts,
    clientCallsState,
  ] = await Promise.all([
    getClientWithStats(params.id).catch(() => null),
    getMessageThread('client', params.id).catch(() => []),
    getResponseTemplates().catch(() => []),
    getClientLoyaltyProfile(params.id).catch(() => null),
    getClientNotes(params.id).catch(() => []),
    getClientConnections(params.id).catch(() => []),
    getClients().catch(() => []),
    getClientChefActivity(params.id).catch(() => []),
    getClientTimeline(params.id).catch(() => []),
    getClientFinancialDetail(params.id).catch(() => null),
    getClientFunQA(params.id).catch(() => ({})),
    getClientAllergyRecords(params.id).catch(() => []),
    getClientOutreachHistory(params.id).catch(() => []),
    getClientDormancyInfo(params.id).catch(() => null),
    getChefReviews().catch(() => []),
    getClientProfitabilityHistory(params.id).catch(() => null),
    getClientLTVTrajectory(params.id).catch(() => null),
    getClientMenuHistory(params.id).catch(() => null),
    getSingleClientHealthScore(params.id).catch(() => null),
    getUnifiedClientTimeline(params.id).catch(() => []),
    getClientTags(params.id).catch(() => []),
    getAllUsedTags().catch(() => []),
    getClientNextBestAction(params.id).catch(() => null),
    getClientPortalToken(params.id).catch(() => ({
      token: null,
      createdAt: null,
      expiresAt: null,
      lastUsedAt: null,
      hasActiveLink: false,
    })),
    getClientPhotos(params.id).catch(() => []),
    getTasteProfile(params.id).catch(() => null),
    getClientCulinaryProfileGuidance(params.id).catch(() => null),
    getSharedClientWorkGraphSnapshot({
      tenantId: chefUser.tenantId!,
      clientId: params.id,
      pastLimit: 5,
    })
      .then((snapshot) => ({
        snapshot,
        error: null as string | null,
      }))
      .catch((error) => ({
        snapshot: null,
        error:
          error instanceof Error ? error.message : 'Could not load the shared client ops snapshot.',
      })),
    getHouseholdForClient(params.id).catch(() => null),
    loadEntityPrivateContexts('client', params.id).catch(() => []),
    getCallsLoadState({ client_id: params.id, limit: 50 }).catch(() => ({
      status: 'unavailable' as const,
      data: [],
      error: 'Client call memory could not be loaded.',
    })),
  ])

  const engagementScore = computeEngagementScore(clientPortalActivity as any[])

  const clientReviews = allReviews.filter((r: any) => r.client?.id === params.id)
  const avgRating =
    clientReviews.length > 0
      ? parseFloat(
          (
            clientReviews.reduce((s: number, r: any) => s + r.rating, 0) / clientReviews.length
          ).toFixed(1)
        )
      : null

  if (!client) {
    notFound()
  }

  const clientOpsSnapshot = clientOpsSnapshotState.snapshot
  const clientOpsWorkGraph = clientOpsSnapshot
    ? buildClientWorkGraph({
        events: clientOpsSnapshot.eventsResult.all,
        quotes: clientOpsSnapshot.quotes,
        inquiries: clientOpsSnapshot.inquiries,
        profileSummary: clientOpsSnapshot.profileSummary,
        hubSummary: EMPTY_HUB_SUMMARY,
        rsvpSummary: clientOpsSnapshot.rsvpSummary,
        notificationSummary: EMPTY_NOTIFICATION_SUMMARY,
        eventStubs: [],
      })
    : null
  const clientOpsActionRequired = clientOpsWorkGraph
    ? buildClientActionRequiredSummary(clientOpsWorkGraph.summary)
    : null
  const paymentAttentionCount = clientOpsWorkGraph
    ? clientOpsWorkGraph.summary.paymentDueCount +
      clientOpsWorkGraph.summary.outstandingBalanceCount
    : null
  const replyAttentionCount = clientOpsWorkGraph
    ? clientOpsWorkGraph.summary.inquiryAwaitingCount + clientOpsWorkGraph.summary.rsvpPendingCount
    : null
  const activeRsvpEvent =
    clientOpsSnapshot?.rsvpSummary?.eventId != null
      ? (clientOpsSnapshot.eventsResult.upcoming.find(
          (event) => String(event.id) === clientOpsSnapshot.rsvpSummary?.eventId
        ) ?? null)
      : null
  const clientCallMemory =
    clientCallsState.status === 'ok' ? buildClientCallMemorySnapshot(clientCallsState.data) : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/clients"
            className="text-sm text-brand-500 hover:text-brand-400 mb-2 inline-block"
          >
            ← Back to Clients
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <EntityPhotoUpload
              entityType="client"
              entityId={client.id}
              currentPhotoUrl={(client as any).avatar_url ?? null}
              compact
              label="Add avatar"
            />
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100">{client.full_name}</h1>
            <ClientStatusBadge
              clientId={client.id}
              initialStatus={(client as any).status ?? 'active'}
            />
            {healthScore && <ClientHealthBadge score={healthScore.score} tier={healthScore.tier} />}
            {healthScore && (
              <RelationshipStrengthBadge
                tier={healthScore.tier}
                score={healthScore.score}
                showScore
              />
            )}
            <EngagementBadge level={engagementScore.level} signals={engagementScore.signals} />
          </div>
          <div className="mt-1 text-stone-300">
            <EmailHandoff
              email={client.email}
              subject={`ChefFlow update for ${client.full_name}`}
            />
          </div>
          {loyaltyProfile && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_COLORS[loyaltyProfile.currentTier]}`}
              >
                {TIER_LABELS[loyaltyProfile.currentTier]}
              </span>
              <span className="inline-flex items-center rounded-full bg-stone-800 px-2.5 py-1 text-xs text-stone-300">
                {loyaltyProfile.pointsBalance.toLocaleString()} points
              </span>
              <span className="inline-flex items-center rounded-full bg-stone-800 px-2.5 py-1 text-xs text-stone-300">
                {loyaltyProfile.totalEventsCompleted} visits
              </span>
            </div>
          )}
          {/* Tags */}
          <div className="mt-2">
            <ClientTags clientId={client.id} initialTags={clientTags} suggestedTags={allUsedTags} />
          </div>
          {/* Portal Link */}
          <div className="mt-3">
            <PortalLinkManager
              clientId={client.id}
              initialToken={portalTokenData.token}
              initialCreatedAt={portalTokenData.createdAt}
              initialExpiresAt={portalTokenData.expiresAt}
              initialHasActiveLink={portalTokenData.hasActiveLink}
              initialLastUsedAt={portalTokenData.lastUsedAt}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <ScheduleMessageDialog clientId={client.id} clientName={client.full_name} />
          <Link href={`/clients/${client.id}/relationship`}>
            <Button variant="secondary">Relationship Insights</Button>
          </Link>
          <Link href="/culinary/menus/templates">
            <Button variant="secondary">Menu Templates</Button>
          </Link>
          <Link href={`/clients/${client.id}/recurring`}>
            <Button variant="secondary">Recurring Planning</Button>
          </Link>
          <Link href={`/events/new?client_id=${client.id}`}>
            <Button>
              {(client as any).completedEvents > 0 ? 'Rebook Client' : 'Create Event'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Dormancy Warning */}
      {dormancyInfo?.isDormant && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-950 px-4 py-3">
          <span className="text-amber-600 text-lg">⏳</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              No events in {dormancyInfo.daysSinceLastEvent ?? 180}+ days
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Last event:{' '}
              {dormancyInfo.lastEventDate
                ? format(new Date(dormancyInfo.lastEventDate), 'MMMM d, yyyy')
                : 'None recorded'}
              . Consider reaching out to re-engage.
            </p>
          </div>
          <Link
            href={`/clients/${client.id}#outreach`}
            className="text-xs font-medium text-amber-800 underline shrink-0"
          >
            Send Message
          </Link>
        </div>
      )}

      {/* Next Best Action */}
      {clientNBA ? <NextBestActionCard action={clientNBA} /> : null}

      <ClientCallMemoryPanel
        snapshot={clientCallMemory}
        unavailable={clientCallsState.status === 'unavailable'}
      />

      {/* Client Ops Snapshot */}
      {clientOpsSnapshot ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Ops Snapshot</CardTitle>
            <p className="text-sm text-stone-400">
              Shared from the authenticated client workspace, focused on booking, payment, profile,
              and RSVP readiness.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                      Action Required
                    </p>
                    <p className="mt-2 text-2xl font-bold text-stone-100">
                      {clientOpsActionRequired?.totalItems ?? 0}
                    </p>
                  </div>
                  <Badge
                    variant={(clientOpsActionRequired?.totalItems ?? 0) > 0 ? 'warning' : 'success'}
                    className="shrink-0"
                  >
                    {(clientOpsActionRequired?.totalItems ?? 0) > 0 ? 'Client waiting' : 'Clear'}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-stone-400">
                  {clientOpsWorkGraph?.primary
                    ? clientOpsWorkGraph.primary.title
                    : 'No active client-side blockers in the shared queue.'}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-stone-500">Proposals</dt>
                    <dd className="mt-1 font-semibold text-stone-100">
                      {clientOpsActionRequired?.proposalCount ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Payments</dt>
                    <dd className="mt-1 font-semibold text-stone-100">
                      {paymentAttentionCount ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Quotes</dt>
                    <dd className="mt-1 font-semibold text-stone-100">
                      {clientOpsActionRequired?.quotePendingCount ?? 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-stone-500">Replies + RSVPs</dt>
                    <dd className="mt-1 font-semibold text-stone-100">
                      {replyAttentionCount ?? 0}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Balance + Payment
                </p>
                <p
                  className={`mt-2 text-2xl font-bold ${
                    client.outstandingBalanceCents > 0 ? 'text-red-400' : 'text-stone-100'
                  }`}
                >
                  {formatCurrency(client.outstandingBalanceCents)}
                </p>
                <p className="mt-2 text-sm text-stone-400">
                  {paymentAttentionCount && paymentAttentionCount > 0
                    ? `${paymentAttentionCount} payment step(s) are still open for this client.`
                    : 'No published balance or payment step is open right now.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={client.outstandingBalanceCents > 0 ? 'error' : 'success'}>
                    {client.outstandingBalanceCents > 0 ? 'Balance due' : 'Paid up'}
                  </Badge>
                  <Badge
                    variant={
                      (clientOpsActionRequired?.paymentDueCount ?? 0) > 0 ? 'warning' : 'default'
                    }
                  >
                    {clientOpsActionRequired?.paymentDueCount ?? 0} payment request(s)
                  </Badge>
                  <Badge
                    variant={
                      (clientOpsActionRequired?.outstandingBalanceCount ?? 0) > 0
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {clientOpsActionRequired?.outstandingBalanceCount ?? 0} overdue balance item(s)
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Profile Readiness
                </p>
                <p className="mt-2 text-2xl font-bold text-stone-100">
                  {clientOpsSnapshot.profileSummary.completionPercent}%
                </p>
                <p className="mt-2 text-sm text-stone-400">
                  {clientOpsSnapshot.profileSummary.completedFields}/
                  {clientOpsSnapshot.profileSummary.totalFields} core fields complete.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge
                    variant={
                      clientOpsSnapshot.profileSummary.completionPercent >= 100
                        ? 'success'
                        : 'warning'
                    }
                  >
                    {clientOpsSnapshot.profileSummary.completionPercent >= 100
                      ? 'Profile complete'
                      : 'Profile incomplete'}
                  </Badge>
                  <Badge
                    variant={
                      clientOpsSnapshot.profileSummary.pendingMealRequests > 0
                        ? 'warning'
                        : 'success'
                    }
                  >
                    {clientOpsSnapshot.profileSummary.pendingMealRequests} pending meal request(s)
                  </Badge>
                  <Badge
                    variant={
                      clientOpsSnapshot.profileSummary.signalNotificationsEnabled
                        ? 'success'
                        : 'warning'
                    }
                  >
                    Signal alerts{' '}
                    {clientOpsSnapshot.profileSummary.signalNotificationsEnabled ? 'on' : 'off'}
                  </Badge>
                </div>
              </div>

              <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Next Active RSVP
                </p>
                {clientOpsSnapshot.rsvpSummary ? (
                  <>
                    <p className="mt-2 text-lg font-semibold text-stone-100">
                      {clientOpsSnapshot.rsvpSummary.occasion || 'Upcoming event'}
                    </p>
                    <p className="mt-1 text-sm text-stone-400">
                      {activeRsvpEvent?.event_date
                        ? format(new Date(activeRsvpEvent.event_date), 'MMM d, yyyy')
                        : 'Date pending'}
                    </p>
                    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-stone-500">Guests</dt>
                        <dd className="mt-1 font-semibold text-stone-100">
                          {clientOpsSnapshot.rsvpSummary.totalGuests}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Attending</dt>
                        <dd className="mt-1 font-semibold text-stone-100">
                          {clientOpsSnapshot.rsvpSummary.attendingCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Pending</dt>
                        <dd className="mt-1 font-semibold text-stone-100">
                          {clientOpsSnapshot.rsvpSummary.pendingCount}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-stone-500">Share</dt>
                        <dd className="mt-1 font-semibold text-stone-100">
                          {clientOpsSnapshot.rsvpSummary.hasActiveShare ? 'Active' : 'Inactive'}
                        </dd>
                      </div>
                    </dl>
                  </>
                ) : (
                  <div className="mt-2 space-y-2">
                    <p className="text-lg font-semibold text-stone-100">No active RSVP lane</p>
                    <p className="text-sm text-stone-400">
                      This client does not currently have an accepted, paid, confirmed, or in
                      progress event in the RSVP/share flow.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-red-800/40 bg-red-950/20">
          <CardHeader>
            <CardTitle className="text-base text-red-200">
              Client Ops Snapshot Unavailable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-300">
              The shared authenticated client snapshot did not load, so this page is not showing
              synthetic zero states for action items, profile readiness, or RSVP status.
            </p>
            {clientOpsSnapshotState.error ? (
              <p className="mt-2 text-xs text-red-400">{clientOpsSnapshotState.error}</p>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Potential Duplicates */}
      <WidgetErrorBoundary name="Duplicates" compact>
        <Suspense fallback={null}>
          <DuplicatesSection clientId={client.id} clientName={client.full_name} />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Relationship Intelligence */}
      <WidgetErrorBoundary name="Intelligence" compact>
        <Suspense fallback={null}>
          <ClientIntelligencePanel clientId={client.id} />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Completion Contract */}
      <WidgetErrorBoundary name="Completion" compact>
        <Suspense fallback={<CompletionCardSkeleton />}>
          <ClientCompletionSection clientId={client.id} />
        </Suspense>
      </WidgetErrorBoundary>

      {/* Client Details */}
      <Card>
        <CardHeader>
          <CardTitle>Client Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-stone-500">Full Name</p>
              <p className="text-lg text-stone-100 mt-1">{client.full_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Email</p>
              <p className="text-lg text-stone-100 mt-1">
                <EmailHandoff
                  email={client.email}
                  subject={`ChefFlow update for ${client.full_name}`}
                />
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Phone</p>
              <p className="text-lg text-stone-100 mt-1">
                {client.phone ? <PhoneHandoff phone={client.phone} /> : 'Not provided'}
              </p>
            </div>
            {(client as any).address && (
              <div>
                <p className="text-sm font-medium text-stone-500">Primary Address</p>
                <p className="text-lg text-stone-100 mt-1">
                  <AddressHandoff address={(client as any).address} />
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-stone-500">Client Since</p>
              <p className="text-lg text-stone-100 mt-1">
                {format(new Date(client.created_at), 'PPPP')}
              </p>
            </div>
            <div>
              <ClientEmailToggle
                clientId={client.id}
                initialEnabled={(client as any).automated_emails_enabled !== false}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demographics & Identity */}
      <DemographicsEditor
        clientId={client.id}
        chefId={chefUser.entityId}
        occupation={(client as any).occupation ?? null}
        companyName={(client as any).company_name ?? null}
        birthday={(client as any).birthday ?? null}
        anniversary={(client as any).anniversary ?? null}
        instagramHandle={(client as any).instagram_handle ?? null}
        preferredContactMethod={(client as any).preferred_contact_method ?? null}
        referralSource={(client as any).referral_source ?? null}
        referralSourceDetail={(client as any).referral_source_detail ?? null}
        formality={(client as any).formality_level ?? null}
      />

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Total Events</div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-100 mt-2">
              {client.totalEvents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Completed Events</div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-100 mt-2">
              {client.completedEvents}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Total Spent</div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-100 mt-2">
              {formatCurrency(client.totalSpentCents)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Average Event Value</div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-100 mt-2">
              {formatCurrency(client.averageEventValueCents)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Favorites</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-3">
            <p className="text-sm text-stone-200">
              Treat favorites as positive planning signals from the client.
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Favorite dishes are explicit repeats they want back. Favorite cuisines are broader
              menu direction. Allergies, dislikes, dietary protocols, and active avoid requests
              still take priority over favorites.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-300">Favorite Dishes</p>
                <span className="text-xs text-stone-500">
                  {((client as any).favorite_dishes as string[] | null)?.length ?? 0} saved
                </span>
              </div>
              {(client as any).favorite_dishes &&
              ((client as any).favorite_dishes as string[]).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {((client as any).favorite_dishes as string[]).map((dish) => (
                    <Badge key={dish} variant="info">
                      {dish}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No favorite dishes saved yet.</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-stone-300">Favorite Cuisines</p>
                <span className="text-xs text-stone-500">
                  {((client as any).favorite_cuisines as string[] | null)?.length ?? 0} saved
                </span>
              </div>
              {(client as any).favorite_cuisines &&
              ((client as any).favorite_cuisines as string[]).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {((client as any).favorite_cuisines as string[]).map((cuisine) => (
                    <Badge key={cuisine} variant="default">
                      {cuisine}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">No favorite cuisines saved yet.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profitability History */}
      {profitabilityHistory &&
        profitabilityHistory.eventCount > 0 &&
        profitabilityHistory.avgMarginPercent !== null && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">
                  Profitability with {client.full_name.split(' ')[0]}
                </CardTitle>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    profitabilityHistory.trend === 'improving'
                      ? 'bg-emerald-900 text-emerald-700'
                      : profitabilityHistory.trend === 'declining'
                        ? 'bg-red-900 text-red-700'
                        : profitabilityHistory.trend === 'stable'
                          ? 'bg-stone-800 text-stone-300'
                          : 'bg-stone-800 text-stone-300'
                  }`}
                >
                  {profitabilityHistory.trend === 'improving'
                    ? '↑ Improving'
                    : profitabilityHistory.trend === 'declining'
                      ? '↓ Declining'
                      : profitabilityHistory.trend === 'stable'
                        ? '→ Stable'
                        : 'Early days'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-stone-500">Avg Margin</p>
                  <p
                    className={`text-xl font-bold mt-0.5 ${
                      profitabilityHistory.avgMarginPercent >= 40
                        ? 'text-emerald-600'
                        : profitabilityHistory.avgMarginPercent >= 20
                          ? 'text-amber-600'
                          : 'text-red-600'
                    }`}
                  >
                    {profitabilityHistory.avgMarginPercent}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Avg Food Cost</p>
                  <p className="text-xl font-bold text-stone-100 mt-0.5">
                    {profitabilityHistory.avgFoodCostPercent !== null
                      ? `${profitabilityHistory.avgFoodCostPercent}%`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Avg $/hr</p>
                  <p className="text-xl font-bold text-stone-100 mt-0.5">
                    {profitabilityHistory.avgHourlyRateCents !== null
                      ? `${formatCurrency(profitabilityHistory.avgHourlyRateCents)}`
                      : '-'}
                  </p>
                </div>
              </div>
              {profitabilityHistory.events.length >= 3 && (
                <div className="mt-4 pt-3 border-t border-stone-800">
                  <p className="text-xs text-stone-300 mb-2">
                    Per-event margins ({profitabilityHistory.eventCount} events)
                  </p>
                  <div className="flex gap-1 items-end h-8">
                    {profitabilityHistory.events.slice(-8).map((e) => {
                      const heightClass =
                        e.marginPercent >= 70
                          ? 'h-8'
                          : e.marginPercent >= 60
                            ? 'h-7'
                            : e.marginPercent >= 50
                              ? 'h-6'
                              : e.marginPercent >= 40
                                ? 'h-5'
                                : e.marginPercent >= 30
                                  ? 'h-4'
                                  : e.marginPercent >= 20
                                    ? 'h-3'
                                    : e.marginPercent >= 10
                                      ? 'h-2'
                                      : 'h-1'
                      const color =
                        e.marginPercent >= 40
                          ? 'bg-emerald-400'
                          : e.marginPercent >= 20
                            ? 'bg-amber-400'
                            : 'bg-red-400'
                      return (
                        <div
                          key={e.eventId}
                          title={`${e.occasion || 'Event'} | ${e.marginPercent}% margin`}
                          className={`flex-1 rounded-sm min-w-2 ${heightClass} ${color}`}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

      {/* LTV Trajectory Chart */}
      {ltvTrajectory && ltvTrajectory.eventCount >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lifetime Value Trajectory</CardTitle>
          </CardHeader>
          <CardContent>
            <LTVChart
              points={ltvTrajectory.points}
              totalLifetimeValueCents={ltvTrajectory.totalLifetimeValueCents}
            />
          </CardContent>
        </Card>
      )}

      {/* Culinary History - menus/dishes served to this client */}
      {menuHistory && <MenuHistoryPanel history={menuHistory} />}

      {/* Direct Outreach */}
      <Card id="outreach">
        <CardHeader>
          <CardTitle className="text-base">Send Message</CardTitle>
        </CardHeader>
        <CardContent>
          <DirectOutreachPanel
            clientId={client.id}
            clientEmail={client.email ?? null}
            clientPhone={(client as any).phone ?? null}
            preferredContactMethod={(client as any).preferred_contact_method ?? null}
            history={outreachHistory as any}
          />
        </CardContent>
      </Card>

      {/* Financial Detail */}
      {financialDetail && (
        <ClientFinancialPanel
          eventBreakdown={financialDetail.eventBreakdown}
          ledgerEntries={financialDetail.ledgerEntries as any}
          summary={financialDetail.summary}
        />
      )}

      {/* Loyalty Program */}
      {loyaltyProfile && (
        <Card className="p-6">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold">Loyalty</h2>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_COLORS[loyaltyProfile.currentTier]}`}
            >
              {TIER_LABELS[loyaltyProfile.currentTier]}
            </span>
          </div>

          {/* Loyalty Stats */}
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <dt className="text-sm font-medium text-stone-500">Points Balance</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                {loyaltyProfile.pointsBalance.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Lifetime Earned</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                {loyaltyProfile.lifetimePointsEarned.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Events Completed</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                {loyaltyProfile.totalEventsCompleted}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Guests Served</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-100 mt-1">
                {loyaltyProfile.totalGuestsServed}
              </dd>
            </div>
          </dl>

          {/* Progress to Next Tier */}
          {loyaltyProfile.nextTierName && loyaltyProfile.pointsToNextTier > 0 && (
            <div className="mb-6 p-3 rounded-lg bg-stone-800">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-stone-300">Progress to {loyaltyProfile.nextTierName}</span>
                <span className="font-medium text-stone-100">
                  {loyaltyProfile.pointsToNextTier} pts to go
                </span>
              </div>
              <div className="w-full bg-stone-700 rounded-full h-2">
                <div
                  className="bg-brand-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(5, (loyaltyProfile.lifetimePointsEarned / (loyaltyProfile.lifetimePointsEarned + loyaltyProfile.pointsToNextTier)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Next Milestone */}
          {loyaltyProfile.nextMilestone && (
            <p className="text-sm text-stone-500 mb-4">
              Next milestone: {loyaltyProfile.nextMilestone.eventsNeeded} more event
              {loyaltyProfile.nextMilestone.eventsNeeded > 1 ? 's' : ''} for a{' '}
              {loyaltyProfile.nextMilestone.bonus}-point bonus
            </p>
          )}

          {/* Available Rewards */}
          {loyaltyProfile.availableRewards.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-stone-300 mb-2">Available Rewards</h3>
              <div className="space-y-2">
                {loyaltyProfile.availableRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-950 border border-green-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-green-900">{reward.name}</p>
                      <p className="text-xs text-green-700">{reward.points_required} points</p>
                    </div>
                    <RedeemRewardButton clientId={client.id} reward={reward} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Award Bonus Points + Manual Adjustment */}
          <div className="flex gap-2 flex-wrap">
            <AwardBonusForm clientId={client.id} />
            <ManualLoyaltyAdjustment
              clientId={client.id}
              currentPoints={loyaltyProfile.pointsBalance}
              currentTier={loyaltyProfile.currentTier}
              currentEventsCompleted={loyaltyProfile.totalEventsCompleted}
              currentGuestsServed={loyaltyProfile.totalGuestsServed}
            />
          </div>

          {/* Recent Transactions */}
          {loyaltyProfile.transactionHistory.length > 0 && (
            <div className="mt-4 pt-4 border-t border-stone-800">
              <h3 className="text-sm font-medium text-stone-300 mb-2">Recent Activity</h3>
              <div className="space-y-1">
                {loyaltyProfile.transactionHistory.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-stone-300">{tx.description}</span>
                    <span
                      className={`font-medium ${tx.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}
                    >
                      {tx.points > 0 ? '+' : ''}
                      {tx.points}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Personal Details (nickname, partner, family) */}
      <PersonalInfoEditor
        clientId={client.id}
        chefId={chefUser.entityId}
        initialData={{
          preferred_name: (client as any).preferred_name ?? null,
          partner_name: (client as any).partner_name ?? null,
          partner_preferred_name: (client as any).partner_preferred_name ?? null,
          family_notes: (client as any).family_notes ?? null,
        }}
      />

      {/* Country Details - currency, timezone, languages for international clients */}
      <ClientCountryPanel />

      {/* Pets */}
      <PetManager
        clientId={client.id}
        initialPets={
          ((client as any).pets as Array<{ name: string; type: string; notes?: string }>) ?? []
        }
      />

      {/* Client Photos */}
      <ClientPhotoGallery clientId={client.id} initialPhotos={clientPhotos as any} />

      {/* Kitchen Profile */}
      <KitchenProfilePanel
        clientId={client.id}
        initialData={{
          kitchen_size: (client as any).kitchen_size ?? null,
          kitchen_constraints: (client as any).kitchen_constraints ?? null,
          kitchen_oven_notes: (client as any).kitchen_oven_notes ?? null,
          kitchen_burner_notes: (client as any).kitchen_burner_notes ?? null,
          kitchen_counter_notes: (client as any).kitchen_counter_notes ?? null,
          kitchen_refrigeration_notes: (client as any).kitchen_refrigeration_notes ?? null,
          kitchen_plating_notes: (client as any).kitchen_plating_notes ?? null,
          kitchen_sink_notes: (client as any).kitchen_sink_notes ?? null,
          equipment_available: (client as any).equipment_available ?? null,
          equipment_must_bring: (client as any).equipment_must_bring ?? null,
          kitchen_profile_updated_at: (client as any).kitchen_profile_updated_at ?? null,
          has_dishwasher: (client as any).has_dishwasher ?? null,
          outdoor_cooking_notes: (client as any).outdoor_cooking_notes ?? null,
          nearest_grocery_store: (client as any).nearest_grocery_store ?? null,
          water_quality_notes: (client as any).water_quality_notes ?? null,
          available_place_settings: (client as any).available_place_settings ?? null,
        }}
      />

      {/* Security & Access */}
      <SecurityAccessPanel
        clientId={client.id}
        gateCode={(client as any).gate_code ?? null}
        wifiPassword={(client as any).wifi_password ?? null}
        securityNotes={(client as any).security_notes ?? null}
        parkingInstructions={(client as any).parking_instructions ?? null}
        accessInstructions={(client as any).access_instructions ?? null}
        houseRules={(client as any).house_rules ?? null}
      />

      {/* Service Defaults */}
      <ServiceDefaultsPanel
        clientId={client.id}
        preferredServiceStyle={(client as any).preferred_service_style ?? null}
        typicalGuestCount={(client as any).typical_guest_count ?? null}
        preferredEventDays={(client as any).preferred_event_days ?? null}
        budgetRangeMinCents={(client as any).budget_range_min_cents ?? null}
        budgetRangeMaxCents={(client as any).budget_range_max_cents ?? null}
        recurringPricingModel={(client as any).recurring_pricing_model ?? null}
        recurringPriceCents={(client as any).recurring_price_cents ?? null}
        recurringPricingNotes={(client as any).recurring_pricing_notes ?? null}
        cleanupExpectations={(client as any).cleanup_expectations ?? null}
        leftoversPref={(client as any).leftovers_preference ?? null}
      />

      {/* Client Connections */}
      <ClientConnections
        clientId={client.id}
        connections={connections}
        allClients={allClients.map((c: any) => ({
          id: c.id,
          full_name: c.full_name,
          email: c.email,
        }))}
      />

      {/* Fun Q&A - client's personality answers */}
      <FunQADisplay answers={funQAAnswers} clientName={client.full_name} />

      {/* Allergy & Dietary Records */}
      <AllergyRecordsPanel clientId={client.id} initialRecords={allergyRecords as any} />

      {/* Household Members */}
      {householdData && <ClientHouseholdPanel clientId={client.id} household={householdData} />}

      {/* Taste Profile */}
      <WidgetErrorBoundary name="Taste Profile" compact>
        <Card>
          <CardHeader>
            <CardTitle>Taste Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <TasteProfileForm clientId={client.id} initial={tasteProfile} />
          </CardContent>
        </Card>
      </WidgetErrorBoundary>

      {/* Culinary Profile Intelligence (CP-Engine vector) */}
      {culinaryGuidance && (
        <WidgetErrorBoundary name="Culinary Profile" compact>
          <CulinaryProfilePanel guidance={culinaryGuidance} clientName={client.full_name} />
        </WidgetErrorBoundary>
      )}

      {/* NDA & Photo Permissions */}
      <NDAPanel
        clientId={client.id}
        initial={{
          nda_active: (client as any).nda_active ?? false,
          nda_coverage: (client as any).nda_coverage ?? null,
          nda_effective_date: (client as any).nda_effective_date ?? null,
          nda_expiry_date: (client as any).nda_expiry_date ?? null,
          nda_document_url: (client as any).nda_document_url ?? null,
          photo_permission: (client as any).photo_permission ?? 'none',
        }}
      />

      {/* Quick Notes */}
      <QuickNotes clientId={client.id} initialNotes={clientNotes} />

      {/* Milestones */}
      <MilestoneManager
        clientId={client.id}
        initialMilestones={((client as any).personal_milestones as Milestone[]) ?? []}
      />

      {/* Additional Addresses */}
      <AddressManager
        clientId={client.id}
        initialAddresses={((client as any).additional_addresses as any[]) ?? []}
      />

      {/* Communication History */}
      <Card id="communication">
        <CardHeader>
          <CardTitle>Communication History</CardTitle>
        </CardHeader>
        <CardContent>
          <SentimentBadge clientId={params.id} />
          <MessageThread messages={messages} showEntityLinks />
          <div className="mt-4 pt-4 border-t border-stone-700">
            <MessageLogForm clientId={client.id} templates={templates} />
          </div>
        </CardContent>
      </Card>

      {/* AI Client Preference Panel */}
      <ClientPreferencePanel clientId={params.id} />

      {/* Chef's Internal Assessment */}
      <BusinessIntelPanel
        clientId={client.id}
        referralPotential={(client as any).referral_potential ?? null}
        redFlags={(client as any).red_flags ?? null}
        acquisitionCostCents={(client as any).acquisition_cost_cents ?? null}
        complaintHandling={(client as any).complaint_handling_notes ?? null}
        wowFactors={(client as any).wow_factors ?? null}
        paymentBehavior={(client as any).payment_behavior ?? null}
        tippingPattern={(client as any).tipping_pattern ?? null}
        farewellStyle={(client as any).farewell_style ?? null}
      />

      {/* Private Notes (chef-only, never visible to clients) */}
      <PrivateContextPanel
        entityType="client"
        entityId={params.id}
        contexts={clientPrivateContexts as any[]}
      />

      {/* Unified Client Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Full Relationship Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <UnifiedClientTimeline items={unifiedTimeline} />
        </CardContent>
      </Card>

      {/* Event History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Event History</CardTitle>
            <Link href={`/events/new?client_id=${client.id}`}>
              <Button variant="secondary" size="sm">
                Create Event
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <WidgetErrorBoundary name="Events" compact>
            <Suspense fallback={<div className="text-sm text-stone-500">Loading events...</div>}>
              <ClientEventsContent clientId={client.id} />
            </Suspense>
          </WidgetErrorBoundary>
        </CardContent>
      </Card>

      {/* Menu History */}
      <Card>
        <CardHeader>
          <CardTitle>Menu History</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientMenuHistory clientId={client.id} />
        </CardContent>
      </Card>

      {/* Client Reviews / Feedback */}
      {clientReviews.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Client Feedback</CardTitle>
              {avgRating !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-stone-100">{avgRating}</span>
                  <span className="text-stone-300">/5</span>
                  <span className="text-xs text-stone-500 ml-1">
                    ({clientReviews.length} {clientReviews.length === 1 ? 'review' : 'reviews'})
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientReviews.map((review: any) => (
                <div
                  key={review.id}
                  className="border-b border-stone-800 pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          className={n <= review.rating ? 'text-amber-400' : 'text-stone-200'}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-stone-300">
                      {review.event?.occasion || 'Event'} ·{' '}
                      {review.event?.event_date
                        ? format(new Date(review.event.event_date), 'MMM d, yyyy')
                        : ''}
                    </span>
                  </div>
                  {review.what_they_loved && (
                    <p className="text-sm text-stone-300 mt-1">
                      <span className="font-medium text-emerald-700">Loved: </span>
                      {review.what_they_loved}
                    </p>
                  )}
                  {review.feedback_text && (
                    <p className="text-sm text-stone-300 mt-1">{review.feedback_text}</p>
                  )}
                  {review.what_could_improve && (
                    <p className="text-sm text-stone-300 mt-1">
                      <span className="font-medium text-amber-700">Improve: </span>
                      {review.what_could_improve}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

async function DuplicatesSection({
  clientId,
  clientName,
}: {
  clientId: string
  clientName: string
}) {
  const matches = await findPotentialClientMatches(clientId)
  return <PotentialDuplicatesCard clientId={clientId} clientName={clientName} matches={matches} />
}

async function ClientEventsContent({ clientId }: { clientId: string }) {
  let events: Awaited<ReturnType<typeof getClientEvents>> = []
  try {
    events = await getClientEvents(clientId)
  } catch {
    return (
      <div className="text-center py-8 text-stone-500">
        <p className="text-sm">Could not load events. Refresh to try again.</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        <p className="text-lg mb-2">No events yet for this client</p>
        <Link href={`/events/new?client_id=${clientId}`}>
          <Button>Create First Event</Button>
        </Link>
      </div>
    )
  }

  return <ClientEventsTable events={events} />
}
