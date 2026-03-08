import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getEvents } from '@/lib/events/actions'
import { listInvoicePaymentStatusSummaries } from '@/lib/finance/invoice-payment-link-actions'
import { Card } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { InvoiceListClient } from '../invoice-list-client'

export const metadata: Metadata = { title: 'Sent Invoices - ChefFlow' }

function paymentStatusBadgeVariant(status: string): 'default' | 'warning' | 'success' | 'error' {
  if (status === 'paid') return 'success'
  if (status === 'partially_paid' || status === 'deposit_paid') return 'warning'
  if (status === 'overdue') return 'error'
  return 'default'
}

function paymentStatusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export default async function SentInvoicesPage() {
  await requireChef()
  const events = await getEvents()

  const sent = events
    .filter((e: any) => e.status === 'accepted')
    .sort((a: any, b: any) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

  const totalValue = sent.reduce(
    (sum: number, event: any) => sum + (event.quoted_price_cents ?? 0),
    0
  )
  const paymentStatuses = await listInvoicePaymentStatusSummaries(
    sent.map((event: any) => String(event.id))
  )
  const items = sent.map((event: any) => {
    const summary = paymentStatuses[String(event.id)] ?? null
    const paymentStatus = summary?.paymentStatus ?? 'unpaid'
    const outstandingCents = summary?.outstandingBalanceCents ?? event.quoted_price_cents ?? 0

    return {
      id: String(event.id),
      eventDate: event.event_date,
      clientId: event.client?.id ? String(event.client.id) : null,
      clientName: event.client?.full_name ?? null,
      occasion: event.occasion ?? null,
      guestCount: event.guest_count ?? null,
      valueCents: Number(event.quoted_price_cents ?? 0),
      paymentStatusLabel: paymentStatusLabel(paymentStatus),
      paymentStatusVariant: paymentStatusBadgeVariant(paymentStatus),
      outstandingCents: Number(outstandingCents ?? 0),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/invoices" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Invoices
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-3xl font-bold text-stone-100">Sent Invoices</h1>
          <span className="bg-amber-900 text-amber-700 text-sm px-2 py-0.5 rounded-full">
            {sent.length}
          </span>
        </div>
        <p className="text-stone-500 mt-1">Awaiting client acceptance and payment</p>
      </div>

      {sent.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-bold text-amber-700">{sent.length}</p>
            <p className="text-sm text-stone-500 mt-1">Awaiting acceptance</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold text-stone-100">{formatCurrency(totalValue)}</p>
            <p className="text-sm text-stone-500 mt-1">Total value pending</p>
          </Card>
        </div>
      )}

      {sent.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-400 font-medium">No sent invoices awaiting acceptance</p>
          <p className="text-stone-400 text-sm mt-1">Events in accepted state will appear here</p>
        </Card>
      ) : (
        <InvoiceListClient items={items} scopeKey="finance.invoices.sent" mode="sent" />
      )}
    </div>
  )
}
