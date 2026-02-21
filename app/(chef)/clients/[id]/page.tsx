// Chef Client Detail Page
// Shows client information, statistics, and event history

import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getClientWithStats, getClientEvents, getClientFinancialDetail } from '@/lib/clients/actions'
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

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-stone-200 text-stone-800',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-purple-100 text-purple-800',
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

  const [client, messages, templates, loyaltyProfile, clientNotes, connections, allClients, chefActivity, clientPortalActivity, financialDetail, funQAAnswers, allergyRecords, outreachHistory, dormancyInfo, allReviews, profitabilityHistory, ltvTrajectory, menuHistory, healthScore, unifiedTimeline, clientTags, allUsedTags, clientNBA, portalTokenData] = await Promise.all([
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
  ])

  const clientReviews = allReviews.filter((r: any) => r.client?.id === params.id)
  const avgRating = clientReviews.length > 0
    ? parseFloat((clientReviews.reduce((s: number, r: any) => s + r.rating, 0) / clientReviews.length).toFixed(1))
    : null

  if (!client) {
    notFound()
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link href="/clients" className="text-sm text-brand-600 hover:text-brand-700 mb-2 inline-block">
            ← Back to Clients
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">{client.full_name}</h1>
            <ClientStatusBadge
              clientId={client.id}
              initialStatus={(client as any).status ?? 'active'}
            />
            {healthScore && (
              <ClientHealthBadge score={healthScore.score} tier={healthScore.tier} />
            )}
            {healthScore && (
              <RelationshipStrengthBadge tier={healthScore.tier} score={healthScore.score} showScore />
            )}
          </div>
          <p className="text-stone-600 mt-1">{client.email}</p>
          {/* Tags */}
          <div className="mt-2">
            <ClientTags
              clientId={client.id}
              initialTags={clientTags}
              suggestedTags={allUsedTags}
            />
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
        <Link href={`/events/new?client_id=${client.id}`}>
          <Button>Create Event for Client</Button>
        </Link>
      </div>

      {/* Dormancy Warning */}
      {dormancyInfo?.isDormant && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-amber-600 text-lg">⏳</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">No events in {dormancyInfo.daysSinceLastEvent ?? 180}+ days</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Last event: {dormancyInfo.lastEventDate
                ? format(new Date(dormancyInfo.lastEventDate), 'MMMM d, yyyy')
                : 'None recorded'}. Consider reaching out to re-engage.
            </p>
          </div>
          <Link href={`/clients/${client.id}#outreach`} className="text-xs font-medium text-amber-800 underline shrink-0">
            Send Message
          </Link>
        </div>
      )}

      {/* Next Best Action */}
      {clientNBA && clientNBA.actionType !== 'none' && (
        <NextBestActionCard action={clientNBA} />
      )}

      {/* Profile Completeness Meter */}
      {(() => {
        const completeness = getClientProfileCompleteness(client as any)
        if (completeness.score >= 85) return null // Don't show when complete
        return (
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-stone-700">Profile completeness</p>
              <span className={`text-xs font-semibold ${
                completeness.tier === 'good' ? 'text-emerald-600' :
                completeness.tier === 'basic' ? 'text-amber-600' :
                'text-red-600'
              }`}>{completeness.score}%</span>
            </div>
            <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  completeness.score >= 60 ? 'bg-emerald-500' :
                  completeness.score >= 35 ? 'bg-amber-500' :
                  'bg-red-500'
                } ${
                  completeness.score >= 90 ? 'w-full' :
                  completeness.score >= 80 ? 'w-4/5' :
                  completeness.score >= 70 ? 'w-3/4' :
                  completeness.score >= 60 ? 'w-3/5' :
                  completeness.score >= 50 ? 'w-1/2' :
                  completeness.score >= 40 ? 'w-2/5' :
                  completeness.score >= 30 ? 'w-1/3' :
                  completeness.score >= 20 ? 'w-1/4' :
                  'w-1/5'
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
              <p className="text-lg text-stone-900 mt-1">{client.full_name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Email</p>
              <p className="text-lg text-stone-900 mt-1">{client.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Phone</p>
              <p className="text-lg text-stone-900 mt-1">{client.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-stone-500">Client Since</p>
              <p className="text-lg text-stone-900 mt-1">
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

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Total Events</div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-900 mt-2">{client.totalEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Completed Events</div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-900 mt-2">{client.completedEvents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Total Spent</div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-900 mt-2">
              {formatCurrency(client.totalSpentCents)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-stone-500">Average Event Value</div>
            <div className="text-2xl sm:text-3xl font-bold text-stone-900 mt-2">
              {formatCurrency(client.averageEventValueCents)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Profitability History */}
      {profitabilityHistory && profitabilityHistory.eventCount > 0 && profitabilityHistory.avgMarginPercent !== null && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Profitability with {client.full_name.split(' ')[0]}</CardTitle>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                profitabilityHistory.trend === 'improving' ? 'bg-emerald-100 text-emerald-700' :
                profitabilityHistory.trend === 'declining' ? 'bg-red-100 text-red-700' :
                profitabilityHistory.trend === 'stable' ? 'bg-stone-100 text-stone-600' :
                'bg-stone-50 text-stone-400'
              }`}>
                {profitabilityHistory.trend === 'improving' ? '↑ Improving' :
                 profitabilityHistory.trend === 'declining' ? '↓ Declining' :
                 profitabilityHistory.trend === 'stable' ? '→ Stable' :
                 'Early days'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-stone-500">Avg Margin</p>
                <p className={`text-xl font-bold mt-0.5 ${
                  profitabilityHistory.avgMarginPercent >= 40 ? 'text-emerald-600' :
                  profitabilityHistory.avgMarginPercent >= 20 ? 'text-amber-600' :
                  'text-red-600'
                }`}>{profitabilityHistory.avgMarginPercent}%</p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Avg Food Cost</p>
                <p className="text-xl font-bold text-stone-900 mt-0.5">
                  {profitabilityHistory.avgFoodCostPercent !== null ? `${profitabilityHistory.avgFoodCostPercent}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-sm text-stone-500">Avg $/hr</p>
                <p className="text-xl font-bold text-stone-900 mt-0.5">
                  {profitabilityHistory.avgHourlyRateCents !== null
                    ? `${formatCurrency(profitabilityHistory.avgHourlyRateCents)}`
                    : '—'}
                </p>
              </div>
            </div>
            {profitabilityHistory.events.length >= 3 && (
              <div className="mt-4 pt-3 border-t border-stone-100">
                <p className="text-xs text-stone-400 mb-2">Per-event margins ({profitabilityHistory.eventCount} events)</p>
                <div className="flex gap-1 items-end h-8">
                  {profitabilityHistory.events.slice(-8).map((e) => {
                    const heightClass =
                      e.marginPercent >= 70 ? 'h-8' :
                      e.marginPercent >= 60 ? 'h-7' :
                      e.marginPercent >= 50 ? 'h-6' :
                      e.marginPercent >= 40 ? 'h-5' :
                      e.marginPercent >= 30 ? 'h-4' :
                      e.marginPercent >= 20 ? 'h-3' :
                      e.marginPercent >= 10 ? 'h-2' : 'h-1'
                    const color = e.marginPercent >= 40 ? 'bg-emerald-400' : e.marginPercent >= 20 ? 'bg-amber-400' : 'bg-red-400'
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
      {menuHistory && (
        <MenuHistoryPanel history={menuHistory} />
      )}

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
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${TIER_COLORS[loyaltyProfile.currentTier]}`}>
              {TIER_LABELS[loyaltyProfile.currentTier]}
            </span>
          </div>

          {/* Loyalty Stats */}
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <dt className="text-sm font-medium text-stone-500">Points Balance</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">{loyaltyProfile.pointsBalance.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Lifetime Earned</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">{loyaltyProfile.lifetimePointsEarned.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Events Completed</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">{loyaltyProfile.totalEventsCompleted}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-stone-500">Guests Served</dt>
              <dd className="text-xl sm:text-2xl font-bold text-stone-900 mt-1">{loyaltyProfile.totalGuestsServed}</dd>
            </div>
          </dl>

          {/* Progress to Next Tier */}
          {loyaltyProfile.nextTierName && loyaltyProfile.pointsToNextTier > 0 && (
            <div className="mb-6 p-3 rounded-lg bg-stone-50">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-stone-600">Progress to {loyaltyProfile.nextTierName}</span>
                <span className="font-medium text-stone-900">{loyaltyProfile.pointsToNextTier} pts to go</span>
              </div>
              <div className="w-full bg-stone-200 rounded-full h-2">
                <div
                  className="bg-brand-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, Math.max(5, ((loyaltyProfile.lifetimePointsEarned) / (loyaltyProfile.lifetimePointsEarned + loyaltyProfile.pointsToNextTier)) * 100))}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Next Milestone */}
          {loyaltyProfile.nextMilestone && (
            <p className="text-sm text-stone-500 mb-4">
              Next milestone: {loyaltyProfile.nextMilestone.eventsNeeded} more event{loyaltyProfile.nextMilestone.eventsNeeded > 1 ? 's' : ''} for a {loyaltyProfile.nextMilestone.bonus}-point bonus
            </p>
          )}

          {/* Available Rewards */}
          {loyaltyProfile.availableRewards.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-medium text-stone-700 mb-2">Available Rewards</h3>
              <div className="space-y-2">
                {loyaltyProfile.availableRewards.map((reward) => (
                  <div key={reward.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-50 border border-green-100">
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
            <div className="mt-4 pt-4 border-t border-stone-100">
              <h3 className="text-sm font-medium text-stone-700 mb-2">Recent Activity</h3>
              <div className="space-y-1">
                {loyaltyProfile.transactionHistory.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm py-1">
                    <span className="text-stone-600">{tx.description}</span>
                    <span className={`font-medium ${tx.points > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.points > 0 ? '+' : ''}{tx.points}
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

      {/* Client Connections */}
      <ClientConnections
        clientId={client.id}
        connections={connections}
        allClients={allClients.map((c) => ({ id: c.id, full_name: c.full_name, email: c.email }))}
      />

      {/* Fun Q&A — client's personality answers */}
      <FunQADisplay answers={funQAAnswers} clientName={client.full_name} />

      {/* Allergy & Dietary Records */}
      <AllergyRecordsPanel
        clientId={client.id}
        initialRecords={allergyRecords as any}
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
          <div className="mt-4 pt-4 border-t border-stone-200">
            <MessageLogForm
              clientId={client.id}
              templates={templates}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Client Preference Panel */}
      <ClientPreferencePanel clientId={params.id} />

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
                  <span className="text-2xl font-bold text-stone-900">{avgRating}</span>
                  <span className="text-stone-400">/5</span>
                  <span className="text-xs text-stone-500 ml-1">({clientReviews.length} {clientReviews.length === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {clientReviews.map((review: any) => (
                <div key={review.id} className="border-b border-stone-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => (
                        <span key={n} className={n <= review.rating ? 'text-amber-400' : 'text-stone-200'}>★</span>
                      ))}
                    </div>
                    <span className="text-xs text-stone-400">
                      {review.event?.occasion || 'Event'} · {review.event?.event_date ? format(new Date(review.event.event_date), 'MMM d, yyyy') : ''}
                    </span>
                  </div>
                  {review.what_they_loved && (
                    <p className="text-sm text-stone-700 mt-1">
                      <span className="font-medium text-emerald-700">Loved: </span>{review.what_they_loved}
                    </p>
                  )}
                  {review.feedback_text && (
                    <p className="text-sm text-stone-600 mt-1">{review.feedback_text}</p>
                  )}
                  {review.what_could_improve && (
                    <p className="text-sm text-stone-600 mt-1">
                      <span className="font-medium text-amber-700">Improve: </span>{review.what_could_improve}
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
