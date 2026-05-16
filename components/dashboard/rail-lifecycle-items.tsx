'use client'

import Link from 'next/link'
import type { RailItem } from '@/lib/rail/types'
import { cn } from '@/lib/utils'

interface Props {
  critical: RailItem[]
  action: RailItem[]
  awareness: RailItem[]
  opportunity: RailItem[]
}

function ItemWrapper({
  item,
  className,
  children,
}: {
  item: RailItem
  className?: string
  children: React.ReactNode
}) {
  if (item.actionUrl) {
    return (
      <Link href={item.actionUrl} className={cn('block', className)}>
        {children}
      </Link>
    )
  }
  return <div className={className}>{children}</div>
}

function CriticalTier({ items }: { items: RailItem[] }) {
  if (!items.length) return null
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <ItemWrapper
          key={item.id}
          item={item}
          className="rounded-lg border border-red-800/40 bg-red-950/30 px-3 py-2.5 ring-1 ring-red-800/20"
        >
          <p className="text-sm font-medium text-red-200">{item.title}</p>
          {item.subtitle && <p className="mt-0.5 text-xs text-red-300/70">{item.subtitle}</p>}
        </ItemWrapper>
      ))}
    </div>
  )
}

function ActionTier({ items }: { items: RailItem[] }) {
  if (!items.length) return null
  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <ItemWrapper
          key={item.id}
          item={item}
          className="rounded-lg border border-amber-800/30 bg-amber-950/20 px-3 py-2"
        >
          <p className="text-sm font-medium text-amber-200">{item.title}</p>
          {item.subtitle && <p className="mt-0.5 text-xs text-amber-300/60">{item.subtitle}</p>}
        </ItemWrapper>
      ))}
    </div>
  )
}

function AwarenessTier({ items }: { items: RailItem[] }) {
  if (!items.length) return null
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <ItemWrapper
          key={item.id}
          item={item}
          className="rounded-full border border-stone-700/50 bg-stone-900/50 px-2.5 py-1"
        >
          <span className="text-xs text-stone-300">{item.title}</span>
        </ItemWrapper>
      ))}
    </div>
  )
}

function OpportunityTier({ items }: { items: RailItem[] }) {
  if (!items.length) return null
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <ItemWrapper key={item.id} item={item} className="px-1 py-0.5">
          <span className="text-xs text-stone-500">{item.title}</span>
        </ItemWrapper>
      ))}
    </div>
  )
}

export function RailLifecycleItems({ critical, action, awareness, opportunity }: Props) {
  return (
    <div className="space-y-3">
      <CriticalTier items={critical} />
      <ActionTier items={action} />
      <AwarenessTier items={awareness} />
      <OpportunityTier items={opportunity} />
    </div>
  )
}
