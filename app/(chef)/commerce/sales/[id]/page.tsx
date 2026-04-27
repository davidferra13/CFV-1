// Sale Detail Page - full sale info, items, payments, refunds
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getSale } from '@/lib/commerce/sale-actions'
import { getPaymentsForSale } from '@/lib/commerce/payment-actions'
import { getRefundsForSale } from '@/lib/commerce/refund-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from '@/components/ui/icons'
import {
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  SALE_CHANNEL_LABELS,
} from '@/lib/commerce/constants'
import type { SaleStatus, SaleChannel } from '@/lib/commerce/constants'
import { SaleDetailActions } from '@/components/commerce/sale-detail-actions'

export const metadata: Metadata = { title: 'Sale Detail' }

function readBooleanFlag(value: string | undefined) {
  const normalized = String(value ?? '')
    .trim()
    .toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
  await requirePro('commerce')
  const { id } = await params

  let saleData
  try {
    saleData = await getSale(id)
  } catch {
    notFound()
  }

  const { sale, items } = saleData

  const [payments, refunds] = await Promise.all([getPaymentsForSale(id), getRefundsForSale(id)])

  const s = sale as any
  const status = s.status as SaleStatus
  const channel = s.channel as SaleChannel
  const managerApprovalRequired = readBooleanFlag(process.env.POS_ENFORCE_MANAGER_APPROVAL)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">{s.sale_number ?? 'Draft Sale'}</h1>
            <Badge variant={SALE_STATUS_COLORS[status] as any}>{SALE_STATUS_LABELS[status]}</Badge>
          </div>
          <p className="text-stone-400 mt-1">
            {SALE_CHANNEL_LABELS[channel]} &middot; {new Date(s.created_at).toLocaleString()}
          </p>
        </div>
        <Link href="/commerce/sales">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Actions */}
      <SaleDetailActions
        saleId={id}
        saleStatus={status}
        totalCents={s.total_cents ?? 0}
        managerApprovalRequired={managerApprovalRequired}
        payments={payments.map((p: any) => ({
          id: p.id,
          amount_cents: p.amount_cents ?? 0,
          tip_cents: p.tip_cents ?? 0,
          status: p.status,
        }))}
      />

      {/* Sale Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-6">
              <svg
                className="h-8 w-8 mx-auto text-stone-600 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
              <p className="text-sm text-stone-400 font-medium">No items in this sale</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <span className="text-stone-200">{item.name}</span>
                    <span className="text-stone-500 text-sm ml-2">x{item.quantity}</span>
                  </div>
                  <span className="text-stone-200 font-medium">
                    ${((item.line_total_cents ?? 0) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Totals */}
          <div className="mt-4 pt-4 border-t border-stone-700 space-y-1">
            <div className="flex justify-between text-stone-400 text-sm">
              <span>Subtotal</span>
              <span>${((s.subtotal_cents ?? 0) / 100).toFixed(2)}</span>
            </div>
            {(s.tax_cents ?? 0) > 0 && (
              <div className="flex justify-between text-stone-400 text-sm">
                <span>Tax</span>
                <span>${((s.tax_cents ?? 0) / 100).toFixed(2)}</span>
              </div>
            )}
            {(s.discount_cents ?? 0) > 0 && (
              <div className="flex justify-between text-stone-400 text-sm">
                <span>Discount</span>
                <span>-${((s.discount_cents ?? 0) / 100).toFixed(2)}</span>
              </div>
            )}
            {(s.tip_cents ?? 0) > 0 && (
              <div className="flex justify-between text-stone-400 text-sm">
                <span>Tip</span>
                <span>${((s.tip_cents ?? 0) / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-stone-100 font-bold text-lg pt-1">
              <span>Total</span>
              <span>${((s.total_cents ?? 0) / 100).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Payments ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-6">
              <svg
                className="h-8 w-8 mx-auto text-stone-600 mb-2"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
                />
              </svg>
              <p className="text-sm text-stone-400 font-medium">No payments recorded</p>
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p: any) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <span className="text-stone-200 capitalize">{p.payment_method}</span>
                    <Badge
                      variant={
                        p.status === 'captured' || p.status === 'settled'
                          ? 'success'
                          : p.status === 'failed'
                            ? 'error'
                            : 'default'
                      }
                      className="ml-2"
                    >
                      {p.status}
                    </Badge>
                  </div>
                  <span className="text-stone-200 font-medium">
                    ${((p.amount_cents ?? 0) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refunds */}
      {refunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Refunds ({refunds.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {refunds.map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <span className="text-stone-200">{r.reason}</span>
                    <Badge
                      variant={r.status === 'processed' ? 'success' : 'warning'}
                      className="ml-2"
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <span className="text-red-400 font-medium">
                    -${((r.amount_cents ?? 0) / 100).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {s.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-stone-300">{s.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
