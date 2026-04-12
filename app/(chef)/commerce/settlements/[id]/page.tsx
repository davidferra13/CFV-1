// Settlement Detail Page - payout breakdown with linked payments
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getSettlement } from '@/lib/commerce/settlement-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { dateToDateString } from '@/lib/utils/format'
import { ArrowLeft } from '@/components/ui/icons'

export const metadata: Metadata = { title: 'Settlement Detail' }

export default async function SettlementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireChef()
  await requirePro('commerce')
  const { id } = await params

  let settlement: any
  try {
    settlement = await getSettlement(id)
  } catch {
    notFound()
  }

  const paymentIds: string[] = (() => {
    try {
      const raw = settlement.payment_ids
      return typeof raw === 'string' ? JSON.parse(raw) : (raw ?? [])
    } catch {
      return []
    }
  })()

  const statusColor =
    settlement.payout_status === 'paid'
      ? 'success'
      : settlement.payout_status === 'failed' || settlement.payout_status === 'canceled'
        ? 'error'
        : 'warning'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">
              ${((settlement.payout_amount_cents ?? 0) / 100).toFixed(2)}
            </h1>
            <Badge variant={statusColor as any}>{settlement.payout_status}</Badge>
          </div>
          <p className="text-stone-400 mt-1">
            {new Date(settlement.created_at).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {settlement.payout_arrival_date && (
              <>
                {' '}
                &middot; Arrives{' '}
                {new Date(settlement.payout_arrival_date + 'T12:00:00').toLocaleDateString()}
              </>
            )}
          </p>
        </div>
        <Link href="/commerce/settlements">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Financial Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-stone-300">
              <span>Gross amount</span>
              <span className="font-medium">
                ${((settlement.gross_amount_cents ?? 0) / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-stone-400">
              <span>Processing fees</span>
              <span className="text-red-400">
                -${((settlement.fee_amount_cents ?? 0) / 100).toFixed(2)}
              </span>
            </div>
            {(settlement.refund_amount_cents ?? 0) > 0 && (
              <div className="flex justify-between text-stone-400">
                <span>Refunds</span>
                <span className="text-red-400">
                  -${((settlement.refund_amount_cents ?? 0) / 100).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-stone-100 font-bold text-lg pt-2 border-t border-stone-700">
              <span>Net payout</span>
              <span>${((settlement.net_amount_cents ?? 0) / 100).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-400">Stripe Payout ID</span>
              <span className="text-stone-200 font-mono text-xs">
                {settlement.stripe_payout_id}
              </span>
            </div>
            {settlement.stripe_transfer_id && (
              <div className="flex justify-between">
                <span className="text-stone-400">Stripe Transfer ID</span>
                <span className="text-stone-200 font-mono text-xs">
                  {settlement.stripe_transfer_id}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-stone-400">Currency</span>
              <span className="text-stone-200 uppercase">
                {settlement.payout_currency ?? 'usd'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Payments included</span>
              <span className="text-stone-200">
                {settlement.payment_count ?? paymentIds.length}
              </span>
            </div>
            {settlement.period_start && settlement.period_end && (
              <div className="flex justify-between">
                <span className="text-stone-400">Period</span>
                <span className="text-stone-200">
                  {new Date(
                    dateToDateString(settlement.period_start as Date | string) + 'T12:00:00'
                  ).toLocaleDateString()}{' '}
                  –{' '}
                  {new Date(
                    dateToDateString(settlement.period_end as Date | string) + 'T12:00:00'
                  ).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment IDs */}
      {paymentIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Payments ({paymentIds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {paymentIds.map((pid: string) => (
                <div
                  key={pid}
                  className="text-stone-400 text-xs font-mono py-1 border-b border-stone-800 last:border-0"
                >
                  {pid}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {settlement.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone-300">{settlement.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
