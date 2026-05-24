'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'

export type CircleRailItem = {
  id: string
  name: string
  emoji: string | null
  hasActivity: boolean
  needsAttention: boolean
  unreadCount: number
}

type Props = {
  circles: CircleRailItem[]
  activeCircleId: string
  onSelectCircle: (id: string) => void
}

export function CircleRail({ circles, activeCircleId, onSelectCircle }: Props) {
  return (
    <div className="flex h-full w-[72px] flex-col items-center gap-2 overflow-y-auto bg-[#1e1f22] py-3">
      {circles.map((circle) => (
        <CircleRailButton
          key={circle.id}
          circle={circle}
          isActive={circle.id === activeCircleId}
          onSelect={() => onSelectCircle(circle.id)}
        />
      ))}
    </div>
  )
}

function CircleRailButton({
  circle,
  isActive,
  onSelect,
}: {
  circle: CircleRailItem
  isActive: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)

  const pillHeight = isActive ? 'h-10' : circle.hasActivity ? 'h-2' : 'h-0 group-hover:h-5'

  return (
    <div
      className="group relative flex items-center justify-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Active / activity indicator pill on left edge */}
      <div
        className={cn(
          'absolute left-0 w-1 rounded-r-full bg-white transition-all duration-200',
          pillHeight,
          !isActive && !circle.hasActivity && 'opacity-0 group-hover:opacity-100'
        )}
      />

      {/* Circle button */}
      <button
        onClick={onSelect}
        className={cn(
          'relative flex h-12 w-12 items-center justify-center text-xl transition-all duration-200',
          isActive
            ? 'rounded-2xl bg-brand-500 text-white'
            : 'rounded-[24px] bg-stone-700 text-stone-300 hover:rounded-2xl hover:bg-brand-500 hover:text-white'
        )}
        aria-label={circle.name}
      >
        <span className="text-lg">{circle.emoji ?? circle.name.charAt(0)}</span>

        {/* Unread badge, bottom-right */}
        {circle.unreadCount > 0 && (
          <span className="absolute -bottom-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {circle.unreadCount > 99 ? '99+' : circle.unreadCount}
          </span>
        )}

        {/* Needs attention amber ping, top-right */}
        {circle.needsAttention && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
          </span>
        )}
      </button>

      {/* Tooltip, appears to the right */}
      {hovered && (
        <div className="pointer-events-none absolute left-[68px] z-50 whitespace-nowrap rounded-md bg-stone-900 px-3 py-1.5 text-sm font-medium text-stone-100 shadow-lg">
          {circle.name}
        </div>
      )}
    </div>
  )
}
