// Reconciliation Report Detail — review, resolve flags
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { getReconciliationReport } from '@/lib/commerce/reconciliation-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ReconciliationActions } from '@/components/commerce/reconciliation-actions-client'

export const metadata: Metadata = { title: 'Reconciliation Detail — ChefFlow' }

export default async function ReconciliationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireChef()
  await requirePro('commerce')
  const { id } = await params

  let report: any
  try {
    report = await getReconciliationReport(id)
  } catch {
    notFound()
  }

  const flags: any[] =
    typeof report.flags === 'string' ? JSON.parse(report.flags) : (report.flags ?? [])

  const dateStr = new Date(report.report_date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-stone-100">{dateStr}</h1>
            {report.reviewed ? (
              <Badge variant="success">Reviewed</Badge>
            ) : (
              <Badge variant="default">Pending Review</Badge>
            )}
          </div>
          <p className="text-stone-400 mt-1">
            {report.total_sales_count} sales &middot; Net revenue $
            {((report.net_revenue_cents ?? 0) / 100).toFixed(2)}
          </p>
        </div>
        <Link href="/commerce/reconciliation">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
      </div>

      {/* Actions */}
      <ReconciliationActions reportId={id} reviewed={report.reviewed} flags={flags} />

      {/* Revenue Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-stone-500 uppercase">Gross Revenue</p>
              <p className="text-xl font-bold text-stone-100">
                ${((report.total_revenue_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase">Refunds</p>
              <p className="text-xl font-bold text-red-400">
                -${((report.total_refunds_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase">Tax Collected</p>
              <p className="text-xl font-bold text-stone-100">
                ${((report.total_tax_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase">Tips</p>
              <p className="text-xl font-bold text-stone-100">
                ${((report.total_tips_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-stone-500 uppercase">Cash</p>
              <p className="text-xl font-bold text-stone-100">
                ${((report.cash_total_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase">Card</p>
              <p className="text-xl font-bold text-stone-100">
                ${((report.card_total_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase">Other</p>
              <p className="text-xl font-bold text-stone-100">
                ${((report.other_total_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Drawer */}
      {report.opening_cash_cents !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Cash Drawer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-stone-500 uppercase">Opening</p>
                <p className="text-lg font-bold text-stone-100">
                  ${((report.opening_cash_cents ?? 0) / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase">Expected</p>
                <p className="text-lg font-bold text-stone-100">
                  ${((report.expected_cash_cents ?? 0) / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase">Closing</p>
                <p className="text-lg font-bold text-stone-100">
                  ${((report.closing_cash_cents ?? 0) / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-500 uppercase">Variance</p>
                <p
                  className={`text-lg font-bold ${
                    Math.abs(report.cash_variance_cents ?? 0) > 100
                      ? 'text-amber-400'
                      : 'text-stone-100'
                  }`}
                >
                  ${((report.cash_variance_cents ?? 0) / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger Cross-Check */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Cross-Check</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-stone-500 uppercase">Ledger Total</p>
              <p className="text-lg font-bold text-stone-100">
                ${((report.ledger_total_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-500 uppercase">Payment–Ledger Diff</p>
              <p
                className={`text-lg font-bold ${
                  Math.abs(report.payment_ledger_diff_cents ?? 0) > 0
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                ${((report.payment_ledger_diff_cents ?? 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
