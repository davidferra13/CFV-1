import type { Metadata } from 'next'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { requireChef } from '@/lib/auth/get-user'
import { getRecurringPlanningBoardSnapshot } from '@/lib/recurring/actions'
import { formatCurrency } from '@/lib/utils/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RecurringBoardRowActions } from './recurring-board-row-actions'

export const metadata: Metadata = { title: 'Recurring Board' }

const RECOMMENDATION_STATUS_BADGES: Record<
  'not_sent' | 'sent' | 'approved' | 'revision_requested',
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  not_sent: 'default',
  sent: 'info',
  approved: 'success',
  revision_requested: 'warning',
}

function toTitle(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

export default async function RecurringPlanningBoardPage() {
  await requireChef()
  const board = await getRecurringPlanningBoardSnapshot(8)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/clients" className="text-sm text-brand-600 hover:underline">
            Back to Clients
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-stone-100">Recurring Planning Board</h1>
          <p className="mt-1 text-sm text-stone-400">
            Weekly command center for multi-service client planning, menu collaboration, and request
            load.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Recurring Clients</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-stone-100">
            {board.total_active_clients}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projected Revenue ({board.horizon_weeks}w)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-stone-100">
            {formatCurrency(board.total_projected_revenue_cents)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Meal Requests</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-stone-100">
            {board.total_open_requests}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Recommendation Replies</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-stone-100">
            {board.total_pending_recommendation_responses}
          </CardContent>
        </Card>
      </div>

      {board.backlog_requests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backlog Requests (No Target Week)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {board.backlog_requests.slice(0, 10).map((row) => (
              <div
                key={row.client_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-800 bg-stone-900 px-3 py-2"
              >
                <div>
                  <Link
                    href={`/clients/${row.client_id}`}
                    className="text-sm font-medium text-stone-100 hover:underline"
                  >
                    {row.client_name}
                  </Link>
                  <p className="mt-1 text-xs text-stone-500">
                    Open requests: {row.open_request_count}
                    {row.high_priority_request_count > 0
                      ? ` | high priority: ${row.high_priority_request_count}`
                      : ''}
                  </p>
                  {row.repeat_signals.length > 0 && (
                    <p className="text-xs text-stone-400">
                      Repeat signals: {row.repeat_signals.join(', ')}
                    </p>
                  )}
                  {row.avoid_signals.length > 0 && (
                    <p className="text-xs text-stone-400">
                      Avoid signals: {row.avoid_signals.join(', ')}
                    </p>
                  )}
                </div>
                <Link href={`/clients/${row.client_id}/recurring`}>
                  <Button size="sm" variant="secondary">
                    Open Client Plan
                  </Button>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {board.weeks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-stone-500">
            No recurring sessions are scheduled in the next {board.horizon_weeks} weeks.
          </CardContent>
        </Card>
      ) : (
        board.weeks.map((week) => (
          <Card key={week.week_start}>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">
                  Week of {format(parseISO(`${week.week_start}T00:00:00`), 'MMM d, yyyy')}
                </CardTitle>
                <p className="text-xs text-stone-500">
                  Ends {format(parseISO(`${week.week_end}T00:00:00`), 'MMM d, yyyy')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="default">Clients: {week.client_count}</Badge>
                <Badge variant="info">Sessions: {week.session_count}</Badge>
                <Badge variant="success">
                  Revenue: {formatCurrency(week.projected_revenue_cents)}
                </Badge>
                <Badge variant="warning">Open requests: {week.open_request_count}</Badge>
                <Badge variant="info">
                  Pending replies: {week.pending_recommendation_response_count}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {week.clients.map((row) => (
                <div
                  key={`${row.week_start}-${row.client_id}`}
                  className="rounded-lg border border-stone-800 bg-stone-900 p-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/clients/${row.client_id}`}
                        className="text-sm font-semibold text-stone-100 hover:underline"
                      >
                        {row.client_name}
                      </Link>
                      <p className="mt-1 text-xs text-stone-500">
                        {row.service_labels.length > 0
                          ? row.service_labels.join(', ')
                          : 'No active service type'}
                      </p>
                    </div>
                    <Badge variant={RECOMMENDATION_STATUS_BADGES[row.recommendation_status]}>
                      Recommendation: {toTitle(row.recommendation_status)}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-stone-300 md:grid-cols-4">
                    <p>Sessions: {row.session_count}</p>
                    <p>Projected revenue: {formatCurrency(row.projected_revenue_cents)}</p>
                    <p>Open requests: {row.open_request_count}</p>
                    <p>
                      Next session:{' '}
                      {row.next_session_date
                        ? format(parseISO(`${row.next_session_date}T00:00:00`), 'EEE, MMM d')
                        : 'Not set'}
                    </p>
                  </div>

                  {(row.repeat_signals.length > 0 || row.avoid_signals.length > 0) && (
                    <div className="mt-2 space-y-1 text-xs text-stone-400">
                      {row.repeat_signals.length > 0 && (
                        <p>Repeat signals: {row.repeat_signals.join(', ')}</p>
                      )}
                      {row.avoid_signals.length > 0 && (
                        <p>Avoid signals: {row.avoid_signals.join(', ')}</p>
                      )}
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <RecurringBoardRowActions
                      clientId={row.client_id}
                      weekStart={row.week_start}
                      openRequestCount={row.open_request_count}
                      recommendationStatus={row.recommendation_status}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/clients/${row.client_id}/recurring`}>
                        <Button size="sm" variant="secondary">
                          Open Recurring Workspace
                        </Button>
                      </Link>
                      <Link href={`/clients/${row.client_id}`}>
                        <Button size="sm" variant="ghost">
                          Open Client Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
