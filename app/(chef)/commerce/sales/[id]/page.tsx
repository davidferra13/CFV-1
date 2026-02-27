// Sale Detail Page — full sale info, items, payments, refunds
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { getSale } from '@/lib/commerce/sale-actions'
import { getPaymentsForSale } from '@/lib/commerce/payment-actions'
import { getRefundsForSale } from '@/lib/commerce/refund-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import {
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  SALE_CHANNEL_LABELS,
} from '@/lib/commerce/constants'
import type { SaleStatus, SaleChannel } from '@/lib/commerce/constants'

export const metadata: Metadata = { title: 'Sale Detail — ChefFlow' }

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireChef()
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

      {/* Sale Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-stone-500 text-sm">No items</p>
          ) : (
            <div className="space-y-2">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-stone-800 last:border-0"
                >
                  <div>
                    <span className="text-stone-200">{item.name}</span>
                    <span className="text-stone-500 text-sm ml-2">×{item.quantity}</span>
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
            <p className="text-stone-500 text-sm">No payments recorded</p>
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
