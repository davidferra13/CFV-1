import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { InvoiceListClient } from '../invoice-list-client'

export const metadata: Metadata = { title: 'Paid Invoices - ChefFlow' }

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'default'> = {
  paid: 'success',
  confirmed: 'success',
  in_progress: 'warning',
  completed: 'default',
}

export default async function PaidInvoicesPage() {
  await requireChef()
  const events = await getEvents()

  const paid = events
    .filter((event: any) =>
      ['paid', 'confirmed', 'in_progress', 'completed'].includes(event.status)
    )
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const totalValue = paid.reduce(
    (sum: number, event: any) => sum + Number(event.quoted_price_cents ?? 0),
    0
  )
  const completedCount = paid.filter((event: any) => event.status === 'completed').length
  const items = paid.map((event: any) => ({
    id: String(event.id),
    eventDate: event.event_date,
    clientId: event.client?.id ? String(event.client.id) : null,
    clientName: event.client?.full_name ?? null,
    occasion: event.occasion ?? null,
    guestCount: event.guest_count ?? null,
    valueCents: Number(event.quoted_price_cents ?? 0),
    statusLabel: String(event.status || '').replace(/_/g, ' '),
    statusVariant: STATUS_VARIANTS[String(event.status || '')] || 'default',
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/invoices" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Invoices
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-3xl font-bold text-stone-100">Paid Invoices</h1>
          <span className="rounded-full bg-green-900 px-2 py-0.5 text-sm text-green-700">
            {paid.length}
          </span>
        </div>
        <p className="mt-1 text-stone-500">
          Events with accepted payment: paid, confirmed, in progress, and completed
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-2xl font-bold text-green-700">{formatCurrency(totalValue)}</p>
          <p className="mt-1 text-sm text-stone-500">Total invoice value</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-100">{paid.length}</p>
          <p className="mt-1 text-sm text-stone-500">Paid invoices</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-stone-400">{completedCount}</p>
          <p className="mt-1 text-sm text-stone-500">Fully completed</p>
        </Card>
      </div>

      {paid.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-medium text-stone-400">No paid invoices</p>
          <p className="mt-1 text-sm text-stone-400">
            Events that have been paid will appear here.
          </p>
        </Card>
      ) : (
        <InvoiceListClient items={items} scopeKey="finance.invoices.paid" mode="paid" />
      )}
    </div>
  )
}
