// Reconciliation Dashboard — daily financial reconciliation reports
import type { Metadata } from 'next'
import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { listReconciliationReports } from '@/lib/commerce/reconciliation-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Reconciliation — ChefFlow' }

export default async function ReconciliationPage() {
  await requireChef()
  await requirePro('commerce')

  const { reports, total } = await listReconciliationReports({ limit: 30 })

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-stone-100">Reconciliation</h1>
          <Badge variant="default">{total}</Badge>
        </div>
      </div>

      <p className="text-stone-400 text-sm">
        Daily financial reconciliation reports. Review sales, payments, cash drawer variance, and
        ledger cross-checks.
      </p>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-stone-500">
            No reconciliation reports yet. Reports are generated when a register session closes or
            at end of business day.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report: any) => {
            const flags: any[] =
              typeof report.flags === 'string' ? JSON.parse(report.flags) : (report.flags ?? [])
            const openFlags = flags.filter((f: any) => f.status === 'open')

            return (
              <Card key={report.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-stone-200 font-medium text-lg">
                          {new Date(report.report_date + 'T12:00:00').toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                        <div className="flex items-center gap-3 mt-1 text-sm text-stone-400">
                          <span>{report.total_sales_count} sales</span>
                          <span>&middot;</span>
                          <span>
                            Revenue: ${((report.net_revenue_cents ?? 0) / 100).toFixed(2)}
                          </span>
                          {(report.cash_variance_cents ?? 0) !== 0 && (
                            <>
                              <span>&middot;</span>
                              <span
                                className={
                                  Math.abs(report.cash_variance_cents) > 100 ? 'text-amber-400' : ''
                                }
                              >
                                Cash variance: $
                                {((report.cash_variance_cents ?? 0) / 100).toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {openFlags.length > 0 && (
                        <Badge variant="warning">
                          {openFlags.length} flag{openFlags.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                      {report.reviewed ? (
                        <Badge variant="success">Reviewed</Badge>
                      ) : (
                        <Badge variant="default">Pending Review</Badge>
                      )}
                    </div>
                  </div>

                  {/* Payment method breakdown */}
                  <div className="flex gap-6 mt-3 text-xs text-stone-500">
                    <span>Cash: ${((report.cash_total_cents ?? 0) / 100).toFixed(2)}</span>
                    <span>Card: ${((report.card_total_cents ?? 0) / 100).toFixed(2)}</span>
                    {(report.other_total_cents ?? 0) > 0 && (
                      <span>Other: ${((report.other_total_cents ?? 0) / 100).toFixed(2)}</span>
                    )}
                    <span>Tax: ${((report.total_tax_cents ?? 0) / 100).toFixed(2)}</span>
                    <span>Tips: ${((report.total_tips_cents ?? 0) / 100).toFixed(2)}</span>
                    {(report.total_refunds_cents ?? 0) > 0 && (
                      <span className="text-red-400">
                        Refunds: -${((report.total_refunds_cents ?? 0) / 100).toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Open flags */}
                  {openFlags.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {openFlags.map((flag: any, idx: number) => (
                        <div
                          key={idx}
                          className={`text-xs px-2 py-1 rounded ${
                            flag.severity === 'error'
                              ? 'bg-red-500/10 text-red-400'
                              : flag.severity === 'warning'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-blue-500/10 text-blue-400'
                          }`}
                        >
                          {flag.message}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
