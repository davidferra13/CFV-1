import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Client Loyalty - ChefFlow' }

const TIER_STYLES: Record<string, string> = {
  bronze: 'bg-amber-900 text-amber-200',
  silver: 'bg-stone-700 text-stone-300',
  gold: 'bg-yellow-900 text-yellow-200',
  platinum: 'bg-sky-900 text-sky-200',
}

const VIEWS = [
  {
    href: '/clients/loyalty/points',
    label: 'Points',
    description: 'Point balances and earning history per client',
    icon: '⭐',
  },
  {
    href: '/clients/loyalty/rewards',
    label: 'Rewards',
    description: 'Available and redeemed rewards across your clientele',
    icon: '🎁',
  },
]

export default async function ClientLoyaltyPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const tiers = { bronze: 0, silver: 0, gold: 0, platinum: 0, none: 0 }
  let totalPoints = 0

  for (const client of clients) {
    const tier = client.loyalty_tier as string | null
    if (tier && tier in tiers) {
      tiers[tier as keyof typeof tiers]++
    } else {
      tiers.none++
    }
    totalPoints += (client.loyalty_points as number | null) ?? 0
  }

  const enrolledCount = clients.length - tiers.none

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients" className="text-sm text-stone-500 hover:text-stone-300">
          ← Clients
        </Link>
        <h1 className="text-3xl font-bold text-stone-100 mt-1">Loyalty Program</h1>
        <p className="text-stone-500 mt-1">
          Points, rewards, and tier status across your clientele
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{enrolledCount}</p>
          <p className="text-sm text-stone-500 mt-1">Clients enrolled</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-200">{totalPoints.toLocaleString()}</p>
          <p className="text-sm text-stone-500 mt-1">Total points outstanding</p>
        </Card>
        <Card className="p-4">
          <div className="flex gap-2 flex-wrap">
            {Object.entries(tiers)
              .filter(([tier, count]) => tier !== 'none' && count > 0)
              .map(([tier, count]) => (
                <span
                  key={tier}
                  className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${TIER_STYLES[tier] ?? 'bg-stone-800 text-stone-400'}`}
                >
                  {count} {tier}
                </span>
              ))}
          </div>
          <p className="text-sm text-stone-500 mt-2">Tier distribution</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VIEWS.map((view) => (
          <Link key={view.href} href={view.href}>
            <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
              <div className="text-2xl mb-2">{view.icon}</div>
              <h2 className="font-semibold text-stone-100">{view.label}</h2>
              <p className="text-sm text-stone-500 mt-1">{view.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
