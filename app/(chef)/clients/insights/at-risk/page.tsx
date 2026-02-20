import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getClientsWithStats } from '@/lib/clients/actions'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'At-Risk Clients - ChefFlow' }

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default async function AtRiskClientsPage() {
  await requireChef()
  const clients = await getClientsWithStats()

  const now = Date.now()
  const atRisk = clients
    .filter(c => c.lastEventDate && now - new Date(c.lastEventDate).getTime() > NINETY_DAYS_MS)
    .sort((a, b) => new Date(a.lastEventDate!).getTime() - new Date(b.lastEventDate!).getTime())

  return (
    <div className="space-y-6">
      <div>
        <Link href="/clients/insights" className="text-sm text-stone-500 hover:text-stone-700">
          ← Client Insights
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-900">At-Risk Clients</h1>
          <span className="bg-red-100 text-red-700 text-sm px-2 py-0.5 rounded-full">
            {atRisk.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Clients with no booking in the past 90 days — worth a follow-up</p>
      </div>

      {atRisk.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600 font-medium mb-1">No at-risk clients</p>
          <p className="text-stone-400 text-sm">All active clients have booked within the past 90 days</p>
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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRisk.map(client => {
                const days = daysSince(client.lastEventDate!)
                const urgencyClass = days > 180 ? 'text-red-700 font-semibold' : 'text-amber-700'
                return (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <Link href={`/clients/${client.id}`} className="text-brand-600 hover:text-brand-800 hover:underline">
                        {client.full_name}
                      </Link>
                      {client.email && (
                        <p className="text-xs text-stone-400 mt-0.5">{client.email}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-stone-600 text-sm">
                      {new Date(client.lastEventDate!).toLocaleDateString()}
                    </TableCell>
                    <TableCell className={`text-sm ${urgencyClass}`}>
                      {days} days ago
                    </TableCell>
                    <TableCell className="text-stone-600 text-sm">{client.totalEvents ?? 0}</TableCell>
                    <TableCell className="text-stone-600 text-sm">
                      {(client.totalSpentCents ?? 0) > 0 ? formatCurrency(client.totalSpentCents ?? 0) : '—'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/clients/${client.id}`}>
                        <span className="text-xs text-brand-600 hover:underline cursor-pointer">View</span>
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
