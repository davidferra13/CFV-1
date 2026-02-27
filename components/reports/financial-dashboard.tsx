import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import type { FinancialAnalyticsSnapshot } from '@/lib/reports/analytics-service'

export function FinancialDashboard({ snapshot }: { snapshot: FinancialAnalyticsSnapshot }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-stone-400">Net Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-stone-100">
              {formatCurrency(snapshot.totals.netRevenueCents)}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Gross {formatCurrency(snapshot.totals.grossRevenueCents)} minus refunds{' '}
              {formatCurrency(snapshot.totals.refundsCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-stone-400">Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-stone-100">
              {formatCurrency(snapshot.totals.profitCents)}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              Expenses {formatCurrency(snapshot.totals.expensesCents)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-stone-400">Outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-stone-100">
              {formatCurrency(snapshot.totals.outstandingCents)}
            </p>
            <p className="text-xs text-stone-400 mt-1">
              {snapshot.pipeline.overdueInvoiceCount} overdue invoices
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Upcoming Events</p>
            <p className="text-lg font-medium text-stone-100">
              {snapshot.pipeline.upcomingEventCount}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Upcoming Quoted Value</p>
            <p className="text-lg font-medium text-stone-100">
              {formatCurrency(snapshot.pipeline.upcomingQuotedCents)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-400">Tips Collected</p>
            <p className="text-lg font-medium text-stone-100">
              {formatCurrency(snapshot.totals.tipsCents)}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Net Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshot.monthlyNetRevenue.length === 0 ? (
              <p className="text-sm text-stone-400">No data in selected range.</p>
            ) : (
              snapshot.monthlyNetRevenue.map((item) => (
                <div key={item.month} className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{item.month}</span>
                  <span className="font-medium text-stone-100">
                    {formatCurrency(item.amountCents)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Clients by Revenue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshot.topClients.length === 0 ? (
              <p className="text-sm text-stone-400">No client revenue records in selected range.</p>
            ) : (
              snapshot.topClients.map((client) => (
                <div key={client.clientId} className="flex items-center justify-between text-sm">
                  <span className="text-stone-300">{client.clientName}</span>
                  <span className="font-medium text-stone-100">
                    {formatCurrency(client.netRevenueCents)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
