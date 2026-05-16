'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import type { InlineAction } from '@/lib/discovery/god-mode-types'
import { executeInlineAction } from '@/lib/discovery/inline-action-registry'
import { EvidencePill } from '@/components/evidence/evidence-pill'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatRailMemoryLine } from '@/lib/operating-loop/rail-memory'

const ICON_MAP: Record<string, string> = {
  lightning: '\u26a1',
  chat: '\ud83d\udcac',
  dollar: '\ud83d\udcb0',
  calendar: '\ud83d\udcc5',
  document: '\ud83d\udcc4',
  network: '\ud83e\udd1d',
}

const ACTION_VARIANT_CLASSES: Record<string, string> = {
  default: 'bg-stone-800 hover:bg-stone-700 text-stone-200',
  destructive: 'bg-red-900/50 hover:bg-red-900/70 text-red-200',
  success: 'bg-green-900/50 hover:bg-green-900/70 text-green-200',
}

function InlineActionButton({
  action,
  onComplete,
}: {
  action: InlineAction
  onComplete?: (redirect?: string) => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    startTransition(async () => {
      try {
        const result = await executeInlineAction(action.action, action.params)
        if (result.success && result.redirect) {
          onComplete?.(result.redirect)
        }
      } catch {
        // Non-critical inline action failure
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        'px-2 py-0.5 text-xs font-medium rounded transition-colors',
        ACTION_VARIANT_CLASSES[action.variant] ?? ACTION_VARIANT_CLASSES.default,
        isPending && 'opacity-50'
      )}
    >
      {action.label}
    </button>
  )
}

export function RailItemRow({
  item,
  className,
}: {
  item: GodModeResolvedItem
  className?: string
}) {
  const router = useRouter()
  const icon = item.icon ? (ICON_MAP[item.icon] ?? item.icon) : null
  const hasDestination = !!item.destination
  const memoryLine = formatRailMemoryLine(item)

  const handleActionComplete = (redirect?: string) => {
    if (redirect) router.push(redirect)
  }

  const content = (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors group min-h-[32px]',
        hasDestination && 'hover:bg-stone-800/60 cursor-pointer',
        className
      )}
    >
      {icon && (
        <span className="text-sm flex-shrink-0 w-5 text-center" aria-hidden>
          {icon}
        </span>
      )}

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm text-stone-200">{item.label}</span>
          {item.evidenceLabel && (
            <EvidencePill
              label={item.evidenceLabel}
              source={item.sourceKind}
              confidence={item.confidence}
              timestamp={item.resumeContext?.timestamp ?? undefined}
              href={item.proofHref ?? item.destination}
              compact
              className="hidden shrink-0 sm:inline-flex"
            />
          )}
        </span>
        {memoryLine && <span className="truncate text-xs text-stone-500">{memoryLine}</span>}
      </span>

      {item.inlineActions && item.inlineActions.length > 0 && (
        <span className="flex gap-1 flex-shrink-0">
          {item.inlineActions.map((action) => (
            <InlineActionButton
              key={action.label}
              action={action}
              onComplete={handleActionComplete}
            />
          ))}
        </span>
      )}

      {hasDestination && (
        <span className="text-stone-600 group-hover:text-stone-400 transition-colors flex-shrink-0">
          {'\u2192'}
        </span>
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
