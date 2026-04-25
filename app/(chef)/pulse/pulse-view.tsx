'use client'

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
}

export function PulseView({ clients }: { clients: ClientPulse[] }) {
  return (
    <div className="space-y-4">
      {clients.map((client) => {
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
                  <PulseItemRow key={idx} item={item} />
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function PulseItemRow({ item }: { item: PulseItem }) {
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
        <Link href={item.href}>
          <Button variant="ghost" size="sm">
            {item.actionLabel}
          </Button>
        </Link>
      </div>
    </div>
  )
}
