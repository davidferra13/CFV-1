'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import type { GodModeResolvedItem, InlineAction } from '@/lib/discovery/god-mode-types'
import { executeInlineAction } from '@/lib/discovery/inline-action-registry'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, string> = {
  lightning: '⚡',
  chat: '💬',
  dollar: '💰',
  calendar: '📅',
  document: '📄',
  check: '✓',
  alert: '⚠',
  network: '🌐',
  clock: '⏰',
}

function IntelActionButton({ action }: { action: InlineAction }) {
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    startTransition(async () => {
      try {
        await executeInlineAction(action.action, action.params)
      } catch {
        // non-critical
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'text-[10px] px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors',
        'opacity-0 group-hover:opacity-100',
        isPending && 'opacity-50'
      )}
    >
      {action.label}
    </button>
  )
}

export function RailIntelCard({
  item,
  categoryColor,
}: {
  item: GodModeResolvedItem
  categoryColor: string
}) {
  const icon = item.icon ? (ICON_MAP[item.icon] ?? item.icon) : null
  const isCritical = item.score != null && item.score >= 80
  const hasDestination = !!item.destination

  const dotColor = categoryColor.includes('text-')
    ? (categoryColor.split(' ').find((c) => c.startsWith('text-')) ?? 'text-stone-500')
    : 'text-stone-500'

  const content = (
    <div
      className={cn(
        'group flex items-start gap-2 py-1 px-2 rounded-md transition-colors',
        'hover:bg-stone-800/60',
        hasDestination && 'cursor-pointer'
      )}
    >
      {/* Colored dot */}
      <span
        className={cn('mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0', dotColor)}
        style={{
          backgroundColor: 'currentColor',
        }}
        aria-hidden
      />

      {/* Icon */}
      {icon && (
        <span className="flex-shrink-0 text-xs mt-0.5" aria-hidden>
          {icon}
        </span>
      )}

      {/* Label + context */}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate max-w-[180px] text-xs text-stone-300 group-hover:text-stone-100 transition-colors">
          {item.label}
        </span>
        {item.context && (
          <span className="truncate max-w-[180px] text-[10px] text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.context}
          </span>
        )}
      </span>

      {/* Critical indicator */}
      {isCritical && (
        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" aria-hidden />
      )}

      {/* Inline action (first only) */}
      {item.inlineActions && item.inlineActions.length > 0 && (
        <IntelActionButton action={item.inlineActions[0]} />
      )}
    </div>
  )

  if (hasDestination) {
    return (
      <Link href={item.destination} className="no-underline block">
        {content}
      </Link>
    )
  }

  return content
}
