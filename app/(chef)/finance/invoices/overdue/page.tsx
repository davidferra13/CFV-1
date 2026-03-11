import type { Metadata } from 'next'
import Link from 'next/link'
import { differenceInDays } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { InvoiceListClient } from '../invoice-list-client'

export const metadata: Metadata = { title: 'Overdue Invoices - ChefFlow' }

export default async function OverdueInvoicesPage() {
  await requireChef()
  const events = await getEvents()

  const now = new Date()
  const overdue = events
    .filter(
      (event: any) =>
        new Date(event.event_date) < now && !['completed', 'cancelled'].includes(event.status)
    )
    .sort((a: any, b: any) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

  const totalValue = overdue.reduce(
    (sum: number, event: any) => sum + Number(event.quoted_price_cents ?? 0),
    0
  )
  const criticalCount = overdue.filter(
    (event: any) => differenceInDays(now, new Date(event.event_date)) > 30
  ).length
  const items = overdue.map((event: any) => ({
    id: String(event.id),
    eventDate: event.event_date,
    clientId: event.client?.id ? String(event.client.id) : null,
    clientName: event.client?.full_name ?? null,
    occasion: event.occasion ?? null,
    guestCount: event.guest_count ?? null,
    valueCents: Number(event.quoted_price_cents ?? 0),
    statusLabel: String(event.status || '').replace(/_/g, ' '),
    statusVariant: 'default' as const,
    daysOverdue: differenceInDays(now, new Date(event.event_date)),
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/invoices" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Invoices
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-3xl font-bold text-stone-100">Overdue Invoices</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-sm ${
              overdue.length > 0 ? 'bg-red-900 text-red-600' : 'bg-stone-800 text-stone-400'
            }`}
          >
            {overdue.length}
          </span>
        </div>
        <p className="mt-1 text-stone-500">Past events that have not been resolved</p>
      </div>

      {overdue.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-red-200 bg-red-950 p-4">
            <p className="text-2xl font-bold text-red-900">{formatCurrency(totalValue)}</p>
            <p className="mt-1 text-sm text-red-200">Total overdue value</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-200">{overdue.length}</p>
            <p className="mt-1 text-sm text-stone-500">Overdue events</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
            <p className="mt-1 text-sm text-stone-500">Critical (&gt;30 days)</p>
          </Card>
        </div>
      )}

      {overdue.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-medium text-stone-400">No overdue invoices</p>
          <p className="mt-1 text-sm text-stone-400">All past events have been resolved.</p>
        </Card>
      ) : (
        <InvoiceListClient items={items} scopeKey="finance.invoices.overdue" mode="overdue" />
      )}
    </div>
  )
}
