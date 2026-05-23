'use client'

import React, { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import type {
  UniversalRailItem,
  UniversalRailRole,
  UniversalRailClickAction,
  UniversalRailPresentation,
} from '@/lib/discovery/universal-rail-types'
import {
  trackRailClick,
  trackRailImpressionBatch,
  dismissRailItemAction,
  saveRailItemAction,
  unsaveRailItemAction,
} from '@/lib/discovery/universal-rail-actions'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  Calendar,
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UniversalRailProps {
  items: UniversalRailItem[]
  role: UniversalRailRole
  userId?: string
  tenantId?: string
  pageContext?: string
  className?: string
  title?: string
  showDebugScores?: boolean
  onItemClick?: (item: UniversalRailItem) => void
  onDismiss?: (item: UniversalRailItem) => void
  onSave?: (item: UniversalRailItem) => void
}

// ---------------------------------------------------------------------------
// Presentation mapping
// ---------------------------------------------------------------------------

const PRESENTATION_CLASSES: Record<UniversalRailPresentation, string> = {
  pill: 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-surface-secondary hover:bg-surface-tertiary transition-colors cursor-pointer whitespace-nowrap',
  card: 'flex flex-col gap-2 p-3 rounded-xl bg-surface-secondary hover:bg-surface-tertiary transition-colors cursor-pointer min-w-[160px] max-w-[200px]',
  badge:
    'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent cursor-pointer whitespace-nowrap',
  story:
    'flex flex-col gap-2 p-4 rounded-xl bg-gradient-to-br from-surface-secondary to-surface-tertiary cursor-pointer min-w-[240px] max-w-[280px]',
  visual_card:
    'flex flex-col gap-2 rounded-xl overflow-hidden bg-surface-secondary hover:bg-surface-tertiary transition-colors cursor-pointer min-w-[180px] max-w-[220px]',
  alert:
    'flex items-center gap-2 px-3 py-2 rounded-lg bg-warning/10 border border-warning/20 text-sm cursor-pointer',
  progress:
    'flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-secondary text-sm cursor-pointer min-w-[200px]',
  banner:
    'flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10 cursor-pointer w-full',
  metric:
    'flex flex-col items-center gap-1 p-3 rounded-xl bg-surface-secondary text-center cursor-pointer min-w-[100px]',
  countdown:
    'flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20 text-sm font-mono cursor-pointer',
}

const URGENCY_INDICATOR_CLASSES: Record<string, string> = {
  critical: 'ring-2 ring-destructive/40',
  high: 'ring-1 ring-warning/30',
  normal: '',
  low: 'opacity-90',
}

const ICON_MAP: Record<string, LucideIcon> = {
  alert: AlertTriangle,
  calendar: Calendar,
  cart: ShoppingCart,
  chat: MessageCircle,
  check: CheckCircle,
  clock: Clock,
  document: FileText,
  dollar: DollarSign,
  inbox: Inbox,
  lightning: Zap,
  message: MessageCircle,
  network: Globe,
  task: CheckCircle,
  zap: Zap,
}

function RailIcon({ icon, className }: { icon?: string | null; className?: string }) {
  const Icon = icon ? (ICON_MAP[icon] ?? StickyNote) : StickyNote
  return <Icon className={cn('shrink-0', className)} aria-hidden />
}

function getUrgencyLevel(urgency: number): string {
  if (urgency >= 90) return 'critical'
  if (urgency >= 70) return 'high'
  if (urgency >= 30) return 'normal'
  return 'low'
}

// ---------------------------------------------------------------------------
// Rail Item Component
// ---------------------------------------------------------------------------

function UniversalRailItemCard({
  item,
  role,
  userId,
  tenantId,
  pageContext,
  showDebugScores,
  onItemClick,
  onDismiss,
  onSave,
}: {
  item: UniversalRailItem
  role: UniversalRailRole
  userId?: string
  tenantId?: string
  pageContext?: string
  showDebugScores?: boolean
  onItemClick?: (item: UniversalRailItem) => void
  onDismiss?: (item: UniversalRailItem) => void
  onSave?: (item: UniversalRailItem) => void
}) {
  const [isPending, startTransition] = useTransition()

  const handleClick = useCallback(() => {
    if (userId) {
      startTransition(async () => {
        try {
          await trackRailClick(userId, tenantId ?? null, item.definitionId, role, pageContext)
        } catch {
          // Non-critical tracking failure
        }
      })
    }
    onItemClick?.(item)
  }, [userId, tenantId, item, role, pageContext, onItemClick])

  const handleDismiss = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      if (userId) {
        startTransition(async () => {
          try {
            await dismissRailItemAction(userId, tenantId ?? null, item.definitionId, role)
          } catch {
            // Non-critical
          }
        })
      }
      onDismiss?.(item)
    },
    [userId, tenantId, item, role, onDismiss]
  )

  const handleSave = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      e.preventDefault()
      if (userId) {
        startTransition(async () => {
          try {
            await saveRailItemAction(userId, tenantId ?? null, item.definitionId, role)
          } catch {
            // Non-critical
          }
        })
      }
      onSave?.(item)
    },
    [userId, tenantId, item, role, onSave]
  )

  const presentation = item.presentation
  const urgencyLevel = getUrgencyLevel(item.baseUrgency)
  const baseClass = PRESENTATION_CLASSES[presentation] ?? PRESENTATION_CLASSES.pill
  const urgencyClass = URGENCY_INDICATOR_CLASSES[urgencyLevel] ?? ''

  const content = (
    <div
      className={cn(baseClass, 'max-w-full min-w-0', urgencyClass, isPending && 'opacity-60')}
      onClick={item.clickAction === 'navigate' ? undefined : handleClick}
      role="button"
      tabIndex={0}
      aria-label={item.label}
    >
      <RailIcon icon={item.icon} className="h-4 w-4" />
      <span className="min-w-0 max-w-full truncate">{item.label}</span>
      {item.sublabel && (
        <span className="min-w-0 max-w-full truncate text-xs text-muted-foreground">
          {item.sublabel}
        </span>
      )}
      {item.dismissable && (
        <button
          onClick={handleDismiss}
          className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Dismiss ${item.label}`}
        >
          <span className="text-xs">x</span>
        </button>
      )}
      {showDebugScores && item.debugScore && (
        <span className="text-[10px] text-muted-foreground font-mono ml-1">
          {item.debugScore.final.toFixed(1)}
        </span>
      )}
    </div>
  )

  if (item.clickAction === 'navigate' && item.href) {
    return (
      <Link href={item.href} onClick={handleClick} className="max-w-full min-w-0 no-underline">
        {content}
      </Link>
    )
  }

  return content
}

// ---------------------------------------------------------------------------
// Main Rail Component
// ---------------------------------------------------------------------------

export function UniversalRail({
  items,
  role,
  userId,
  tenantId,
  pageContext,
  className,
  title,
  showDebugScores = false,
  onItemClick,
  onDismiss,
  onSave,
}: UniversalRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const impressionTracked = useRef(false)

  // Track impressions on first render
  useEffect(() => {
    if (impressionTracked.current || !userId || items.length === 0) return
    impressionTracked.current = true

    const visibleIds = items.slice(0, 20).map((i) => i.definitionId)
    trackRailImpressionBatch(userId, tenantId ?? null, role, visibleIds).catch(() => {
      // Non-critical
    })
  }, [items, userId, tenantId, role])

  // Group items by category for structured display
  const categorizedItems = React.useMemo(() => {
    const groups = new Map<string, UniversalRailItem[]>()
    for (const item of items) {
      const existing = groups.get(item.category) ?? []
      existing.push(item)
      groups.set(item.category, existing)
    }
    return groups
  }, [items])

  if (items.length === 0) return null

  // For simple roles (public, guest), render as a single scrollable strip
  const isSimpleLayout = role === 'public' || role === 'guest'

  if (isSimpleLayout) {
    return (
      <div className={cn('w-full', className)}>
        {title && <h2 className="text-lg font-semibold mb-3 px-4">{title}</h2>}
        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-none"
          role="list"
          aria-label={title ?? `${role} rail`}
        >
          {items.map((item) => (
            <UniversalRailItemCard
              key={item.definitionId}
              item={item}
              role={role}
              userId={userId}
              tenantId={tenantId}
              pageContext={pageContext}
              showDebugScores={showDebugScores}
              onItemClick={onItemClick}
              onDismiss={onDismiss}
              onSave={onSave}
            />
          ))}
        </div>
      </div>
    )
  }

  // For operational roles (client, chef, staff, partner, admin), render categorized
  return (
    <div className={cn('w-full space-y-4', className)}>
      {title && <h2 className="text-lg font-semibold px-4">{title}</h2>}
      {Array.from(categorizedItems.entries()).map(([category, categoryItems]) => (
        <div key={category} className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-4 capitalize">
            {category.replace(/_/g, ' ')}
          </h3>
          <div className="flex flex-wrap gap-2 px-4" role="list" aria-label={`${category} items`}>
            {categoryItems.map((item) => (
              <UniversalRailItemCard
                key={item.definitionId}
                item={item}
                role={role}
                userId={userId}
                tenantId={tenantId}
                pageContext={pageContext}
                showDebugScores={showDebugScores}
                onItemClick={onItemClick}
                onDismiss={onDismiss}
                onSave={onSave}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Compact rail variant (for sidebars, mobile, embedded contexts)
// ---------------------------------------------------------------------------

export function UniversalRailCompact({
  items,
  role,
  userId,
  tenantId,
  pageContext,
  className,
  maxVisible = 5,
}: {
  items: UniversalRailItem[]
  role: UniversalRailRole
  userId?: string
  tenantId?: string
  pageContext?: string
  className?: string
  maxVisible?: number
}) {
  const visibleItems = items.slice(0, maxVisible)
  const remainingCount = Math.max(0, items.length - maxVisible)

  if (visibleItems.length === 0) return null

  return (
    <div className={cn('space-y-1', className)}>
      {visibleItems.map((item) => (
        <div
          key={item.definitionId}
          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-surface-secondary transition-colors"
        >
          <RailIcon icon={item.icon} className="h-4 w-4" />
          <span className="text-sm truncate flex-1">{item.label}</span>
          {item.baseUrgency >= 70 && (
            <span className="w-1.5 h-1.5 rounded-full bg-warning flex-shrink-0" />
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className="text-xs text-muted-foreground px-2 py-1">+{remainingCount} more</div>
      )}
    </div>
  )
}
