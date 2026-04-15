'use client'

// MenuHealthScore - Readiness checklist for a menu (L3)
// Shows: dishes, costed, allergens reviewed, approval status, sent status.
// Each line is actionable - click takes chef to the relevant surface.

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { getMenuHealthData } from '@/lib/menus/actions'
import type { MenuHealthData } from '@/lib/menus/actions'

interface MenuHealthScoreProps {
  menuId: string
  className?: string
}

type RowStatus = 'ok' | 'warn' | 'na'

function StatusDot({ status }: { status: RowStatus }) {
  const color =
    status === 'ok' ? 'bg-emerald-400' : status === 'warn' ? 'bg-amber-400' : 'bg-stone-500'
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-1 ${color}`} />
}

function HealthRow({
  label,
  value,
  status,
  href,
}: {
  label: string
  value: string
  status: RowStatus
  href?: string
}) {
  const inner = (
    <div className="flex items-start justify-between gap-2 py-1.5 group">
      <div className="flex items-start gap-2 min-w-0">
        <StatusDot status={status} />
        <span className="text-xs text-stone-400 truncate">{label}</span>
      </div>
      <span
        className={`text-xs font-medium flex-shrink-0 ${
          status === 'ok'
            ? 'text-emerald-400'
            : status === 'warn'
              ? 'text-amber-400'
              : 'text-stone-500'
        } ${href ? 'group-hover:underline' : ''}`}
      >
        {value}
      </span>
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    )
  }
  return inner
}

function approvalLabel(status: string | null, hasEvent: boolean): string {
  if (!hasEvent) return 'No event'
  if (!status || status === 'not_sent') return 'Not sent'
  if (status === 'sent') return 'Awaiting'
  if (status === 'approved') return 'Approved'
  if (status === 'revision_requested') return 'Revision req.'
  if (status === 'cancelled') return 'Cancelled'
  return status
}

function approvalStatus(status: string | null, hasEvent: boolean): RowStatus {
  if (!hasEvent) return 'na'
  if (status === 'approved') return 'ok'
  if (status === 'sent') return 'na'
  return 'warn'
}

function sentStatus(status: string | null, hasEvent: boolean): RowStatus {
  if (!hasEvent) return 'na'
  if (status === 'sent' || status === 'approved') return 'ok'
  return 'warn'
}

export function MenuHealthScore({ menuId, className = '' }: MenuHealthScoreProps) {
  const [, startTransition] = useTransition()
  const [data, setData] = useState<MenuHealthData | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    startTransition(async () => {
      try {
        const result = await getMenuHealthData(menuId)
        setData(result)
      } catch {
        setFailed(true)
      }
    })
  }, [menuId])

  if (failed) return null

  if (!data) {
    return (
      <div className={`space-y-0.5 animate-pulse ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-6 bg-stone-800 rounded" />
        ))}
      </div>
    )
  }

  const costedCount = data.dishCount - data.dishesWithGaps
  const menuPath = `/culinary/menus/${menuId}`
  const eventPath = data.eventId ? `/events/${data.eventId}` : undefined

  return (
    <div className={`divide-y divide-stone-800 ${className}`}>
      <HealthRow
        label="Dishes"
        value={data.dishCount === 0 ? 'None' : String(data.dishCount)}
        status={data.dishCount > 0 ? 'ok' : 'warn'}
        href={menuPath}
      />
      <HealthRow
        label="Costed"
        value={data.dishCount === 0 ? 'N/A' : `${costedCount}/${data.dishCount}`}
        status={data.dishCount === 0 ? 'na' : data.dishesWithGaps === 0 ? 'ok' : 'warn'}
        href={menuPath}
      />
      <HealthRow
        label="Allergens reviewed"
        value={data.dishCount === 0 ? 'N/A' : data.allergenReviewed ? 'Yes' : 'No'}
        status={data.dishCount === 0 ? 'na' : data.allergenReviewed ? 'ok' : 'warn'}
        href={menuPath}
      />
      <HealthRow
        label="Sent to client"
        value={
          data.hasEvent
            ? data.approvalStatus === 'sent' || data.approvalStatus === 'approved'
              ? 'Yes'
              : 'No'
            : 'No event'
        }
        status={sentStatus(data.approvalStatus, data.hasEvent)}
        href={eventPath}
      />
      <HealthRow
        label="Approved"
        value={approvalLabel(data.approvalStatus, data.hasEvent)}
        status={approvalStatus(data.approvalStatus, data.hasEvent)}
        href={eventPath}
      />
    </div>
  )
}
