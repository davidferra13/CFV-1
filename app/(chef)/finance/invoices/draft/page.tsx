import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { InvoiceListClient } from '../invoice-list-client'

export const metadata: Metadata = { title: 'Draft Invoices - ChefFlow' }

export default async function DraftInvoicesPage() {
  await requireChef()
  const events = await getEvents()

  const drafts = events
    .filter((event: any) => ['draft', 'proposed'].includes(event.status))
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const totalValue = drafts.reduce(
    (sum: number, event: any) => sum + Number(event.quoted_price_cents ?? 0),
    0
  )
  const items = drafts.map((event: any) => ({
    id: String(event.id),
    eventDate: event.event_date,
    clientId: event.client?.id ? String(event.client.id) : null,
    clientName: event.client?.full_name ?? null,
    occasion: event.occasion ?? null,
    guestCount: event.guest_count ?? null,
    valueCents: Number(event.quoted_price_cents ?? 0),
    statusLabel: String(event.status || '').replace(/_/g, ' '),
    statusVariant: 'default' as const,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/invoices" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Invoices
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-3xl font-bold text-stone-100">Draft Invoices</h1>
          <span className="rounded-full bg-stone-800 px-2 py-0.5 text-sm text-stone-400">
            {drafts.length}
          </span>
        </div>
        <p className="mt-1 text-stone-500">Events not yet sent to the client</p>
      </div>

      {drafts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{drafts.length}</p>
            <p className="mt-1 text-sm text-stone-500">Draft invoices</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-300">{formatCurrency(totalValue)}</p>
            <p className="mt-1 text-sm text-stone-500">Potential value</p>
          </Card>
        </div>
      )}

      {drafts.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="font-medium text-stone-400">No draft invoices</p>
          <p className="mt-1 text-sm text-stone-400">
            Events in draft or proposed state will appear here.
          </p>
        </Card>
      ) : (
        <InvoiceListClient items={items} scopeKey="finance.invoices.draft" mode="draft" />
      )}
    </div>
  )
}
