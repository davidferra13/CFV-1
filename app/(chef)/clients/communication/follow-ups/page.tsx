import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Client Follow-Ups' }

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

function urgencyLabel(days: number): { label: string; style: string } {
  if (days > 180) return { label: 'Overdue', style: 'bg-red-900 text-red-700' }
  if (days > 90) return { label: 'At Risk', style: 'bg-amber-900 text-amber-700' }
  return { label: 'Check In', style: 'bg-brand-900 text-brand-700' }
}

export default async function FollowUpsPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const now = Date.now()

  // Clients worth following up with: had at least one event, last event > 30 days ago
  const followUpCandidates = clients
    .filter(
      (c: any) =>
        (c.totalEvents ?? 0) > 0 &&
        c.lastEventDate &&
        now - new Date(c.lastEventDate).getTime() > THIRTY_DAYS_MS
    )
    .sort(
      (a: any, b: any) =>
        new Date(a.lastEventDate!).getTime() - new Date(b.lastEventDate!).getTime()
    )

  const overdue = followUpCandidates.filter((c: any) => daysSince(c.lastEventDate!) > 180).length
  const atRisk = followUpCandidates.filter((c: any) => {
    const d = daysSince(c.lastEventDate!)
    return d > 90 && d <= 180
  }).length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/communication" className="text-sm text-stone-500 hover:text-stone-300">
          ← Communication
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Follow-Ups</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {followUpCandidates.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Past clients worth reaching out to - sorted by time since last event
        </p>
      </div>

      {followUpCandidates.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-red-600">{overdue}</p>
            <p className="text-sm text-stone-500 mt-1">Overdue (180+ days)</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-700">{atRisk}</p>
            <p className="text-sm text-stone-500 mt-1">At risk (90–180 days)</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-brand-700">
              {followUpCandidates.length - overdue - atRisk}
            </p>
            <p className="text-sm text-stone-500 mt-1">Check in (30–90 days)</p>
          </Card>
        </div>
      )}

      {followUpCandidates.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No follow-ups needed right now</p>
          <p className="text-stone-400 text-sm">
            Clients with completed events will appear here after 30 days of inactivity
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Last Event</TableHead>
                <TableHead>Days Since</TableHead>
                <TableHead>Total Events</TableHead>
                <TableHead>Lifetime Spend</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {followUpCandidates.map((client: any) => {
                const days = daysSince(client.lastEventDate!)
                const urgency = urgencyLabel(days)
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${client.id}`}
                        className="text-brand-600 hover:text-brand-300 hover:underline"
                      >
                        {client.full_name}
                      </Link>
                      {client.email && (
                        <p className="text-xs text-stone-400 mt-0.5">{client.email}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {new Date(client.lastEventDate!).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">{days} days</TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {client.totalEvents ?? 0}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {(client.totalSpentCents ?? 0) > 0
                        ? formatCurrency(client.totalSpentCents ?? 0)
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${urgency.style}`}
                      >
                        {urgency.label}
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
