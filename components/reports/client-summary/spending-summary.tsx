import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { ClientSummaryFinancials } from '@/lib/reports/client-summary'

export function SpendingSummary({ financials }: { financials: ClientSummaryFinancials }) {
  return (
    <Card className="print:shadow-none print:border-stone-300">
      <CardHeader>
        <CardTitle className="text-base print:text-stone-900">Financial Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Spent
            </p>
            <p className="text-xl font-bold text-stone-100 print:text-stone-900 mt-1">
              {formatCurrency(financials.totalSpentCents)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Avg / Event
            </p>
            <p className="text-xl font-bold text-stone-100 print:text-stone-900 mt-1">
              {formatCurrency(financials.averagePerEventCents)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Total Payments
            </p>
            <p className="text-xl font-bold text-stone-100 print:text-stone-900 mt-1">
              {formatCurrency(financials.totalPaymentsCents)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              Outstanding
            </p>
            <p
              className={`text-xl font-bold mt-1 ${
                financials.outstandingBalanceCents > 0
                  ? 'text-red-400 print:text-red-600'
                  : 'text-stone-100 print:text-stone-900'
              }`}
            >
              {formatCurrency(financials.outstandingBalanceCents)}
            </p>
          </div>
        </div>

        {/* Payment history */}
        {financials.paymentHistory.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
              Recent Payments
            </p>
            <div className="divide-y divide-stone-800 print:divide-stone-300">
              {financials.paymentHistory.slice(0, 10).map((payment, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="text-stone-400 print:text-stone-600">
                      {format(new Date(payment.date), 'MMM d, yyyy')}
                    </span>
                    <span className="text-stone-300 print:text-stone-700 capitalize">
                      {payment.type.replace(/_/g, ' ')}
                    </span>
                    {payment.method && (
                      <span className="text-xs text-stone-500">via {payment.method}</span>
                    )}
                  </div>
                  <span
                    className={`font-medium ${
                      payment.type === 'refund'
                        ? 'text-red-400 print:text-red-600'
                        : 'text-stone-200 print:text-stone-800'
                    }`}
                  >
                    {payment.type === 'refund' ? '-' : '+'}
                    {formatCurrency(Math.abs(payment.amountCents))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
