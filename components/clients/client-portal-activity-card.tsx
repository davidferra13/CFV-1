import Link from 'next/link'
import { ActivityTimestamp } from '@/components/ui/activity-timestamp'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  buildClientPortalActivitySummary,
  type ClientActivityIntentLevel,
  type ClientPortalActivityAction,
} from '@/lib/activity/client-activity-summary'
import type { ActivityEvent } from '@/lib/activity/types'

type ClientPortalActivityCardProps = {
  clientId: string
  clientName: string
  events: ActivityEvent[]
}

const INTENT_BADGE_VARIANT: Record<
  ClientActivityIntentLevel,
  'default' | 'success' | 'warning' | 'error' | 'info'
> = {
  urgent: 'warning',
  interested: 'info',
  active: 'success',
  passive: 'default',
  none: 'default',
}

export function ClientPortalActivityCard({
  clientId,
  clientName,
  events,
}: ClientPortalActivityCardProps) {
  const summary = buildClientPortalActivitySummary(events, clientId)

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Recent Portal Activity</CardTitle>
            <p className="mt-1 text-sm text-stone-400">
              Client-side ChefFlow signals connected to follow-up work for {clientName}.
            </p>
          </div>
          <Badge variant={INTENT_BADGE_VARIANT[summary.intentLevel]} className="w-fit">
            {summary.intentLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.lastActivity ? (
          <>
            <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Last Activity
              </p>
              <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-semibold text-stone-100">{summary.lastActivity.label}</p>
                <ActivityTimestamp
                  at={summary.lastActivity.occurredAt}
                  className="text-xs text-stone-400"
                />
              </div>
              {summary.lastActivity.detail ? (
                <p className="mt-1 text-sm text-stone-400">{summary.lastActivity.detail}</p>
              ) : null}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                Recent Signals
              </p>
              <div className="mt-2 divide-y divide-stone-800 rounded-lg border border-stone-700">
                {summary.recentSignals.map((signal) => {
                  const row = (
                    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-stone-100">{signal.label}</p>
                        {signal.detail ? (
                          <p className="mt-0.5 truncate text-xs text-stone-400">{signal.detail}</p>
                        ) : null}
                      </div>
                      <ActivityTimestamp
                        at={signal.occurredAt}
                        className="shrink-0 text-xs text-stone-500"
                      />
                    </div>
                  )

                  return signal.href ? (
                    <Link
                      key={signal.id}
                      href={signal.href}
                      className="block transition-colors hover:bg-stone-800"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div key={signal.id}>{row}</div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-4">
            <p className="text-sm font-semibold text-stone-100">No portal activity recorded</p>
            <p className="mt-1 text-sm text-stone-400">
              This card will show real client portal visits, quote views, payment visits, messages,
              and RSVP actions after they happen.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {summary.nextActions.map((action) => (
            <ActionLink key={`${action.href}-${action.label}`} action={action} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function ActionLink({ action }: { action: ClientPortalActivityAction }) {
  return (
    <Link href={action.href}>
      <Button variant={action.emphasis === 'primary' ? 'primary' : 'secondary'} size="sm">
        {action.label}
      </Button>
    </Link>
  )
}
