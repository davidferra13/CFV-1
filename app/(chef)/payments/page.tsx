import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { listRecurringPaymentPlans } from '@/lib/payments/recurring-payments'
import { listPaymentSplitEvents } from '@/lib/payments/payment-splitting'

export const metadata = { title: 'Payments' }

function formatDollars(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function paymentStatusColor(status: string): string {
  switch (status) {
    case 'paid':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    case 'deposit_paid':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    case 'unpaid':
      return 'bg-red-500/20 text-red-300 border-red-500/30'
    default:
      return 'bg-stone-500/20 text-stone-300 border-stone-500/30'
  }
}

export default async function PaymentsPage() {
  const user = await requireChef()
  const db: any = createServerClient()

  let recentPayments: any[] = []
  let recurringPlans: any[] = []
  let splitEvents: any[] = []
  let fetchError: string | null = null

  try {
    const now = new Date()
    const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

    const [paymentsResult, plans, splits] = await Promise.all([
      db
        .from('events')
        .select('id, occasion, event_date, quoted_price_cents, payment_status')
        .eq('tenant_id', user.tenantId!)
        .in('payment_status', ['paid', 'deposit_paid'])
        .order('event_date', { ascending: false })
        .limit(10),
      listRecurringPaymentPlans(),
      listPaymentSplitEvents(5),
    ])

    if (paymentsResult.error) {
      throw new Error(paymentsResult.error.message)
    }

    recentPayments = paymentsResult.data || []
    recurringPlans = plans
    splitEvents = splits
  } catch (err: any) {
    fetchError = err?.message || 'Failed to load payment data'
  }

  if (fetchError) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-stone-100">Payments</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-red-400">Unable to load payment data: {fetchError}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Quick stats
  const now = new Date()
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const collectedThisMonth = recentPayments
    .filter(
      (e) =>
        e.payment_status === 'paid' &&
        e.event_date >= startOfMonth &&
        typeof e.quoted_price_cents === 'number'
    )
    .reduce((sum: number, e: any) => sum + e.quoted_price_cents, 0)

  const activePlans = recurringPlans.filter((p) => p.is_active)
  const monthlyRecurringValue = activePlans
    .filter((p) => p.frequency === 'monthly')
    .reduce((sum, p) => sum + p.amount_cents, 0)

  const nextDuePlan = activePlans
    .filter((p) => p.next_send_date)
    .sort((a, b) => (a.next_send_date! > b.next_send_date! ? 1 : -1))[0]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-stone-100">Payments</h1>
        <div className="flex gap-2">
          <Link
            href="/payments/splitting"
            className="inline-flex items-center rounded-md bg-stone-800 px-3 py-2 text-sm font-medium text-stone-200 hover:bg-stone-700 border border-stone-700"
          >
            Split Billing
          </Link>
          <Link
            href="/finance/recurring"
            className="inline-flex items-center rounded-md bg-stone-800 px-3 py-2 text-sm font-medium text-stone-200 hover:bg-stone-700 border border-stone-700"
          >
            Recurring Plans
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-stone-400">Collected This Month</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">
              {collectedThisMonth > 0 ? formatDollars(collectedThisMonth) : 'No payments yet'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-stone-400">Active Recurring Plans</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">{activePlans.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-stone-400">Monthly Recurring Value</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">
              {monthlyRecurringValue > 0 ? formatDollars(monthlyRecurringValue) : 'None'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-stone-400">Next Due</p>
            <p className="mt-1 text-2xl font-bold text-stone-100">
              {nextDuePlan ? nextDuePlan.next_send_date : 'Nothing scheduled'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length === 0 ? (
            <p className="text-sm text-stone-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {recentPayments.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-md border border-stone-700 bg-stone-900 p-3"
                >
                  <div>
                    <p className="font-medium text-stone-100">
                      {event.occasion || 'Untitled Event'}
                    </p>
                    <p className="text-xs text-stone-400">{event.event_date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-stone-100">
                      {typeof event.quoted_price_cents === 'number'
                        ? formatDollars(event.quoted_price_cents)
                        : 'No quote'}
                    </span>
                    <Badge className={paymentStatusColor(event.payment_status)}>
                      {event.payment_status === 'deposit_paid' ? 'Deposit' : event.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring Plans Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recurring Plans</CardTitle>
          <Link href="/finance/recurring" className="text-sm text-brand-500 hover:text-brand-400">
            Manage
          </Link>
        </CardHeader>
        <CardContent>
          {recurringPlans.length === 0 ? (
            <p className="text-sm text-stone-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {recurringPlans.slice(0, 5).map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between rounded-md border border-stone-700 bg-stone-900 p-3"
                >
                  <div>
                    <p className="font-medium text-stone-100">
                      {plan.description || 'Recurring Plan'}
                    </p>
                    <p className="text-xs text-stone-400">
                      {plan.frequency} | Next: {plan.next_send_date || 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-stone-100">
                      {formatDollars(plan.amount_cents)}
                    </span>
                    <Badge
                      className={
                        plan.is_active
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-stone-500/20 text-stone-300 border-stone-500/30'
                      }
                    >
                      {plan.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Split Events */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Split Billing Events</CardTitle>
          <Link href="/payments/splitting" className="text-sm text-brand-500 hover:text-brand-400">
            View All
          </Link>
        </CardHeader>
        <CardContent>
          {splitEvents.length === 0 ? (
            <p className="text-sm text-stone-400">No data yet</p>
          ) : (
            <div className="space-y-2">
              {splitEvents.map((event) => (
                <Link
                  key={event.id}
                  href={`/payments/splitting?eventId=${event.id}`}
                  className="flex items-center justify-between rounded-md border border-stone-700 bg-stone-900 p-3 hover:border-stone-600 transition"
                >
                  <div>
                    <p className="font-medium text-stone-100">{event.occasion || 'Event'}</p>
                    <p className="text-xs text-stone-400">{event.event_date}</p>
                  </div>
                  <span className="text-sm font-medium text-stone-100">
                    {typeof event.quoted_price_cents === 'number'
                      ? formatDollars(event.quoted_price_cents)
                      : 'No quote'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
