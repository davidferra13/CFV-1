import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
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
import { format } from 'date-fns'

export const metadata: Metadata = { title: 'Paid Invoices' }

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-green-900 text-green-700',
  confirmed: 'bg-emerald-900 text-emerald-700',
  in_progress: 'bg-brand-900 text-brand-700',
  completed: 'bg-stone-800 text-stone-400',
}

export default async function PaidInvoicesPage() {
  await requireChef()
  const events = await getEvents()

  const paid = events
    .filter((e: any) => ['paid', 'confirmed', 'in_progress', 'completed'].includes(e.status))
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const totalValue = paid.reduce((s: any, e: any) => s + (e.quoted_price_cents ?? 0), 0)
  const completedCount = paid.filter((e: any) => e.status === 'completed').length

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/invoices" className="text-sm text-stone-500 hover:text-stone-300">
          ← Invoices
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Paid Invoices</h1>
          <span className="bg-green-900 text-green-700 text-sm px-2 py-0.5 rounded-full">
            {paid.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">
          Events with accepted payment - paid, confirmed, in progress, and completed
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalValue)}</p>
          <p className="text-sm text-stone-500 mt-1">Total invoice value</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{paid.length}</p>
          <p className="text-sm text-stone-500 mt-1">Paid invoices</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-400">{completedCount}</p>
          <p className="text-sm text-stone-500 mt-1">Fully completed</p>
        </Card>
      </div>

      {paid.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No paid invoices</p>
          <p className="text-stone-400 text-sm mt-1">Events that have been paid will appear here</p>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paid.map((event: any) => (
                <TableRow key={event.id}>
                  <TableCell className="text-stone-400 text-sm">
                    {format(new Date(event.event_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="font-medium">
                    {event.client ? (
                      <Link
                        href={`/clients/${event.client.id}`}
                        className="text-brand-600 hover:underline"
                      >
                        {event.client.full_name}
                      </Link>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm capitalize">
                    {event.occasion?.replace(/_/g, ' ') ?? '-'}
                  </TableCell>
                  <TableCell className="text-stone-400 text-sm">
                    {event.guest_count ?? '-'}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[event.status] ?? 'bg-stone-800 text-stone-400'}`}
                    >
                      {event.status.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell className="text-stone-100 font-semibold text-sm">
                    {event.quoted_price_cents != null
                      ? formatCurrency(event.quoted_price_cents)
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/events/${event.id}`}>
                      <span className="text-xs text-brand-600 hover:underline cursor-pointer">
                        View
                      </span>
                    </Link>
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
