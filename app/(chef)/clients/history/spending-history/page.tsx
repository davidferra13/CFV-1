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

export const metadata: Metadata = { title: 'Spending History - ChefFlow' }

export default async function SpendingHistoryPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const withSpend = [...clients]
    .filter((c) => (c.totalSpentCents ?? 0) > 0)
    .sort((a, b) => (b.totalSpentCents ?? 0) - (a.totalSpentCents ?? 0))

  const totalRevenue = withSpend.reduce((sum, c) => sum + (c.totalSpentCents ?? 0), 0)
  const avgSpend = withSpend.length > 0 ? Math.round(totalRevenue / withSpend.length) : 0
  const topSpender = withSpend[0]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/history" className="text-sm text-stone-500 hover:text-stone-300">
          ← Client History
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Spending History</h1>
          <span className="bg-stone-800 text-stone-400 text-sm px-2 py-0.5 rounded-full">
            {withSpend.length} clients
          </span>
        </div>
        <p className="text-stone-500 mt-1">Lifetime spend per client with event breakdown</p>
      </div>

      {withSpend.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-stone-500 mt-1">Total lifetime revenue</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-green-700">{formatCurrency(avgSpend)}</p>
            <p className="text-sm text-stone-500 mt-1">Average per client</p>
          </Card>
          <Card className="p-4">
            {topSpender && (
              <>
                <p className="text-sm font-semibold text-stone-100 truncate">
                  {topSpender.full_name}
                </p>
                <p className="text-lg font-bold text-amber-700">
                  {formatCurrency(topSpender.totalSpentCents ?? 0)}
                </p>
              </>
            )}
            <p className="text-sm text-stone-500 mt-0.5">Top spender</p>
          </Card>
        </div>
      )}

      {withSpend.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium mb-1">No spending data yet</p>
          <p className="text-stone-400 text-sm">
            Client spending history will appear here once payments are recorded
          </p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Total Spend</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Avg per Event</TableHead>
                <TableHead>Last Event</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withSpend.map((client, i) => {
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
                    <TableCell className="text-stone-100 font-semibold text-sm">
                      {formatCurrency(client.totalSpentCents ?? 0)}
                      <span className="text-stone-400 font-normal text-xs ml-1">
                        ({sharePercent}%)
                      </span>
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {client.totalEvents ?? 0}
                    </TableCell>
                    <TableCell className="text-stone-400 text-sm">
                      {avgPerEvent > 0 ? formatCurrency(avgPerEvent) : '—'}
                    </TableCell>
                    <TableCell className="text-stone-500 text-sm">
                      {client.lastEventDate
                        ? new Date(client.lastEventDate).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/clients/${client.id}`}>
                        <span className="text-xs text-brand-600 hover:underline cursor-pointer">
                          View
                        </span>
                      </Link>
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
