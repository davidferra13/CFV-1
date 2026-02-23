// TakeAChef Dashboard Widget — Shows TakeAChef lead stats on the chef dashboard.
// Server component — data is fetched at render time, no client JS needed.

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getTakeAChefStats, getTakeAChefDailyStats } from '@/lib/gmail/take-a-chef-stats'

function formatSyncAge(lastSyncAt: string): string {
  const diff = Date.now() - new Date(lastSyncAt).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export async function TacDashboardWidget() {
  let stats
  let dailyStats
  try {
    ;[stats, dailyStats] = await Promise.all([getTakeAChefStats(), getTakeAChefDailyStats()])
  } catch {
    return (
      <Card>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">Unable to load TakeAChef stats.</p>
        </CardContent>
      </Card>
    )
  }

  // If no data at all and never synced, show a connect prompt
  const isEmpty =
    stats.newLeads === 0 &&
    stats.awaitingResponse === 0 &&
    stats.confirmed === 0 &&
    stats.totalAllTime === 0 &&
    !stats.lastSyncAt

  if (isEmpty) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-stone-700">TakeAChef Leads</p>
              <p className="text-xs text-stone-400 mt-1">
                Connect your TakeAChef account to see leads here.
              </p>
            </div>
            <Link
              href="/settings/integrations"
              className="text-xs font-medium text-brand-600 hover:text-brand-700 whitespace-nowrap"
            >
              Connect TakeAChef
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-stone-800">TakeAChef Leads</CardTitle>
          {stats.totalAllTime > 0 && <Badge variant="default">{stats.totalAllTime}</Badge>}
        </div>
      </CardHeader>

      <CardContent className="px-4 py-3 space-y-2">
        {/* New Leads */}
        <Link
          href="/inquiries?channel=take_a_chef&status=new"
          className="flex items-center justify-between text-sm hover:bg-stone-50 rounded px-2 py-1.5 -mx-2 transition-colors"
        >
          <span className="text-stone-600">New Leads</span>
          <span className="font-semibold text-stone-900">{stats.newLeads}</span>
        </Link>

        {/* Awaiting Response */}
        <div className="flex items-center justify-between text-sm px-2 py-1.5 -mx-2">
          <span className="text-stone-600">Awaiting Response</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-900">{stats.awaitingResponse}</span>
            {stats.awaitingResponse > 0 && <Badge variant="warning">Action needed</Badge>}
          </div>
        </div>

        {/* Confirmed */}
        <div className="flex items-center justify-between text-sm px-2 py-1.5 -mx-2">
          <span className="text-stone-600">Confirmed</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-900">{stats.confirmed}</span>
            {stats.confirmed > 0 && <Badge variant="success">Booked</Badge>}
          </div>
        </div>
        {/* Daily Inquiry Volume — cuts through TakeAChef spam noise */}
        {dailyStats && (
          <div className="mt-3 pt-3 border-t border-stone-100">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
              Inquiry Volume
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-stone-50 px-2.5 py-2 text-center">
                <p className="text-lg font-bold text-stone-900">{dailyStats.today}</p>
                <p className="text-xs text-stone-500">Today</p>
              </div>
              <div className="rounded-md bg-stone-50 px-2.5 py-2 text-center">
                <p className="text-lg font-bold text-stone-900">{dailyStats.yesterday}</p>
                <p className="text-xs text-stone-500">Yesterday</p>
              </div>
              <div className="rounded-md bg-stone-50 px-2.5 py-2 text-center">
                <p className="text-lg font-bold text-stone-900">{dailyStats.thisWeek}</p>
                <p className="text-xs text-stone-500">This Week</p>
              </div>
              <div className="rounded-md bg-stone-50 px-2.5 py-2 text-center">
                <p className="text-lg font-bold text-stone-900">{dailyStats.thisMonth}</p>
                <p className="text-xs text-stone-500">This Month</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {stats.lastSyncAt && (
        <CardFooter className="py-2 px-4">
          <p className="text-xs text-muted-foreground">
            Last synced: {formatSyncAge(stats.lastSyncAt)}
          </p>
        </CardFooter>
      )}
    </Card>
  )
}
