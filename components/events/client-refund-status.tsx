import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { getClientRefundStatus } from '@/lib/events/refund-status-actions'
import { formatCurrency } from '@/lib/utils/currency'

function statusBadgeVariant(status: 'pending' | 'processed' | 'failed') {
  if (status === 'processed') return 'success'
  if (status === 'failed') return 'error'
  return 'warning'
}

function stateClasses(state: 'completed' | 'current' | 'upcoming') {
  if (state === 'completed') return 'bg-emerald-500 border-emerald-400'
  if (state === 'current') return 'bg-amber-500 border-amber-400'
  return 'bg-stone-700 border-stone-600'
}

type Props = {
  eventId: string
}

export async function ClientRefundStatus({ eventId }: Props) {
  const refundState = await getClientRefundStatus(eventId)
  if (!refundState) return null

  if (!refundState.awaitingRefund && refundState.entries.length === 0) {
    return null
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Refund Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {refundState.awaitingRefund && (
          <Alert variant="warning">
            <div className="space-y-1">
              <p className="font-medium">A refund has not been initiated yet.</p>
              <p>
                Once your chef issues the refund, progress will appear here. After a refund is
                processed, banks typically complete the return within 3 to 5 business days.
              </p>
            </div>
          </Alert>
        )}

        {refundState.entries.length > 0 && (
          <>
            <div className="rounded-xl border border-stone-700 bg-stone-900/70 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-stone-400">Total refunded so far</p>
                  <p className="text-2xl font-bold text-stone-100">
                    {formatCurrency(refundState.totalRefundedCents)}
                  </p>
                </div>
                <div className="text-sm text-stone-400">
                  Paid in total: {formatCurrency(refundState.totalPaidCents)}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {refundState.entries.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-stone-700 bg-stone-900/70 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-stone-100">
                          {formatCurrency(entry.amountCents)} refund
                        </p>
                        <Badge variant={statusBadgeVariant(entry.status)}>
                          {entry.status === 'processed'
                            ? 'Sent Back'
                            : entry.status === 'failed'
                              ? 'Needs Retry'
                              : 'Processing'}
                        </Badge>
                        {entry.source === 'manual' && <Badge variant="info">Manual</Badge>}
                      </div>
                      <p className="text-sm text-stone-400">
                        {entry.reason || 'No refund note was provided.'}
                      </p>
                      <p className="text-xs text-stone-500">
                        {entry.methodLabel
                          ? `${entry.methodLabel} refund`
                          : 'Original payment method'}
                      </p>
                    </div>
                    <div className="text-sm text-stone-400">
                      Initiated {format(parseISO(entry.initiatedAt), 'MMM d, h:mm a')}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    {entry.timeline.map((step) => (
                      <div
                        key={step.key}
                        className="rounded-lg border border-stone-800 bg-stone-950/70 p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex h-3 w-3 rounded-full border ${stateClasses(step.state)}`}
                          />
                          <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
                            {step.label}
                          </p>
                        </div>
                        <p className="mt-2 text-sm text-stone-200">
                          {step.at ? format(parseISO(step.at), 'MMM d') : 'Pending'}
                        </p>
                      </div>
                    ))}
                  </div>

                  {entry.status === 'processed' && entry.estimatedCompletionAt && (
                    <p className="mt-3 text-xs text-stone-500">
                      Estimated bank completion by{' '}
                      {format(parseISO(entry.estimatedCompletionAt), 'MMMM d')}.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
