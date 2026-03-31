import type { Metadata } from 'next'
import Link from 'next/link'
import { requireChef } from '@/lib/auth/get-user'
import { getPaymentSplitDetails, listPaymentSplitEvents } from '@/lib/payments/payment-splitting'
import { listDueRecurringPayments } from '@/lib/payments/recurring-payments'
import { PaymentReminders } from '@/components/payments/payment-reminders'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'

export const metadata: Metadata = { title: 'Payment Splitting' }

type PaymentSplittingPageProps = {
  searchParams?: {
    eventId?: string
  }
}

export default async function PaymentSplittingPage({ searchParams }: PaymentSplittingPageProps) {
  await requireChef()

  const [splitEvents, duePayments] = await Promise.all([
    listPaymentSplitEvents(50),
    listDueRecurringPayments(14).catch(() => []),
  ])

  const selectedEventId = searchParams?.eventId || splitEvents[0]?.id
  const splitDetails = selectedEventId
    ? await getPaymentSplitDetails(selectedEventId).catch(() => null)
    : null

  return (
    <div className="space-y-6">
      <div>
        <Link href="/finance/payments" className="text-sm text-stone-500 hover:text-stone-300">
          &larr; Payments
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-stone-100">Payment Splitting</h1>
        <p className="mt-1 text-stone-400">
          Review split-billing events and generate clear invoice allocations per participant.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Split Billing Events</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {splitEvents.length === 0 ? (
              <p className="text-sm text-stone-400">
                No events currently configured for split billing.
              </p>
            ) : (
              splitEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/payments/splitting?eventId=${event.id}`}
                  className={`block rounded-md border p-3 text-sm transition ${
                    selectedEventId === event.id
                      ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                      : 'border-stone-700 bg-stone-900 text-stone-200 hover:border-stone-600'
                  }`}
                >
                  <p className="font-medium">{event.occasion || 'Event'}</p>
                  <p className="text-xs text-stone-400">
                    {event.event_date} |{' '}
                    {typeof event.quoted_price_cents === 'number'
                      ? formatCurrency(event.quoted_price_cents)
                      : 'No quote'}
                  </p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Selected Split Details</CardTitle>
            </CardHeader>
            <CardContent>
              {!splitDetails ? (
                <p className="text-sm text-stone-400">Select an event to inspect split invoices.</p>
              ) : (splitDetails as any).invoices.length === 0 ? (
                <p className="text-sm text-stone-400">
                  No split invoices configured for this event.
                </p>
              ) : (
                <div className="space-y-2">
                  {(splitDetails as any).invoices.map((invoice: any) => (
                    <div
                      key={invoice.clientId}
                      className="flex items-center justify-between rounded-md border border-stone-700 bg-stone-900 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-stone-100">Client {invoice.clientId}</p>
                        <p className="text-xs text-stone-400">{invoice.percentage}% split</p>
                      </div>
                      <p className="font-medium text-stone-100">
                        {formatCurrency(invoice.calculatedAmountCents)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <PaymentReminders duePayments={duePayments as any} />
        </div>
      </div>
    </div>
  )
}
