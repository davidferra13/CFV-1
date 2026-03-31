// Settlements Page - Stripe payout tracking and payment mapping
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { listSettlements, getSettlementSummary } from '@/lib/commerce/settlement-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Settlements' }

export default async function SettlementsPage() {
  await requireChef()
  await requirePro('commerce')

  const [{ settlements, total }, summary] = await Promise.all([
    listSettlements({ limit: 30 }),
    getSettlementSummary(),
  ])

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold text-stone-100">Settlements</h1>
        <Badge variant="default">{total}</Badge>
      </div>

      <p className="text-stone-400 text-sm">
        Track Stripe payouts and see which payments were included in each settlement.
      </p>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-100">
              ${((summary.totalSettledCents ?? 0) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-stone-500 mt-1">Total Settled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-amber-400">
              ${((summary.pendingAmountCents ?? 0) / 100).toFixed(2)}
            </p>
            <p className="text-xs text-stone-500 mt-1">Pending / In Transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{summary.totalPayouts}</p>
            <p className="text-xs text-stone-500 mt-1">Total Payouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{summary.totalPaymentsSettled}</p>
            <p className="text-xs text-stone-500 mt-1">Payments Settled</p>
          </CardContent>
        </Card>
      </div>

      {/* Settlement list */}
      {settlements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-stone-500">
            No settlements yet. Settlements are created automatically when Stripe sends payout
            events.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {settlements.map((s: any) => {
            const statusColor =
              s.payout_status === 'paid'
                ? 'success'
                : s.payout_status === 'failed'
                  ? 'error'
                  : s.payout_status === 'canceled'
                    ? 'error'
                    : 'warning'

            return (
              <Link key={s.id} href={`/commerce/settlements/${s.id}`}>
                <Card className="hover:border-stone-600 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-stone-200 font-medium">
                            ${((s.payout_amount_cents ?? 0) / 100).toFixed(2)}
                          </span>
                          <Badge variant={statusColor as any}>{s.payout_status}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                          <span>
                            {s.payment_count} payment{s.payment_count !== 1 ? 's' : ''}
                          </span>
                          {s.payout_arrival_date && (
                            <>
                              <span>&middot;</span>
                              <span>
                                Arrives:{' '}
                                {new Date(s.payout_arrival_date + 'T12:00:00').toLocaleDateString()}
                              </span>
                            </>
                          )}
                          <span>&middot;</span>
                          <span>{new Date(s.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="text-right text-xs text-stone-500">
                        <div>Gross: ${((s.gross_amount_cents ?? 0) / 100).toFixed(2)}</div>
                        <div>Fees: -${((s.fee_amount_cents ?? 0) / 100).toFixed(2)}</div>
                        <div className="text-stone-200 font-medium">
                          Net: ${((s.net_amount_cents ?? 0) / 100).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
