// Chef Client Detail Page
// Shows client information, statistics, and event history

import { Suspense } from 'react'
import { requireChef } from '@/lib/auth/get-user'
import { getClientWithStats, getClientEvents } from '@/lib/clients/actions'
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
import { HouseholdManager } from '@/components/households/household-manager'
import { getClientNotes } from '@/lib/notes/actions'
import { getClientHousehold, getHouseholds } from '@/lib/households/actions'
import type { Milestone } from '@/lib/clients/milestones'

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

  const [client, messages, templates, loyaltyProfile, clientNotes, clientHousehold, allHouseholds] = await Promise.all([
    getClientWithStats(params.id),
    getMessageThread('client', params.id),
    getResponseTemplates(),
    getClientLoyaltyProfile(params.id).catch(() => null),
    getClientNotes(params.id),
    getClientHousehold(params.id).catch(() => null),
    getHouseholds().catch(() => []),
  ])

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
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900">{client.full_name}</h1>
          <p className="text-stone-600 mt-1">{client.email}</p>
        </div>
        <Link href={`/events/new?client_id=${client.id}`}>
          <Button>Create Event for Client</Button>
        </Link>
      </div>

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
                    <span className={`font-medium ${tx.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
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

      {/* Household */}
      <HouseholdManager
        clientId={client.id}
        clientName={client.full_name}
        household={clientHousehold}
        allHouseholds={allHouseholds}
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
          <MessageThread messages={messages} showEntityLinks />
          <div className="mt-4 pt-4 border-t border-stone-200">
            <MessageLogForm
              clientId={client.id}
              templates={templates}
            />
          </div>
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
