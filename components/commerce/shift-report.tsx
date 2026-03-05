// Shift Report — displays register session summary after closing
'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'

type Session = {
  id: string
  session_name: string | null
  status: string
  opened_at: string
  closed_at: string | null
  opening_cash_cents: number
  closing_cash_cents: number | null
  expected_cash_cents: number | null
  cash_variance_cents: number | null
  total_sales_count: number
  total_revenue_cents: number
  total_tips_cents: number
  close_notes: string | null
}

type Props = {
  sessions: Session[]
}

export function ShiftReport({ sessions }: Props) {
  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-stone-500">
          No closed register sessions found. Close a register session to see its shift report.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => {
        const openedAt = new Date(session.opened_at)
        const closedAt = session.closed_at ? new Date(session.closed_at) : null
        const durationMs = closedAt ? closedAt.getTime() - openedAt.getTime() : 0
        const durationHours = Math.floor(durationMs / 3600000)
        const durationMinutes = Math.floor((durationMs % 3600000) / 60000)

        const varianceAbs = Math.abs(session.cash_variance_cents ?? 0)
        const varianceColor =
          varianceAbs === 0
            ? 'text-emerald-400'
            : varianceAbs > 100
              ? 'text-amber-400'
              : 'text-stone-100'

        return (
          <Card key={session.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {session.session_name ||
                    openedAt.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                </CardTitle>
                <Badge variant={session.status === 'closed' ? 'default' : 'success'}>
                  {session.status}
                </Badge>
              </div>
              <p className="text-stone-400 text-sm">
                {openedAt.toLocaleTimeString()} – {closedAt?.toLocaleTimeString() ?? 'ongoing'}
                {durationMs > 0 && ` (${durationHours}h ${durationMinutes}m)`}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-stone-500 uppercase">Sales</p>
                  <p className="text-2xl font-bold text-stone-100">{session.total_sales_count}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase">Revenue</p>
                  <p className="text-2xl font-bold text-stone-100">
                    {formatCurrency(session.total_revenue_cents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase">Tips</p>
                  <p className="text-2xl font-bold text-stone-100">
                    {formatCurrency(session.total_tips_cents)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase">Cash Variance</p>
                  <p className={`text-2xl font-bold ${varianceColor}`}>
                    {formatCurrency(session.cash_variance_cents ?? 0)}
                  </p>
                </div>
              </div>

              {/* Cash drawer detail */}
              <div className="mt-4 pt-4 border-t border-stone-700 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-stone-500">Opening cash</p>
                  <p className="text-stone-200 font-medium">
                    {formatCurrency(session.opening_cash_cents)}
                  </p>
                </div>
                <div>
                  <p className="text-stone-500">Expected cash</p>
                  <p className="text-stone-200 font-medium">
                    {formatCurrency(session.expected_cash_cents ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-stone-500">Closing cash</p>
                  <p className="text-stone-200 font-medium">
                    {formatCurrency(session.closing_cash_cents ?? 0)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a href={`/api/documents/commerce-shift-report/${session.id}?format=csv`}>
                  <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Z CSV
                  </Button>
                </a>
                <a
                  href={`/api/documents/commerce-shift-report/${session.id}?format=pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="secondary" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Z PDF
                  </Button>
                </a>
              </div>

              {session.close_notes && (
                <div className="mt-3 pt-3 border-t border-stone-700">
                  <p className="text-stone-500 text-xs">Notes</p>
                  <p className="text-stone-300 text-sm">{session.close_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
