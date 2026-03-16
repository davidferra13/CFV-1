import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { exportRevenueByClientCSV } from '@/lib/finance/export-actions'
import { CSVDownloadButton } from '@/components/exports/csv-download-button'
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

export const metadata: Metadata = { title: 'Revenue by Client - ChefFlow' }

export default async function RevenueByClientPage() {
  await requireChef()
  const events = await getEvents()

  // Group events by client
  const clientMap = new Map<
    string,
    {
      id: string
      name: string
      eventCount: number
      totalRevenue: number
      completedRevenue: number
    }
  >()

  for (const event of events) {
    if (!event.client) continue
    const existing = clientMap.get(event.client.id)
    const revenue = event.quoted_price_cents ?? 0
    const isCompleted = event.status === 'completed'

    if (existing) {
      existing.eventCount++
      existing.totalRevenue += revenue
      if (isCompleted) existing.completedRevenue += revenue
    } else {
      clientMap.set(event.client.id, {
        id: event.client.id,
        name: event.client.full_name,
        eventCount: 1,
        totalRevenue: revenue,
        completedRevenue: isCompleted ? revenue : 0,
      })
    }
  }

  const clients = Array.from(clientMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)

  const totalRevenue = clients.reduce((s, c) => s + c.totalRevenue, 0)
  const topClient = clients[0]

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/reporting" className="text-sm text-stone-500 hover:text-stone-300">
          ← Reporting
        </Link>
        <div className="flex items-start justify-between mt-1">
          <div>
            <h1 className="text-3xl font-bold text-stone-100">Revenue by Client</h1>
            <p className="text-stone-500 mt-1">Lifetime value and booking frequency per client</p>
          </div>
          <CSVDownloadButton action={exportRevenueByClientCSV} label="Export CSV" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-stone-500 mt-1">Total across {clients.length} clients</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{clients.length}</p>
          <p className="text-sm text-stone-500 mt-1">Clients with events</p>
        </Card>
        {topClient && (
          <Card className="p-4">
            <p className="text-lg font-bold text-stone-100 truncate">{topClient.name}</p>
            <p className="text-sm text-stone-500 mt-1">
              Top client - {formatCurrency(topClient.totalRevenue)}
            </p>
          </Card>
        )}
      </div>

      {clients.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No client revenue data</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Completed Revenue</TableHead>
                <TableHead>Avg per Event</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client, idx) => (
                <TableRow key={client.id}>
                  <TableCell className="text-stone-400 text-sm">{idx + 1}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/clients/${client.id}`} className="text-brand-600 hover:underline">
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">{client.eventCount}</TableCell>
                  <TableCell className="text-stone-100 font-semibold text-sm">
                    {formatCurrency(client.totalRevenue)}
                  </TableCell>
                  <TableCell className="text-green-700 text-sm">
                    {formatCurrency(client.completedRevenue)}
                  </TableCell>
                  <TableCell className="text-stone-500 text-sm">
                    {formatCurrency(
                      client.eventCount > 0
                        ? Math.round(client.totalRevenue / client.eventCount)
                        : 0
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
