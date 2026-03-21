// Loyalty Approaching Widget - clients close to earning rewards

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from '@/components/ui/icons'

interface ApproachingClient {
  clientId: string
  clientName: string
  currentPoints: number
  tier: string
  approachingRewards: Array<{
    rewardName: string
    pointsNeeded: number
    guestsNeeded: number
  }>
}

interface Props {
  clients: ApproachingClient[]
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'text-amber-600',
  silver: 'text-stone-400',
  gold: 'text-yellow-400',
  platinum: 'text-brand-300',
}

export function LoyaltyApproachingWidget({ clients }: Props) {
  if (clients.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Loyalty Rewards</CardTitle>
          <Link
            href="/clients/loyalty"
            className="inline-flex items-center gap-1 text-sm text-brand-500 hover:text-brand-400"
          >
            Loyalty <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <p className="text-xs text-stone-500 mt-0.5">
          {clients.length} client{clients.length !== 1 ? 's' : ''} approaching rewards
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {clients.slice(0, 5).map((client) => (
            <li key={client.clientId}>
              <Link
                href={`/clients/${client.clientId}`}
                className="block rounded-md px-2 py-2 hover:bg-stone-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-stone-200">{client.clientName}</p>
                  <span
                    className={`text-xs font-medium capitalize ${TIER_COLORS[client.tier] || 'text-stone-400'}`}
                  >
                    {client.tier}
                  </span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">{client.currentPoints} pts</p>
                {client.approachingRewards.slice(0, 1).map((reward) => (
                  <p key={reward.rewardName} className="text-xs text-brand-400 mt-0.5">
                    {reward.pointsNeeded} pts to {reward.rewardName} (~{reward.guestsNeeded} event
                    {reward.guestsNeeded !== 1 ? 's' : ''})
                  </p>
                ))}
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
