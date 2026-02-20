import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClients } from '@/lib/clients/actions'
import { getEvents } from '@/lib/events/actions'
import { Card } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Referrals - ChefFlow' }

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Word of mouth / referral',
  instagram: 'Instagram',
  website: 'Website',
  take_a_chef: 'TakeAChef',
  phone: 'Phone call',
  email: 'Email',
  other: 'Other',
}

const SOURCE_COLORS: Record<string, string> = {
  referral: 'bg-green-100 text-green-700',
  instagram: 'bg-pink-100 text-pink-700',
  website: 'bg-blue-100 text-blue-700',
  take_a_chef: 'bg-amber-100 text-amber-700',
  phone: 'bg-stone-100 text-stone-600',
  email: 'bg-stone-100 text-stone-600',
  other: 'bg-stone-100 text-stone-500',
}

export default async function ReferralsPage() {
  await requireChef()
  const [clients, events] = await Promise.all([
    getClients(),
    getEvents(),
  ])

  // Clients who came via referral
  const referralClients = clients.filter(c => c.referral_source === 'referral')

  // Map referrer name → clients they referred
  const referrerMap = new Map<string, typeof clients>()
  for (const client of referralClients) {
    if (!client.referral_source_detail) continue
    const name = client.referral_source_detail
    if (!referrerMap.has(name)) referrerMap.set(name, [])
    referrerMap.get(name)!.push(client)
  }

  // Source breakdown for all clients
  const sourceBreakdown = new Map<string, number>()
  for (const client of clients) {
    const src = client.referral_source ?? 'other'
    sourceBreakdown.set(src, (sourceBreakdown.get(src) ?? 0) + 1)
  }
  const sortedSources = Array.from(sourceBreakdown.entries())
    .sort((a, b) => b[1] - a[1])

  // Events from referral clients
  const referralClientIds = new Set(referralClients.map(c => c.id))
  const referralEvents = events.filter(e => referralClientIds.has(e.client_id ?? ''))
  const referralRevenueCents = referralEvents
    .filter(e => ['paid', 'confirmed', 'in_progress', 'completed'].includes(e.status))
    .reduce((s, e) => s + (e.quoted_price_cents ?? 0), 0)

  // Sort referrers by number of clients sent
  const referrers = Array.from(referrerMap.entries())
    .sort((a, b) => b[1].length - a[1].length)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/loyalty" className="text-sm text-stone-500 hover:text-stone-700">← Loyalty</Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">Referrals</h1>
          <span className="bg-green-100 text-green-700 text-sm px-2 py-0.5 rounded-full">
            {referralClients.length} referred clients
          </span>
        </div>
        <p className="text-stone-500 mt-1">Clients who found you through word of mouth, and who referred them</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{referralClients.length}</p>
          <p className="text-sm text-stone-500 mt-1">Referral clients</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {clients.length > 0
              ? `${Math.round((referralClients.length / clients.length) * 100)}% of all clients`
              : '—'}
          </p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">{referrers.length}</p>
          <p className="text-sm text-stone-500 mt-1">Named referrers</p>
          <p className="text-xs text-stone-400 mt-0.5">Clients who actively sent others</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-stone-900">
            {referralRevenueCents > 0 ? `$${(referralRevenueCents / 100).toLocaleString()}` : '—'}
          </p>
          <p className="text-sm text-stone-500 mt-1">Revenue from referrals</p>
        </Card>
      </div>

      {/* Source breakdown */}
      <div>
        <h2 className="text-base font-semibold text-stone-700 mb-3">How clients find you</h2>
        <Card className="p-4">
          <div className="space-y-3">
            {sortedSources.map(([source, count]) => {
              const pct = clients.length > 0 ? (count / clients.length) * 100 : 0
              return (
                <div key={source} className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full w-40 text-center shrink-0 ${SOURCE_COLORS[source] ?? 'bg-stone-100 text-stone-500'}`}>
                    {SOURCE_LABELS[source] ?? source}
                  </span>
                  <div className="flex-1 text-xs text-stone-400">{pct.toFixed(0)}%</div>
                  <span className="text-sm text-stone-700 w-16 text-right shrink-0">
                    {count} client{count !== 1 ? 's' : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Referrers */}
      {referrers.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-stone-700 mb-3">Your top referrers</h2>
          <div className="space-y-3">
            {referrers.map(([referrerName, referred]) => (
              <Card key={referrerName} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900">{referrerName}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {referred.length} client{referred.length !== 1 ? 's' : ''} referred
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {referred.map(c => (
                        <Link key={c.id} href={`/clients/${c.id}`}>
                          <span className="text-xs bg-stone-100 text-stone-700 hover:bg-stone-200 px-2 py-1 rounded-full cursor-pointer">
                            {c.full_name}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Referral clients with no named referrer */}
      {referralClients.filter(c => !c.referral_source_detail).length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-stone-700 mb-2">
            Referred (referrer not named)
          </h2>
          <Card className="p-4">
            <div className="flex flex-wrap gap-2">
              {referralClients
                .filter(c => !c.referral_source_detail)
                .map(c => (
                  <Link key={c.id} href={`/clients/${c.id}`}>
                    <span className="text-xs bg-stone-100 text-stone-700 hover:bg-stone-200 px-2 py-1 rounded-full cursor-pointer">
                      {c.full_name}
                    </span>
                  </Link>
                ))}
            </div>
          </Card>
        </div>
      )}

      {clients.length === 0 && (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium">No clients yet</p>
          <Link href="/clients/new" className="text-brand-600 hover:underline text-sm mt-3 inline-block">
            Add a client →
          </Link>
        </Card>
      )}
    </div>
  )
}
