import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { Card } from '@/components/ui/card'
import { FollowUpsClient } from './follow-ups-client'

export const metadata: Metadata = { title: 'Client Follow-Ups - ChefFlow' }

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default async function FollowUpsPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const now = Date.now()

  const followUpCandidates = clients
    .filter(
      (client: any) =>
        (client.totalEvents ?? 0) > 0 &&
        client.lastEventDate &&
        now - new Date(client.lastEventDate).getTime() > THIRTY_DAYS_MS
    )
    .sort(
      (a: any, b: any) =>
        new Date(a.lastEventDate!).getTime() - new Date(b.lastEventDate!).getTime()
    )

  const overdue = followUpCandidates.filter(
    (client: any) => daysSince(client.lastEventDate!) > 180
  ).length
  const atRisk = followUpCandidates.filter((client: any) => {
    const days = daysSince(client.lastEventDate!)
    return days > 90 && days <= 180
  }).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/communication" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Communication
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-3xl font-bold text-stone-100">Follow-Ups</h1>
          <span className="rounded-full bg-stone-800 px-2 py-0.5 text-sm text-stone-400">
            {followUpCandidates.length}
          </span>
        </div>
        <p className="mt-1 text-stone-500">
          Past clients worth reaching out to, sorted by time since last event
        </p>
      </div>

      {followUpCandidates.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-2xl font-bold text-red-600">{overdue}</p>
            <p className="mt-1 text-sm text-stone-500">Overdue (180+ days)</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-200">{atRisk}</p>
            <p className="mt-1 text-sm text-stone-500">At risk (90-180 days)</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-sky-200">
              {followUpCandidates.length - overdue - atRisk}
            </p>
            <p className="mt-1 text-sm text-stone-500">Check in (30-90 days)</p>
          </Card>
        </div>
      )}

      {followUpCandidates.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="mb-1 font-medium text-stone-400">No follow-ups needed right now</p>
          <p className="text-sm text-stone-400">
            Clients with completed events will appear here after 30 days of inactivity.
          </p>
        </Card>
      ) : (
        <FollowUpsClient clients={followUpCandidates as any} />
      )}
    </div>
  )
}
