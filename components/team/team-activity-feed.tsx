import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getTeamActivity, type TeamActivityItem } from '@/lib/team/activity-actions'

function getRelativeTime(timestamp: string): string {
  const now = Date.now()
  const then = new Date(timestamp).getTime()
  const diffMs = now - then

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

  if (months > 0) return rtf.format(-months, 'month')
  if (weeks > 0) return rtf.format(-weeks, 'week')
  if (days > 0) return rtf.format(-days, 'day')
  if (hours > 0) return rtf.format(-hours, 'hour')
  if (minutes > 0) return rtf.format(-minutes, 'minute')
  return rtf.format(-seconds, 'second')
}

function ActivityIcon({ type }: { type: TeamActivityItem['type'] }) {
  if (type === 'joined') {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/10">
        <svg
          className="h-4 w-4 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      </div>
    )
  }

  if (type === 'removed') {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-400/10">
        <svg
          className="h-4 w-4 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
          />
        </svg>
      </div>
    )
  }

  // invited
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-500/10">
      <svg
        className="h-4 w-4 text-brand-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        />
      </svg>
    </div>
  )
}

function activityMessage(item: TeamActivityItem): string {
  switch (item.type) {
    case 'invited':
      return `${item.memberName} was invited to the team`
    case 'joined':
      return `${item.memberName} joined the team`
    case 'removed':
      return `${item.memberName} was removed from the team`
  }
}

export async function TeamActivityFeed() {
  const activities = await getTeamActivity(15)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-stone-400">No recent activity</p>
        ) : (
          <div className="space-y-4">
            {activities.map((item, i) => (
              <div key={`${item.type}-${item.timestamp}-${i}`} className="flex items-start gap-3">
                <ActivityIcon type={item.type} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-stone-200">{activityMessage(item)}</p>
                  <p className="text-xs text-stone-500">{getRelativeTime(item.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
