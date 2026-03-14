// TakeAChef Dashboard Widget — Actionable command center, not just stats.
// Server component — data is fetched at render time, no client JS needed.

import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  getTakeAChefStats,
  getTakeAChefDailyStats,
  getTakeAChefActionableLeads,
} from '@/lib/gmail/take-a-chef-stats'
import { TacWelcomeGuide } from './tac-welcome-guide'

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

function formatAge(hours: number): string {
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export async function TacDashboardWidget() {
  let stats
  let dailyStats
  let actionable
  try {
    ;[stats, dailyStats, actionable] = await Promise.all([
      getTakeAChefStats(),
      getTakeAChefDailyStats(),
      getTakeAChefActionableLeads(),
    ])
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
              <p className="text-sm font-medium text-stone-300">TakeAChef Leads</p>
              <p className="text-xs text-stone-400 mt-1">
                Connect your Gmail to automatically pull in TakeAChef leads. We detect TakeAChef
                emails and create inquiries for you.
              </p>
            </div>
            <Link
              href="/settings/integrations"
              className="text-xs font-medium text-brand-600 hover:text-brand-400 whitespace-nowrap"
            >
              Connect Gmail
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
          <CardTitle className="text-sm font-semibold text-stone-200">
            TakeAChef Command Center
          </CardTitle>
          <div className="flex items-center gap-2">
            {stats.staleCount > 0 && <Badge variant="error">{stats.staleCount} stale</Badge>}
            {stats.totalAllTime > 0 && <Badge variant="default">{stats.totalAllTime} total</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-3 space-y-3">
        {/* First-run guide — dismissible */}
        <TacWelcomeGuide />

        {/* Untouched Leads — action required */}
        {actionable.untouched.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant={stats.staleCount > 0 ? 'error' : 'warning'}>
                {actionable.untouched.length} Untouched
              </Badge>
              <span className="text-xs text-stone-500">
                Send a menu or decline — don't leave them hanging
              </span>
            </div>
            <div className="space-y-1">
              {actionable.untouched.slice(0, 5).map((lead) => {
                const isStale = lead.ageHours > 24
                return (
                  <div
                    key={lead.id}
                    className={`flex items-center justify-between text-sm rounded px-2 py-1.5 ${
                      isStale ? 'bg-red-950' : 'bg-amber-950/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-stone-200 truncate">{lead.clientName}</span>
                      <span
                        className={`text-xs ${isStale ? 'text-red-600 font-medium' : 'text-stone-500'}`}
                      >
                        {formatAge(lead.ageHours)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {lead.externalLink && (
                        <a
                          href={lead.externalLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-600 hover:text-brand-400"
                        >
                          TakeAChef
                        </a>
                      )}
                      <Link href={`/inquiries/${lead.id}`}>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                          Open
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Awaiting Chef Response */}
        {actionable.awaitingChef.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="warning">{actionable.awaitingChef.length} Awaiting Response</Badge>
              <span className="text-xs text-stone-500">
                Check TakeAChef and update the status here
              </span>
            </div>
            <div className="space-y-1">
              {actionable.awaitingChef.slice(0, 5).map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between text-sm rounded px-2 py-1.5 bg-yellow-950/50"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-medium text-stone-200 truncate">{lead.clientName}</span>
                    <span className="text-xs text-stone-500">{formatAge(lead.ageHours)}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {lead.externalLink && (
                      <a
                        href={lead.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-600 hover:text-brand-400"
                      >
                        TakeAChef
                      </a>
                    )}
                    <Link href={`/inquiries/${lead.id}`}>
                      <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                        Update
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary Stats Row */}
        <div className="flex items-center justify-between text-sm px-2 py-1 -mx-2">
          <Link
            href="/inquiries?channel=take_a_chef&status=new"
            className="text-stone-400 hover:text-stone-100"
          >
            New Leads
          </Link>
          <span className="font-semibold text-stone-100">{stats.newLeads}</span>
        </div>
        <div className="flex items-center justify-between text-sm px-2 py-1 -mx-2">
          <span className="text-stone-400">Confirmed</span>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-100">{stats.confirmed}</span>
            {stats.confirmed > 0 && <Badge variant="success">Booked</Badge>}
          </div>
        </div>

        {/* Daily Inquiry Volume */}
        {dailyStats && (
          <div className="mt-2 pt-2 border-t border-stone-800">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
              Inquiry Volume
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              <div className="rounded-md bg-stone-800 px-2 py-1.5 text-center">
                <p className="text-base font-bold text-stone-100">{dailyStats.today}</p>
                <p className="text-[10px] text-stone-500">Today</p>
              </div>
              <div className="rounded-md bg-stone-800 px-2 py-1.5 text-center">
                <p className="text-base font-bold text-stone-100">{dailyStats.yesterday}</p>
                <p className="text-[10px] text-stone-500">Yesterday</p>
              </div>
              <div className="rounded-md bg-stone-800 px-2 py-1.5 text-center">
                <p className="text-base font-bold text-stone-100">{dailyStats.thisWeek}</p>
                <p className="text-[10px] text-stone-500">Week</p>
              </div>
              <div className="rounded-md bg-stone-800 px-2 py-1.5 text-center">
                <p className="text-base font-bold text-stone-100">{dailyStats.thisMonth}</p>
                <p className="text-[10px] text-stone-500">Month</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="py-2 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/marketplace"
            className="text-xs text-brand-600 hover:text-brand-400 font-medium"
          >
            Open marketplace command center
          </Link>
          <Link
            href="/marketplace/capture"
            className="text-xs text-stone-400 hover:text-stone-100 font-medium"
          >
            Capture live page
          </Link>
        </div>
        {stats.lastSyncAt && (
          <p className="text-xs text-muted-foreground">Synced {formatSyncAge(stats.lastSyncAt)}</p>
        )}
      </CardFooter>
    </Card>
  )
}
