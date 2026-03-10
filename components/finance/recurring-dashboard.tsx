'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw } from '@/components/ui/icons'
import Link from 'next/link'
import type { RecurringRevenueSummary } from '@/lib/finance/recurring-invoice-actions'
import { FREQUENCY_LABELS } from '@/lib/recurring/scheduler'

type Props = {
  summary: RecurringRevenueSummary
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
}

export function RecurringDashboard({ summary }: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-stone-400" />
            Recurring Revenue
          </CardTitle>
          <Link href="/finance/recurring" className="text-xs text-brand-400 hover:text-brand-300">
            Manage
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* MRR */}
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-stone-500">Monthly Recurring</span>
          <span className="text-lg font-semibold text-emerald-500">
            {formatCents(summary.monthlyRecurringRevenueCents)}
          </span>
        </div>

        {/* Active / Overdue counts */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-stone-400">
            {summary.activeSchedules} active schedule{summary.activeSchedules !== 1 ? 's' : ''}
          </span>
          {summary.overdueCount > 0 && (
            <Badge variant="error">{summary.overdueCount} overdue</Badge>
          )}
        </div>

        {/* Upcoming invoices */}
        {summary.nextDueInvoices.length > 0 && (
          <div>
            <p className="text-xs text-stone-500 mb-1.5">Due this week</p>
            <div className="space-y-1.5">
              {summary.nextDueInvoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-xs">
                  <div className="truncate">
                    <span className="text-stone-300">{inv.name || inv.clientName}</span>
                    {inv.name && <span className="text-stone-500 ml-1">({inv.clientName})</span>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-stone-400">{inv.nextSendDate}</span>
                    <span className="text-stone-200 font-medium">
                      {formatCents(inv.amountCents)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {summary.activeSchedules === 0 && (
          <p className="text-xs text-stone-500 text-center py-2">
            No active recurring schedules.{' '}
            <Link href="/finance/recurring" className="text-brand-400 hover:underline">
              Set one up
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
