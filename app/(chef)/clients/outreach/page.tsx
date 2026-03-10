import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getOutreachCandidates } from '@/lib/outreach/recurring-outreach-actions'
import { getClientsEligibleForReferralAsk } from '@/lib/outreach/referral-sequence-actions'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import { TIER_LABELS, TIER_COLORS } from '@/lib/clients/health-score-utils'
import { OutreachActions } from './outreach-actions'

export const metadata: Metadata = { title: 'Client Outreach - ChefFlow' }

function formatDaysAgo(days: number): string {
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? '1 month ago' : `${months} months ago`
}

export default async function OutreachPage() {
  await requireChef()

  const [candidates, referralEligible] = await Promise.all([
    getOutreachCandidates(),
    getClientsEligibleForReferralAsk(),
  ])

  const highUrgency = candidates.filter((c) => c.urgency === 'high')
  const mediumUrgency = candidates.filter((c) => c.urgency === 'medium')
  const lowUrgency = candidates.filter((c) => c.urgency === 'low')
  const notAskedReferrals = referralEligible.filter((c) => !c.hasBeenAsked)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Clients
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Client Outreach</h1>
        <p className="text-stone-500 mt-1">
          Re-engage at-risk and dormant clients, and request referrals from happy customers
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-stone-500">Total Candidates</p>
          <p className="text-2xl font-bold text-stone-100">{candidates.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-stone-500">High Urgency</p>
          <p className="text-2xl font-bold text-red-400">{highUrgency.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-stone-500">Medium Urgency</p>
          <p className="text-2xl font-bold text-amber-400">{mediumUrgency.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-stone-500">Referral Eligible</p>
          <p className="text-2xl font-bold text-emerald-400">{notAskedReferrals.length}</p>
        </Card>
      </div>

      {/* Referral Eligible Section */}
      {notAskedReferrals.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-stone-200 mb-3">Ready for Referral Ask</h2>
          <p className="text-sm text-stone-500 mb-4">
            These clients had a successful event recently and have not been asked for referrals
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notAskedReferrals.slice(0, 12).map((client) => (
              <Card key={client.clientId} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/clients/${client.clientId}`}
                      className="font-medium text-stone-100 hover:text-brand-400 hover:underline"
                    >
                      {client.clientName}
                    </Link>
                    {client.email && (
                      <p className="text-xs text-stone-500 mt-0.5">{client.email}</p>
                    )}
                  </div>
                  <Badge variant="success">Referral Ready</Badge>
                </div>
                <div className="text-sm text-stone-400 space-y-1">
                  <p>Event: {client.eventOccasion}</p>
                  <p>Completed {client.daysSinceCompletion} days ago</p>
                </div>
                <OutreachActions
                  clientId={client.clientId}
                  clientName={client.clientName}
                  type="referral"
                  eventId={client.eventId}
                />
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* At-Risk / Dormant Sections */}
      {highUrgency.length > 0 && (
        <OutreachSection
          title="High Urgency (6+ months inactive)"
          description="These clients are at serious risk of churning. A personal check-in is recommended."
          candidates={highUrgency}
          urgencyColor="text-red-400"
        />
      )}

      {mediumUrgency.length > 0 && (
        <OutreachSection
          title="Medium Urgency (3-6 months inactive)"
          description="These clients have not booked recently. A seasonal follow-up could re-engage them."
          candidates={mediumUrgency}
          urgencyColor="text-amber-400"
        />
      )}

      {lowUrgency.length > 0 && (
        <OutreachSection
          title="Low Urgency"
          description="These clients show early signs of disengagement."
          candidates={lowUrgency}
          urgencyColor="text-stone-400"
        />
      )}

      {/* Empty State */}
      {candidates.length === 0 && notAskedReferrals.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No outreach needed right now</p>
          <p className="text-stone-500 text-sm">
            All your clients are active and engaged. Check back later.
          </p>
        </Card>
      )}
    </div>
  )
}

// ─── Outreach Section Component ──────────────────────────────────────────

function OutreachSection({
  title,
  description,
  candidates,
  urgencyColor,
}: {
  title: string
  description: string
  candidates: Awaited<ReturnType<typeof getOutreachCandidates>>
  urgencyColor: string
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-xl font-semibold text-stone-200">{title}</h2>
        <span className={`text-sm font-medium ${urgencyColor}`}>{candidates.length}</span>
      </div>
      <p className="text-sm text-stone-500 mb-4">{description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidates.map((candidate) => (
          <Card key={candidate.clientId} className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <Link
                  href={`/clients/${candidate.clientId}`}
                  className="font-medium text-stone-100 hover:text-brand-400 hover:underline"
                >
                  {candidate.clientName}
                </Link>
                {candidate.email && (
                  <p className="text-xs text-stone-500 mt-0.5">{candidate.email}</p>
                )}
              </div>
              <Badge
                variant={
                  candidate.healthTier === 'dormant'
                    ? 'default'
                    : candidate.healthTier === 'at_risk'
                      ? 'warning'
                      : 'info'
                }
              >
                {TIER_LABELS[candidate.healthTier] ?? candidate.healthTier}
              </Badge>
            </div>

            <div className="text-sm text-stone-400 space-y-1">
              <p>Last event: {formatDaysAgo(candidate.daysSinceLastEvent)}</p>
              {candidate.lifetimeValueCents > 0 && (
                <p>Lifetime value: {formatCurrency(candidate.lifetimeValueCents)}</p>
              )}
              {candidate.lastOutreachDate && (
                <p className="text-xs text-stone-600">
                  Last contacted: {new Date(candidate.lastOutreachDate).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Suggested Message Preview */}
            <div className="bg-stone-800/50 rounded-md p-3 text-xs text-stone-400 line-clamp-3">
              {candidate.suggestedMessage}
            </div>

            <OutreachActions
              clientId={candidate.clientId}
              clientName={candidate.clientName}
              type="outreach"
              suggestedMessage={candidate.suggestedMessage}
            />
          </Card>
        ))}
      </div>
    </section>
  )
}
