'use client'

import Link from 'next/link'
import { memo, useTransition } from 'react'
import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import type { InlineAction } from '@/lib/discovery/god-mode-types'
import type { UnifiedTier } from '@/lib/discovery/rail-tier-assigner'
import { executeInlineAction } from '@/lib/discovery/inline-action-registry'
import { EvidencePill } from '@/components/evidence/evidence-pill'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatRailMemoryLine } from '@/lib/operating-loop/rail-memory'
import {
  AlertTriangle,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Globe,
  Inbox,
  MessageCircle,
  ShoppingCart,
  StickyNote,
  Zap,
  type LucideIcon,
} from '@/components/ui/icons'

const ICON_MAP: Record<string, LucideIcon> = {
  alert: AlertTriangle,
  'alert-triangle': AlertTriangle,
  calendar: Calendar,
  cart: ShoppingCart,
  chat: MessageCircle,
  check: Check,
  'check-circle': CheckCircle,
  clock: Clock,
  document: FileText,
  dollar: DollarSign,
  inbox: Inbox,
  lightning: Zap,
  message: MessageCircle,
  network: Globe,
  note: StickyNote,
  task: CheckCircle,
  zap: Zap,
}

const FALLBACK_ICON = StickyNote

const ACTION_VARIANT_CLASSES: Record<string, string> = {
  default:
    'bg-stone-800/60 hover:bg-stone-700/80 text-stone-200 border border-stone-700/50 backdrop-blur-sm',
  destructive:
    'bg-red-900/40 hover:bg-red-900/60 text-red-200 border border-red-800/40 backdrop-blur-sm',
  success:
    'bg-green-900/40 hover:bg-green-900/60 text-green-200 border border-green-800/40 backdrop-blur-sm',
}

const TIER_ACCENT_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  action: 'bg-amber-500',
  awareness: 'bg-stone-500',
  opportunity: 'bg-green-500',
}

const TIER_ICON_BG: Record<string, string> = {
  critical: 'bg-red-950/60 ring-1 ring-red-500/30',
  action: 'bg-amber-950/60 ring-1 ring-amber-500/30',
  awareness: 'bg-stone-800/60 ring-1 ring-stone-600/30',
  opportunity: 'bg-green-950/60 ring-1 ring-green-500/30',
}

const UNRESOLVED_TEMPLATE_TOKEN = /\{[a-zA-Z0-9_]+\}/

function hasUnresolvedVisibleText(item: GodModeResolvedItem): boolean {
  const visibleValues = [
    item.label,
    item.context,
    item.nextAction ?? '',
    ...(item.inlineActions?.map((action) => action.label) ?? []),
  ]
  return visibleValues.some((value) => UNRESOLVED_TEMPLATE_TOKEN.test(value))
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
        'px-2.5 py-0.5 text-xs font-medium rounded-full transition-all',
        ACTION_VARIANT_CLASSES[action.variant] ?? ACTION_VARIANT_CLASSES.default,
        isPending && 'opacity-50'
      )}
    >
      {action.label}
    </button>
  )
}

export const RailItemRow = memo(function RailItemRow({
  item,
  tier,
  className,
}: {
  item: GodModeResolvedItem
  tier?: UnifiedTier
  className?: string
}) {
  const router = useRouter()
  if (hasUnresolvedVisibleText(item)) return null

  const Icon = item.icon ? (ICON_MAP[item.icon] ?? FALLBACK_ICON) : FALLBACK_ICON
  const hasDestination = !!item.destination
  const memoryLine = formatRailMemoryLine(item)
  const tierKey = tier ?? 'awareness'

  const handleActionComplete = (redirect?: string) => {
    if (redirect) router.push(redirect)
  }

  const content = (
    <div
      className={cn(
        'relative flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150',
        'bg-[var(--glass-subtle-bg)] border border-stone-800/40',
        'hover:shadow-[var(--shadow-card-hover)] hover:-translate-y-[1px]',
        'hover:border-stone-700/60',
        'group min-h-[40px]',
        hasDestination && 'cursor-pointer',
        className
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-2 bottom-2 w-[2px] rounded-full opacity-60',
          TIER_ACCENT_COLORS[tierKey]
        )}
      />

      <span
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded-full flex-shrink-0 text-sm',
          TIER_ICON_BG[tierKey]
        )}
        aria-hidden
      >
        <Icon className="h-4 w-4" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-stone-200">{item.label}</span>
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
        {memoryLine && <span className="truncate text-xs text-stone-400">{memoryLine}</span>}
      </span>

      {item.inlineActions && item.inlineActions.length > 0 && (
        <span className="flex gap-1.5 flex-shrink-0">
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
        <span
          className={cn(
            'text-stone-600 group-hover:text-stone-300 transition-all duration-150 flex-shrink-0',
            'group-hover:translate-x-0.5'
          )}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            className="stroke-current"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5.25 3.5L8.75 7L5.25 10.5" />
          </svg>
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
})
