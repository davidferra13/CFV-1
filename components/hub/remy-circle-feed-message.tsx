'use client'

import type { HubMessage } from '@/lib/hub/types'

interface RemyCircleFeedMessageProps {
  message: HubMessage
  isChefView: boolean
}

/**
 * Renders a Remy message in the circle feed.
 * Chef-only messages get whisper treatment (dimmed, lock icon).
 */
export function RemyCircleFeedMessage({ message, isChefView }: RemyCircleFeedMessageProps) {
  const meta = message.system_metadata as Record<string, unknown> | null
  const isChefOnly = meta?.remy_visible === 'chef_only'

  // Chef-only messages should only render for chef - but server already filters.
  // This is a client-side safety check.
  if (isChefOnly && !isChefView) return null

  return (
    <div
      className={`flex gap-3 px-4 py-3 ${
        isChefOnly ? 'bg-amber-950/20 border-l-2 border-amber-700/40' : ''
      }`}
    >
      {/* Remy Avatar */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-orange-700 text-sm">
        🐀
      </div>

      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-amber-400">Remy</span>
          <span className="rounded-full bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-500">
            AI
          </span>
          {isChefOnly && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              only you can see this
            </span>
          )}
          <span className="text-[10px] text-stone-500">
            {new Date(message.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Body */}
        <div
          className={`mt-1 text-sm leading-relaxed ${isChefOnly ? 'text-amber-200/80' : 'text-stone-200'}`}
        >
          {message.body}
        </div>
      </div>
    </div>
  )
}
