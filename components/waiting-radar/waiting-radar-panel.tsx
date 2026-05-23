'use client'

import Link from 'next/link'
import type { WaitingItem, WaitingRadarSummary } from '@/lib/waiting-radar/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

function riskColor(level: string): string {
  switch (level) {
    case 'critical':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    case 'high':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    default:
      return 'bg-stone-500/20 text-stone-400 border-stone-500/30'
  }
}

function waitingOnLabel(on: string): string {
  switch (on) {
    case 'client': return 'Client'
    case 'chef': return 'You'
    case 'vendor': return 'Vendor'
    case 'payment': return 'Payment'
    case 'system': return 'System'
    case 'staff': return 'Staff'
    case 'time': return 'Time'
    case 'decision': return 'Decision'
    default: return 'Unknown'
  }
}

function waitingOnColor(on: string): string {
  switch (on) {
    case 'chef': return 'bg-blue-500/20 text-blue-400'
    case 'client': return 'bg-purple-500/20 text-purple-400'
    case 'payment': return 'bg-green-500/20 text-green-400'
    case 'vendor': return 'bg-amber-500/20 text-amber-400'
    default: return 'bg-stone-500/20 text-stone-400'
  }
}

function formatAge(since: string): string {
  const hours = (Date.now() - new Date(since).getTime()) / (1000 * 60 * 60)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${Math.floor(hours)}h`
  const days = Math.floor(hours / 24)
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  const weeks = Math.floor(days / 7)
  return weeks === 1 ? '1 week' : `${weeks} weeks`
}

export function WaitingRadarPanel({
  items,
  summary,
}: {
  items: WaitingItem[]
  summary: WaitingRadarSummary
}) {
  const top5 = items.slice(0, 5)

  if (summary.total === 0) {
    return (
      <Card className="border-stone-700 bg-stone-800/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-stone-300">Waiting Radar</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">Nothing is waiting. All clear.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-stone-700 bg-stone-800/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-stone-300">Waiting Radar</CardTitle>
          <Link
            href="/waiting"
            className="text-xs text-amber-500 hover:text-amber-400 transition-colors"
          >
            View all ({summary.total})
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          {summary.overdue > 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-400">
              {summary.overdue} overdue
            </span>
          )}
          {summary.dueSoon > 0 && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-yellow-400">
              {summary.dueSoon} due soon
            </span>
          )}
          {summary.waitingOnClient > 0 && (
            <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-purple-400">
              {summary.waitingOnClient} on client
            </span>
          )}
          {summary.waitingOnChef > 0 && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-blue-400">
              {summary.waitingOnChef} on you
            </span>
          )}
        </div>

        <div className="space-y-2">
          {top5.map((item) => (
            <Link
              key={item.id}
              href={item.proofHref}
              className="group flex items-start gap-2 rounded-lg p-2 hover:bg-stone-700/50 transition-colors"
            >
              <Badge className={`shrink-0 text-[10px] ${waitingOnColor(item.waitingOn)}`}>
                {waitingOnLabel(item.waitingOn)}
              </Badge>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-stone-300 truncate group-hover:text-stone-100">
                  {item.waitingReason}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-stone-500">{formatAge(item.waitingSince)}</span>
                  {item.followUpAt && (
                    <span
                      className={`text-[10px] ${
                        new Date(item.followUpAt) < new Date() ? 'text-red-400' : 'text-stone-500'
                      }`}
                    >
                      {new Date(item.followUpAt) < new Date() ? 'Overdue' : 'Follow up ' + new Date(item.followUpAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <Badge className={`shrink-0 text-[10px] ${riskColor(item.riskLevel)}`}>
                {item.riskLevel}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function WaitingRadarFullView({
  items,
  summary,
}: {
  items: WaitingItem[]
  summary: WaitingRadarSummary
}) {
  if (summary.total === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg text-stone-400">Nothing is waiting right now.</p>
        <p className="text-sm text-stone-500 mt-1">
          When inquiries, quotes, contracts, or payments need attention, they will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        <SummaryCard label="Total" value={summary.total} color="text-stone-300" />
        <SummaryCard label="Overdue" value={summary.overdue} color="text-red-400" />
        <SummaryCard label="Due Soon" value={summary.dueSoon} color="text-yellow-400" />
        <SummaryCard label="On Client" value={summary.waitingOnClient} color="text-purple-400" />
        <SummaryCard label="On You" value={summary.waitingOnChef} color="text-blue-400" />
        <SummaryCard label="Payment" value={summary.waitingOnPayment} color="text-green-400" />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.proofHref}
            className="group flex items-center gap-3 rounded-lg border border-stone-700 bg-stone-800/50 p-3 hover:border-stone-600 hover:bg-stone-800 transition-colors"
          >
            <Badge className={`shrink-0 text-xs ${waitingOnColor(item.waitingOn)}`}>
              {waitingOnLabel(item.waitingOn)}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-stone-200 truncate group-hover:text-white">
                {item.waitingReason}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-stone-500">
                <span>{item.sourceKind}</span>
                <span>waiting {formatAge(item.waitingSince)}</span>
                {item.clientName && <span>{item.clientName}</span>}
                {item.eventName && <span>{item.eventName}</span>}
                {item.followUpAt && (
                  <span
                    className={
                      new Date(item.followUpAt) < new Date() ? 'text-red-400 font-medium' : ''
                    }
                  >
                    {new Date(item.followUpAt) < new Date()
                      ? 'OVERDUE'
                      : `Follow up ${new Date(item.followUpAt).toLocaleDateString()}`}
                  </span>
                )}
              </div>
            </div>
            {item.revenueCents != null && item.revenueCents > 0 && (
              <span className="shrink-0 text-xs text-green-400 font-medium">
                ${(item.revenueCents / 100).toLocaleString()}
              </span>
            )}
            <Badge className={`shrink-0 text-xs ${riskColor(item.riskLevel)}`}>
              {item.riskLevel}
            </Badge>
          </Link>
        ))}
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: string
}) {
  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/50 p-3 text-center">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="text-xs text-stone-500 mt-0.5">{label}</p>
    </div>
  )
}
