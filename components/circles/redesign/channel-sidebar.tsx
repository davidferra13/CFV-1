'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { CHANNEL_CATEGORIES, type ChannelKey, type ChannelCategory } from './channel-types'

type Props = {
  activeChannel: ChannelKey
  onSelectChannel: (key: ChannelKey) => void
  circleName: string
  circleEmoji: string | null
  unreadMap?: Partial<Record<ChannelKey, number>>
}

export function ChannelSidebar({
  activeChannel,
  onSelectChannel,
  circleName,
  circleEmoji,
  unreadMap = {},
}: Props) {
  return (
    <div className="flex h-full w-60 flex-col border-r border-stone-800 bg-[#2b2d31]">
      {/* Circle header */}
      <div className="flex h-12 items-center gap-2 border-b border-stone-800 px-4 shadow-sm">
        <span className="text-lg">{circleEmoji ?? '🍽️'}</span>
        <h2 className="truncate text-sm font-semibold text-stone-100">{circleName}</h2>
      </div>

      {/* Channel list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* Home channel: always visible above categories */}
        <button
          onClick={() => onSelectChannel('home')}
          className={cn(
            'mb-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
            activeChannel === 'home'
              ? 'bg-stone-600/40 text-stone-100'
              : 'text-stone-400 hover:bg-stone-700/30 hover:text-stone-200'
          )}
        >
          <span className="text-base">🏠</span>
          <span className="font-medium">Home</span>
        </button>

        {/* Category groups */}
        {CHANNEL_CATEGORIES.map((cat) => (
          <CategoryGroup
            key={cat.id}
            category={cat}
            activeChannel={activeChannel}
            onSelectChannel={onSelectChannel}
            unreadMap={unreadMap}
          />
        ))}
      </div>
    </div>
  )
}

function CategoryGroup({
  category,
  activeChannel,
  onSelectChannel,
  unreadMap,
}: {
  category: ChannelCategory
  activeChannel: ChannelKey
  onSelectChannel: (key: ChannelKey) => void
  unreadMap: Partial<Record<ChannelKey, number>>
}) {
  const [collapsed, setCollapsed] = useState(false)

  const hasUnread = category.channels.some((ch) => (unreadMap[ch.key] ?? 0) > 0)

  return (
    <div className="mt-3">
      {/* Category header with collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-stone-500 hover:text-stone-300"
      >
        <svg
          className={cn('h-3 w-3 transition-transform', collapsed ? '-rotate-90' : 'rotate-0')}
          viewBox="0 0 12 12"
        >
          <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
        <span>{category.label}</span>
        {/* Dot indicator when collapsed with unread channels */}
        {collapsed && hasUnread && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
        )}
      </button>

      {/* Channel buttons */}
      {!collapsed && (
        <div className="mt-0.5 space-y-px">
          {category.channels.map((ch) => {
            const unread = unreadMap[ch.key] ?? 0
            const isActive = activeChannel === ch.key

            return (
              <button
                key={ch.key}
                onClick={() => onSelectChannel(ch.key)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-stone-600/40 text-stone-100'
                    : 'text-stone-400 hover:bg-stone-700/30 hover:text-stone-200',
                  unread > 0 && !isActive && 'font-medium text-stone-200'
                )}
              >
                <span className="text-base">{ch.icon}</span>
                <span className="flex-1 truncate text-left">{ch.label}</span>

                {/* Chef-only lock icon */}
                {ch.chefOnly && (
                  <svg
                    className="h-3.5 w-3.5 text-stone-600"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8 1a4 4 0 0 0-4 4v2H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V5a4 4 0 0 0-4-4zm2 6H6V5a2 2 0 1 1 4 0v2z" />
                  </svg>
                )}

                {/* Unread badge */}
                {unread > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
