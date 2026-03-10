'use client'

// Client Menu History Banner
// Compact, collapsible view of past menus served to a client.
// Shows in quote/event/menu contexts to help chefs avoid repeats.

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getClientMenuHistory as fetchMenuHistory } from '@/lib/clients/menu-history'
import type { ClientMenuHistory } from '@/lib/clients/menu-history'

export function ClientMenuHistoryBanner({ clientId }: { clientId: string }) {
  const [history, setHistory] = useState<ClientMenuHistory | null>(null)
  const [loading, startTransition] = useTransition()
  const [collapsed, setCollapsed] = useState(true)
  const [fetchFailed, setFetchFailed] = useState(false)

  useEffect(() => {
    if (!clientId) return
    setFetchFailed(false)
    startTransition(async () => {
      try {
        const data = await fetchMenuHistory(clientId)
        setHistory(data)
      } catch {
        setFetchFailed(true)
      }
    })
  }, [clientId])

  if (fetchFailed) {
    return (
      <Card className="p-3 border-red-800 bg-red-950/30">
        <p className="text-xs text-red-400">Could not load menu history for this client.</p>
      </Card>
    )
  }

  if (loading && !history) {
    return (
      <Card className="p-3 animate-pulse">
        <div className="h-4 bg-stone-800 rounded w-40" />
      </Card>
    )
  }

  if (!history || history.totalEvents === 0) return null

  return (
    <Card className="p-4 border-stone-700">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-stone-200">Past Menus</h3>
          <Badge variant="default">
            {history.totalEvents} past event{history.totalEvents === 1 ? '' : 's'}
          </Badge>
          {history.topComponents.length > 0 && !collapsed === false && (
            <span className="text-xs text-stone-500">
              Top:{' '}
              {history.topComponents
                .slice(0, 3)
                .map((c) => c.name)
                .join(', ')}
            </span>
          )}
        </div>
        <span className="text-xs text-stone-500 ml-2 flex-shrink-0">
          {collapsed ? 'Show' : 'Hide'}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-3 space-y-2">
          {/* Top components served */}
          {history.topComponents.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                Most Served Items
              </p>
              <div className="flex flex-wrap gap-1.5">
                {history.topComponents.map((comp) => (
                  <Badge key={comp.name} variant="default">
                    {comp.name} ({comp.count}x)
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Cuisines served */}
          {history.cuisinesServed.length > 0 && (
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
                Cuisines Served
              </p>
              <div className="flex flex-wrap gap-1.5">
                {history.cuisinesServed.map((c) => (
                  <Badge key={c} variant="info">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Recent events list */}
          <div className="border-t border-stone-800 pt-2 mt-2">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
              Recent Events
            </p>
            <div className="space-y-1">
              {history.entries.slice(0, 5).map((entry) => {
                const dateStr = new Date(entry.eventDate + 'T12:00:00Z').toLocaleDateString(
                  'en-US',
                  { month: 'short', day: 'numeric', year: 'numeric' }
                )
                const dishNames = entry.dishes.flatMap((d) => d.componentNames).slice(0, 3)

                return (
                  <div key={entry.eventId} className="text-xs">
                    <Link
                      href={`/events/${entry.eventId}`}
                      className="text-stone-200 hover:text-brand-600"
                    >
                      {entry.occasion || 'Event'}
                    </Link>
                    <span className="text-stone-500 ml-1">{dateStr}</span>
                    {entry.menuName && (
                      <span className="text-stone-500 ml-1">- {entry.menuName}</span>
                    )}
                    {dishNames.length > 0 && (
                      <span className="text-stone-500 ml-1">
                        ({dishNames.join(', ')}
                        {entry.dishes.flatMap((d) => d.componentNames).length > 3 ? ', ...' : ''})
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
