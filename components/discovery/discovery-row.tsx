'use client'

import { useRef } from 'react'
import type {
  DiscoveryRailItem,
  HomepageDiscoveryLane,
  DiscoveryRowRole,
} from '@/lib/discovery/homepage-discovery-rail'
import { DiscoveryCard } from '@/components/discovery/discovery-card'

interface DiscoveryRowProps {
  role: DiscoveryRowRole
  lane: HomepageDiscoveryLane
  label: string
  items: DiscoveryRailItem[]
  className?: string
  labelClassName?: string
  ariaLabel: string
  showSeparator?: boolean
  pinnedKeys?: Set<string>
  selectedKeys?: Set<string>
  onItemLove?: (item: DiscoveryRailItem) => void
  onItemPin?: (item: DiscoveryRailItem) => void
  onItemHide?: (item: DiscoveryRailItem) => void
  onItemSelect?: (item: DiscoveryRailItem) => void
  scrollRef?: React.Ref<HTMLDivElement>
}

const LANE_DOT_COLOR: Record<HomepageDiscoveryLane, string> = {
  taste: 'bg-amber-400/60',
  occasion: 'bg-emerald-400/50',
  chefflow_picks: 'bg-violet-400/55',
}

function itemKey(item: DiscoveryRailItem): string {
  return `${item.type}:${item.label}:${item.href}`
}

export function DiscoveryRow({
  role,
  lane,
  label,
  items,
  className = '',
  labelClassName = '',
  ariaLabel,
  showSeparator,
  pinnedKeys,
  selectedKeys,
  onItemLove,
  onItemPin,
  onItemHide,
  onItemSelect,
  scrollRef,
}: DiscoveryRowProps) {
  const internalRef = useRef<HTMLDivElement>(null)
  const ref = scrollRef ?? (internalRef as React.Ref<HTMLDivElement>)
  const loopedItems = [...items, ...items]

  return (
    <div className={className} role="region" aria-label={ariaLabel}>
      {showSeparator && <div className="discovery-lane-separator mx-4" />}

      <div className={`flex items-center gap-2 px-4 mb-2 ${labelClassName}`}>
        <span className={`h-2 w-2 rounded-full ${LANE_DOT_COLOR[lane]}`} aria-hidden="true" />
        <span
          className="font-medium text-white"
          style={{
            fontSize: 'var(--discovery-lane-label-size)',
            opacity: 'var(--discovery-text-secondary)',
          }}
        >
          {label}
        </span>
      </div>

      <div
        ref={ref}
        className="discovery-row-mask discovery-row-snap flex overflow-x-auto scrollbar-none"
        style={{ gap: 'var(--discovery-card-gap)' }}
        tabIndex={0}
        role="list"
        aria-label={`${label} discovery items`}
      >
        {loopedItems.map((item, i) => {
          const key = `${itemKey(item)}-${i}`
          const pinKey = itemKey(item)
          return (
            <div key={key} role="listitem" className="flex-shrink-0">
              <DiscoveryCard
                item={item}
                lane={lane}
                isPinned={pinnedKeys?.has(pinKey)}
                isSelected={selectedKeys?.has(pinKey)}
                onLove={onItemLove ? () => onItemLove(item) : undefined}
                onPin={onItemPin ? () => onItemPin(item) : undefined}
                onHide={onItemHide ? () => onItemHide(item) : undefined}
                onSelect={onItemSelect ? () => onItemSelect(item) : undefined}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
