'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import type { CircleDetail } from '@/lib/hub/circle-detail-actions'
import { CircleRail, type CircleRailItem } from './circle-rail'
import { ChannelSidebar } from './channel-sidebar'
import { ChannelContent } from './channel-content'
import type { ChannelKey } from './channel-types'

type Props = {
  circles: CircleRailItem[]
  activeCircleId: string
  circle: CircleDetail
  onSelectCircle: (id: string) => void
  children: React.ReactNode
}

export function CircleLayout({ circles, activeCircleId, circle, onSelectCircle, children }: Props) {
  const [activeChannel, setActiveChannel] = useState<ChannelKey>('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex h-[calc(100vh-var(--header-height,64px))]">
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed left-2 top-[calc(var(--header-height,64px)+8px)] z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-stone-800 text-stone-300 shadow-lg md:hidden"
        aria-label="Toggle circle navigation"
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Circle rail (desktop: always visible, mobile: slide-out) */}
      <div
        className={cn(
          'z-40 flex-shrink-0',
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:transition-transform max-md:duration-200',
          mobileMenuOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        )}
      >
        <CircleRail
          circles={circles}
          activeCircleId={activeCircleId}
          onSelectCircle={(id) => {
            onSelectCircle(id)
            setMobileMenuOpen(false)
          }}
        />
      </div>

      {/* Channel sidebar (desktop: always visible, mobile: slide-out) */}
      <div
        className={cn(
          'z-40 flex-shrink-0',
          'max-md:fixed max-md:inset-y-0 max-md:left-[72px] max-md:transition-transform max-md:duration-200',
          mobileMenuOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-[312px]'
        )}
      >
        <ChannelSidebar
          activeChannel={activeChannel}
          onSelectChannel={(key) => {
            setActiveChannel(key)
            setMobileMenuOpen(false)
          }}
          circleName={circle.name}
          circleEmoji={circle.emoji}
        />
      </div>

      {/* Content pane */}
      <div className="flex-1 overflow-y-auto bg-[#313338] p-6">
        <ChannelContent activeChannel={activeChannel} circle={circle} />
        {children}
      </div>
    </div>
  )
}
