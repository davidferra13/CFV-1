// Chef Client Detail Page
// Shows client information, statistics, and event history

import { Suspense } from 'react'
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
import { AwardBonusForm, RedeemRewardButton } from '@/app/(chef)/loyalty/client-loyalty-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ClientEventsTable } from './client-events-table'
import { MilestoneManager } from '@/components/clients/milestone-manager'
import { AddressManager } from '@/components/clients/address-manager'
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
import { getClientFunQA } from '@/lib/clients/client-profile-actions'
import { getClientAllergyRecords } from '@/lib/events/readiness'
import { AllergyRecordsPanel } from '@/components/clients/allergy-records-panel'
import { getClientOutreachHistory } from '@/lib/marketing/actions'
import { DirectOutreachPanel } from '@/components/marketing/direct-outreach-panel'
import { ClientStatusBadge } from '@/components/clients/client-status-badge'
import { getClientDormancyInfo } from '@/lib/clients/actions'
import { getChefReviews } from '@/lib/reviews/actions'
import { getClientProfitabilityHistory } from '@/lib/clients/profitability'
import { getClientProfileCompleteness } from '@/lib/clients/completeness'
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
import { ClientPhotoGallery } from '@/components/clients/client-photo-gallery'
import { getClientPhotos } from '@/lib/clients/photo-actions'
import { KitchenProfilePanel } from '@/components/clients/kitchen-profile-panel'
import { ClientIntelligencePanel } from '@/components/intelligence/client-intelligence-panel'
import { RebookButton } from '@/components/clients/rebook-button'
import { clientHasCompletedEvents } from '@/lib/clients/rebook-actions'

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

interface ClientDetailPageProps {
  params: {
    id: string
  }
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  await requireChef()

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
    hasCompletedEvents,
  ] = await Promise.all([
    getClientWithStats(params.id),
    getMessageThread('client', params.id),
    getResponseTemplates(),
    getClientLoyaltyProfile(params.id).catch(() => null),
    getClientNotes(params.id),
    getClientConnections(params.id),
    getClients(),
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
    getClientPortalToken(params.id).catch(() => ({ token: null, createdAt: null })),
    getClientPhotos(params.id).catch(() => []),
    clientHasCompletedEvents(params.id).catch(() => false),
  ])

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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/clients"
            className="text-sm text-brand-600 hover:text-brand-400 mb-2 inline-block"
          >
            ← Back to Clients
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
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
          </div>
          <p className="text-stone-300 mt-1">{client.email}</p>
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
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {hasCompletedEvents && (
            <RebookButton
              clientId={client.id}
              clientName={client.full_name}
              variant="secondary"
            />
          )}
          <Link href={`/clients/${client.id}/recurring`}>
            <Button variant="secondary">Recurring Planning</Button>
          </Link>
          <Link href={`/events/new?client_id=${client.id}`}>
            <Button>Create Event for Client</Button>
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
          <div className="flex items-center gap-2 shrink-0">
            {hasCompletedEvents && (
              <RebookButton
                clientId={client.id}
                clientName={client.full_name}
                variant="secondary"
                size="sm"
              />
            )}
            <Link
              href={`/clients/${client.id}#outreach`}
              className="text-xs font-medium text-amber-800 underline shrink-0"
            >
              Send Message
            </Link>
          </div>
        </div>
      )}

      {/* Next Best Action */}
      {clientNBA && clientNBA.actionType !== 'none' && <NextBestActionCard action={clientNBA} />}

      {/* Relationship Intelligence */}
      <Suspense fallback={null}>
        <ClientIntelligencePanel clientId={client.id} />
      </Suspense>

      {/* Profile Completeness Meter */}
      {(() => {
        const completeness = getClientProfileCompleteness(client as any)
        if (completeness.score >= 85) return null // Don't show when complete
        return (
          <div className="rounded-lg border border-stone-700 bg-stone-800 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-stone-300">Profile completeness</p>
              <span
                className={`text-xs font-semibold ${
                  completeness.tier === 'good'
                    ? 'text-emerald-600'
                    : completeness.tier === 'basic'
                      ? 'text-amber-600'
                      : 'text-red-600'
                }`}
              >
                {completeness.score}%
              </span>
            </div>
            <div className="h-1.5 bg-stone-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  completeness.score >= 60
                    ? 'bg-emerald-500'
                    : completeness.score >= 35
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                } ${
                  completeness.score >= 90
                    ? 'w-full'
                    : completeness.score >= 80
                      ? 'w-4/5'
                      : completeness.score >= 70
                        ? 'w-3/4'
                        : completeness.score >= 60
                          ? 'w-3/5'
                          : completeness.score >= 50
                            ? 'w-1/2'
                            : completeness.score >= 40
                              ? 'w-2/5'
                              : completeness.score >= 30
                                ? 'w-1/3'
                                : completeness.score >= 20
                                  ? 'w-1/4'
                                  : 'w-1/5'
                }`}
              />
            </div>
            {completeness.missing.length > 0 && (
              <p className="text-xs text-stone-500 mt-1.5">
                Missing: {completeness.missing.join(', ')}
              </p>
            )}
          </div>
        )
      })()}

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
              <p className="text-lg text-stone-100 mt-1">{client.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Phone</p>
              <p className="text-lg text-stone-100 mt-1">{client.phone || 'Not provided'}</p>
            </div>
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
              <div className="grid grid-cols-3 gap-4">
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
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-stone-500">Avg $/hr</p>
                  <p className="text-xl font-bold text-stone-100 mt-0.5">
                    {profitabilityHistory.avgHourlyRateCents !== null
                      ? `${formatCurrency(profitabilityHistory.avgHourlyRateCents)}`
                      : '—'}
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
                          title={`${e.occasion || 'Event'} — ${e.marginPercent}% margin`}
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

      {/* Culinary History — menus/dishes served to this client */}
      {menuHistory && <MenuHistoryPanel history={menuHistory} />}

      {/* Direct Outreach */}
      <Card>
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

          {/* Award Bonus Points */}
          <AwardBonusForm clientId={client.id} />

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
        initialData={{
          preferred_name: (client as any).preferred_name ?? null,
          partner_name: (client as any).partner_name ?? null,
          partner_preferred_name: (client as any).partner_preferred_name ?? null,
          family_notes: (client as any).family_notes ?? null,
        }}
      />

      {/* Country Details — currency, timezone, languages for international clients */}
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

      {/* Fun Q&A — client's personality answers */}
      <FunQADisplay answers={funQAAnswers} clientName={client.full_name} />

      {/* Allergy & Dietary Records */}
      <AllergyRecordsPanel clientId={client.id} initialRecords={allergyRecords as any} />

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
      <Card>
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
          <Suspense fallback={<div className="text-sm text-stone-500">Loading events...</div>}>
            <ClientEventsContent clientId={client.id} />
          </Suspense>
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

async function ClientEventsContent({ clientId }: { clientId: string }) {
  const events = await getClientEvents(clientId)

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
