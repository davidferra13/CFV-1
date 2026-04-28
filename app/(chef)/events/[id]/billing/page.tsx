import Link from 'next/link'
import { format } from 'date-fns'
import { notFound } from 'next/navigation'
import { PaymentPlanPanel } from '@/components/finance/payment-plan-panel'
import { RecordPaymentPanel } from '@/components/events/payment-actions-panel'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getPaymentPlan } from '@/lib/finance/payment-plan-actions'
import { formatCurrency } from '@/lib/utils/currency'

export default async function EventBillingPage({ params }: { params: { id: string } }) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select(
      `
      id, occasion, event_date, status, guest_count, quoted_price_cents, deposit_amount_cents,
      financially_closed,
      client:clients(full_name)
    `
    )
    .eq('id', params.id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) notFound()

  const [summaryRow, installments] = await Promise.all([
    db
      .from('event_financial_summary')
      .select('total_paid_cents, outstanding_balance_cents')
      .eq('event_id', params.id)
      .eq('tenant_id', user.tenantId!)
      .single()
      .then((result: any) => result.data ?? null),
    getPaymentPlan(params.id).catch(() => []),
  ])

  const totalPaid = Number(summaryRow?.total_paid_cents ?? 0)
  const outstandingBalance = Number(summaryRow?.outstanding_balance_cents ?? 0)
  const readyToClose =
    event.status === 'completed' && outstandingBalance <= 0 && !event.financially_closed

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={`/events/${params.id}`}
            className="text-sm text-stone-500 hover:text-stone-300"
          >
            Back to event
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-stone-100">Billing</h1>
          <p className="mt-1 text-sm text-stone-400">
            {((event as any).client?.full_name as string | undefined) ?? 'Client'} |{' '}
            {event.occasion ?? 'Event'} | {format(new Date(event.event_date), 'MMMM d, yyyy')}
          </p>
        </div>
        <Link href={`/events/${params.id}/financial`}>
          <Button variant="secondary">
            {readyToClose ? 'Close Financials' : 'Open Financial Summary'}
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-stone-500">Quoted price</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">
              {formatCurrency(event.quoted_price_cents ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-sm text-stone-500">Paid so far</p>
            <p className="mt-1 text-2xl font-bold text-emerald-500">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-sm text-stone-500">Outstanding balance</p>
            <p
              className={`mt-1 text-2xl font-bold ${
                outstandingBalance > 0 ? 'text-amber-400' : 'text-emerald-500'
              }`}
            >
              {formatCurrency(outstandingBalance)}
            </p>
          </div>
        </div>
      </Card>

      {outstandingBalance > 0 ? (
        <RecordPaymentPanel
          eventId={params.id}
          outstandingBalanceCents={outstandingBalance}
          depositAmountCents={event.deposit_amount_cents ?? 0}
          totalPaidCents={totalPaid}
        />
      ) : null}

      <Card className="p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">Payment Plan</h2>
            <p className="mt-2 text-sm text-stone-400">
              Keep installment tracking attached to the event instead of updating it from the broad
              money tab.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <PaymentPlanPanel
            eventId={params.id}
            initialInstallments={installments}
            quotedPriceCents={event.quoted_price_cents}
          />
        </div>
      </Card>

      {readyToClose ? (
        <Card className="border-emerald-800/60 bg-emerald-950/30 p-6">
          <h2 className="text-lg font-semibold text-emerald-200">Financial close is ready</h2>
          <p className="mt-2 text-sm text-emerald-300">
            The balance is settled for this completed event. Open the financial summary to mark the
            event financially closed.
          </p>
        </Card>
      ) : null}
    </div>
  )
}
