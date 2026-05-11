'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { ClientPulse, PulseItem } from '@/lib/clients/pulse-actions'
import Link from 'next/link'

const URGENCY_STYLE: Record<
  string,
  { border: string; badge: 'error' | 'warning' | 'info' | 'success'; label: string }
> = {
  critical: { border: 'border-l-red-500', badge: 'error', label: 'Critical' },
  overdue: { border: 'border-l-amber-500', badge: 'warning', label: 'Overdue' },
  due: { border: 'border-l-blue-500', badge: 'info', label: 'Due' },
  ok: { border: 'border-l-stone-300 dark:border-l-stone-600', badge: 'success', label: 'OK' },
}

const TYPE_ICON: Record<string, string> = {
  inquiry: '💬',
  event: '📅',
  quote: '💰',
  followup: '🔔',
  comm: '📨',
  prospect: '📞',
  post_event: '✉️',
  draft: '📝',
}

type FilterKey = 'all' | 'critical' | 'overdue' | 'comms' | 'prospects'

const FILTER_EMPTY_MESSAGES: Record<FilterKey, string> = {
  all: 'Nobody is waiting on you. All caught up.',
  critical: 'No critical items right now.',
  overdue: 'Nothing overdue. Nice work.',
  comms: 'No inbound communications waiting.',
  prospects: 'No prospect follow-ups pending.',
}

export function PulseView({ clients }: { clients: ClientPulse[] }) {
  const [filter, setFilter] = useState<FilterKey>('all')

  const criticalCount = clients.filter((c) => c.worstUrgency === 'critical').length
  const overdueCount = clients.filter(
    (c) => c.worstUrgency === 'overdue' || c.worstUrgency === 'critical'
  ).length
  const commsCount = clients.filter((c) => c.items.some((i) => i.type === 'comm')).length
  const prospectsCount = clients.filter((c) => c.items.some((i) => i.type === 'prospect')).length

  const filtered = clients.filter((client) => {
    switch (filter) {
      case 'critical':
        return client.worstUrgency === 'critical'
      case 'overdue':
        return client.worstUrgency === 'overdue' || client.worstUrgency === 'critical'
      case 'comms':
        return client.items.some((i) => i.type === 'comm')
      case 'prospects':
        return client.items.some((i) => i.type === 'prospect')
      default:
        return true
    }
  })

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        <FilterTab
          label="All"
          count={clients.length}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <FilterTab
          label="Critical"
          count={criticalCount}
          active={filter === 'critical'}
          onClick={() => setFilter('critical')}
          color="red"
        />
        <FilterTab
          label="Overdue"
          count={overdueCount}
          active={filter === 'overdue'}
          onClick={() => setFilter('overdue')}
          color="amber"
        />
        <FilterTab
          label="Comms"
          count={commsCount}
          active={filter === 'comms'}
          onClick={() => setFilter('comms')}
        />
        <FilterTab
          label="Prospects"
          count={prospectsCount}
          active={filter === 'prospects'}
          onClick={() => setFilter('prospects')}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-stone-600 dark:text-stone-400 font-medium">
            {FILTER_EMPTY_MESSAGES[filter]}
          </p>
        </div>
      ) : (
        filtered.map((client) => {
          const style = URGENCY_STYLE[client.worstUrgency] || URGENCY_STYLE.ok

          return (
            <Card key={client.clientId} className={`border-l-4 ${style.border} overflow-hidden`}>
              <CardContent className="p-4 sm:p-5">
                {/* Client header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                        {client.clientName}
                      </h3>
                      <Badge variant={style.badge}>{style.label}</Badge>
                      {client.longestWaitDays > 0 && (
                        <span className="text-xs text-stone-400 dark:text-stone-500">
                          {client.longestWaitDays}d longest wait
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
                      {client.clientEmail && <span>{client.clientEmail}</span>}
                      {client.clientPhone && <span>{client.clientPhone}</span>}
                      {client.preferredContact && (
                        <span className="capitalize">prefers {client.preferredContact}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action items */}
                <div className="space-y-2">
                  {client.items.map((item, idx) => (
                    <PulseItemRow key={idx} item={item} clientEmail={client.clientEmail ?? null} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}

function PulseItemRow({ item, clientEmail }: { item: PulseItem; clientEmail: string | null }) {
  const style = URGENCY_STYLE[item.urgency] || URGENCY_STYLE.ok

  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-sm flex-shrink-0">{TYPE_ICON[item.type] || '📋'}</span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
            {item.label}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{item.detail}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Badge variant={style.badge} className="text-[10px] hidden sm:inline-flex">
          {item.daysWaiting}d
        </Badge>
        {clientEmail && (
          <a href={`mailto:${clientEmail}`} title="Quick email">
            <Button variant="ghost" size="sm" className="px-2">
              ✉️
            </Button>
          </a>
        )}
        <Link href={item.href}>
          <Button variant="ghost" size="sm">
            {item.actionLabel}
          </Button>
        </Link>
      </div>
    </div>
  )
}

function FilterTab({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
  color?: 'red' | 'amber'
}) {
  const base = 'px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer'

  let classes: string
  if (active) {
    if (color === 'red') {
      classes = `${base} bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300`
    } else if (color === 'amber') {
      classes = `${base} bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300`
    } else {
      classes = `${base} bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900`
    }
  } else {
    classes = `${base} bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700`
  }

  return (
    <button type="button" className={classes} onClick={onClick}>
      {label} ({count})
    </button>
  )
}
