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

export const metadata: Metadata = { title: 'Top Clients' }

export default async function TopClientsPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const ranked = [...clients]
    .filter((c) => (c.totalSpentCents ?? 0) > 0)
    .sort((a, b) => (b.totalSpentCents ?? 0) - (a.totalSpentCents ?? 0))

  const totalRevenue = ranked.reduce((sum, c) => sum + (c.totalSpentCents ?? 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/insights" className="text-sm text-stone-500 hover:text-stone-300">
          ← Client Insights
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Top Clients</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {ranked.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Clients ranked by total lifetime spend</p>
      </div>

      {ranked.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No revenue data yet</p>
          <p className="text-stone-400 text-sm">
            Top clients will appear here once payments are recorded
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Lifetime Spend</TableHead>
                <TableHead>Avg per Event</TableHead>
                <TableHead>Share of Revenue</TableHead>
                <TableHead>Last Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((client, i) => {
                const avgPerEvent =
                  (client.totalEvents ?? 0) > 0
                    ? Math.round((client.totalSpentCents ?? 0) / (client.totalEvents ?? 1))
                    : 0
                const sharePercent =
                  totalRevenue > 0
                    ? (((client.totalSpentCents ?? 0) / totalRevenue) * 100).toFixed(1)
                    : '0'
                return (
                  <TableRow key={client.id}>
                    <TableCell className="text-stone-400 font-mono text-sm">#{i + 1}</TableCell>
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
                      {client.totalEvents ?? 0}
                    </TableCell>
                    <TableCell className="text-stone-100 font-medium text-sm">
                      {formatCurrency(client.totalSpentCents ?? 0)}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {avgPerEvent > 0 ? formatCurrency(avgPerEvent) : '-'}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">{sharePercent}%</TableCell>
                    <TableCell className="text-stone-500 text-sm">
                      {client.lastEventDate
                        ? new Date(client.lastEventDate).toLocaleDateString()
                        : '-'}
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
