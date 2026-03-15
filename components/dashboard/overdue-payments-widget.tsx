// Overdue Payments Widget - Dashboard widget for overdue deposits and balances

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/currency'
import type { OverdueDepositEvent } from '@/lib/finance/deposit-actions'

interface Props {
  overdueEvents: OverdueDepositEvent[]
}

export function OverduePaymentsWidget({ overdueEvents }: Props) {
  if (overdueEvents.length === 0) return null

  const totalOverdueCents = overdueEvents.reduce((sum, e) => sum + e.overdueAmountCents, 0)
  const depositOverdue = overdueEvents.filter(
    (e) => e.overdueType === 'deposit' || e.overdueType === 'both'
  ).length
  const balanceOverdue = overdueEvents.filter(
    (e) => e.overdueType === 'balance' || e.overdueType === 'both'
  ).length

  return (
    <Card className="border-red-800/40">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Overdue Payments</CardTitle>
          <Badge variant="error">{formatCurrency(totalOverdueCents)}</Badge>
        </div>
        <p className="text-xs text-red-400/70 mt-0.5">
          {overdueEvents.length} event{overdueEvents.length !== 1 ? 's' : ''}
          {depositOverdue > 0 && ` (${depositOverdue} deposit${depositOverdue !== 1 ? 's' : ''})`}
          {balanceOverdue > 0 && ` (${balanceOverdue} balance${balanceOverdue !== 1 ? 's' : ''})`}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {overdueEvents.slice(0, 5).map((event) => (
            <li key={event.eventId}>
              <Link
                href={`/events/${event.eventId}`}
                className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-stone-800 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-stone-200 truncate">{event.occasion || 'Event'}</p>
                  <p className="text-xs text-stone-500">
                    {event.clientName || 'Unknown client'} · {event.daysOverdue}d overdue
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge
                    variant={
                      event.overdueType === 'deposit'
                        ? 'warning'
                        : event.overdueType === 'both'
                          ? 'error'
                          : 'info'
                    }
                  >
                    {event.overdueType === 'both'
                      ? 'Dep + Bal'
                      : event.overdueType === 'deposit'
                        ? 'Deposit'
                        : 'Balance'}
                  </Badge>
                  <span className="text-sm font-semibold text-red-400">
                    {formatCurrency(event.overdueAmountCents)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        {overdueEvents.length > 5 && (
          <p className="text-xs text-stone-500 text-center mt-2">
            +{overdueEvents.length - 5} more
          </p>
        )}
      </CardContent>
    </Card>
  )
}
