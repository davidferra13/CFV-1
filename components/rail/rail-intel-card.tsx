'use client'

import Link from 'next/link'
import { useTransition, type MouseEvent } from 'react'
import type { GodModeResolvedItem, InlineAction } from '@/lib/discovery/god-mode-types'
import { executeInlineAction } from '@/lib/discovery/inline-action-registry'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  DollarSign,
  FileText,
  Globe,
  MessageCircle,
  User,
  Utensils,
  Zap,
  type LucideIcon,
} from '@/components/ui/icons'

const ICON_MAP: Record<string, LucideIcon> = {
  lightning: Zap,
  zap: Zap,
  chat: MessageCircle,
  message: MessageCircle,
  dollar: DollarSign,
  calendar: Calendar,
  document: FileText,
  check: Check,
  'check-circle': Check,
  alert: AlertTriangle,
  'alert-triangle': AlertTriangle,
  network: Globe,
  clock: Clock,
  user: User,
  utensils: Utensils,
}

function IntelActionButton({ action }: { action: InlineAction }) {
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    e.preventDefault()
    startTransition(async () => {
      try {
        await executeInlineAction(action.action, action.params)
      } catch {
        // Keep rail interactions non-blocking.
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-stone-300 transition-colors hover:bg-stone-700',
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
  const Icon = item.icon ? ICON_MAP[item.icon] : null
  const isCritical = item.score != null && item.score >= 80
  const hasDestination = !!item.destination

  const dotColor = categoryColor.includes('text-')
    ? (categoryColor.split(' ').find((c) => c.startsWith('text-')) ?? 'text-stone-500')
    : 'text-stone-500'

  const content = (
    <div
      className={cn(
        'group flex items-start gap-2 rounded-md px-2 py-1 transition-colors',
        'hover:bg-stone-800/60',
        hasDestination && 'cursor-pointer'
      )}
    >
      <span
        className={cn('mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full', dotColor)}
        style={{ backgroundColor: 'currentColor' }}
        aria-hidden
      />

      {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-stone-500" aria-hidden />}

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="max-w-[180px] truncate text-xs text-stone-300 transition-colors group-hover:text-stone-100">
          {item.label}
        </span>
        {item.context && (
          <span className="max-w-[180px] truncate text-[10px] text-stone-500 opacity-0 transition-opacity group-hover:opacity-100">
            {item.context}
          </span>
        )}
      </span>

      {isCritical && (
        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" aria-hidden />
      )}

      {item.inlineActions && item.inlineActions.length > 0 && (
        <IntelActionButton action={item.inlineActions[0]} />
      )}
    </div>
  )

  if (hasDestination) {
    return (
      <Link href={item.destination} className="block no-underline">
        {content}
      </Link>
    )
  }

  return content
}
