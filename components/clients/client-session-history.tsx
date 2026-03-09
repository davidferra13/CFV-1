import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ClientRecentSession } from '@/lib/clients/self-service-actions'

type ClientSessionHistoryProps = {
  sessions: ClientRecentSession[]
}

function getSessionLabel(session: ClientRecentSession) {
  if (session.eventType === 'portal_login') return 'Portal access'
  if (session.eventType === 'payment_page_visited') return 'Payment page visit'
  return 'Recent account activity'
}

export function ClientSessionHistory({ sessions }: ClientSessionHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Session Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-stone-400">
          A rolling view of the latest times your client portal was opened. Device and location
          details improve as new sessions are recorded.
        </p>

        {sessions.length === 0 ? (
          <div className="rounded-xl border border-stone-700 bg-stone-900/70 p-4 text-sm text-stone-400">
            No recent session activity has been recorded yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="rounded-xl border border-stone-700 bg-stone-900/70 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-stone-100">{getSessionLabel(session)}</p>
                      <Badge variant="info">{session.deviceLabel || 'Unknown device'}</Badge>
                    </div>
                    <p className="text-sm text-stone-400">
                      {session.pagePath || 'Page path unavailable'}
                    </p>
                    <p className="text-xs text-stone-500">
                      {session.locationLabel || 'Location unavailable'}
                    </p>
                  </div>
                  <div className="text-right text-sm text-stone-400">
                    <p>
                      {formatDistanceToNowStrict(parseISO(session.occurredAt), { addSuffix: true })}
                    </p>
                    <p className="text-xs text-stone-500">
                      {new Date(session.occurredAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
