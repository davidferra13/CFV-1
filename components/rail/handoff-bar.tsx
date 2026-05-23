// components/rail/handoff-bar.tsx
// Server component — renders a contextual "next action" bar for menu and recipe detail pages.
// Reads from the live rail aggregator, shows the top priority item for this entity.
// Gracefully renders nothing if no action is available.

import { Suspense } from 'react'
import Link from 'next/link'
import { getHandoffAction } from '@/lib/rail/handoff-resolver'

type EntityType = 'menu' | 'recipe'

interface HandoffBarProps {
  entityType: EntityType
  entityId: string
}

const TIER_STYLES: Record<string, string> = {
  critical: 'border-red-500/60 bg-red-500/10 text-red-200',
  action: 'border-amber-500/60 bg-amber-500/10 text-amber-200',
  awareness: 'border-blue-500/60 bg-blue-500/10 text-blue-200',
  opportunity: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200',
}

const TIER_DOT: Record<string, string> = {
  critical: 'bg-red-500',
  action: 'bg-amber-500',
  awareness: 'bg-blue-500',
  opportunity: 'bg-emerald-500',
}

async function HandoffBarInner({ entityType, entityId }: HandoffBarProps) {
  const action = await getHandoffAction(entityType, entityId)

  if (!action) return null

  const tierStyle = TIER_STYLES[action.tier] ?? TIER_STYLES.awareness
  const dotStyle = TIER_DOT[action.tier] ?? TIER_DOT.awareness

  const content = (
    <div
      data-testid="handoff-bar"
      data-rail="handoff"
      className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm ${tierStyle}`}
    >
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${dotStyle}`} />
      <div className="min-w-0 flex-1">
        <span className="font-medium">{action.title}</span>
        {action.subtitle && <span className="ml-2 text-xs opacity-70">{action.subtitle}</span>}
      </div>
      {action.actionUrl && (
        <span className="shrink-0 text-xs font-medium opacity-80">Take action →</span>
      )}
    </div>
  )

  if (action.actionUrl) {
    return (
      <Link href={action.actionUrl} className="block no-underline hover:opacity-90">
        {content}
      </Link>
    )
  }

  return content
}

export function HandoffBar({ entityType, entityId }: HandoffBarProps) {
  return (
    <Suspense fallback={null}>
      <HandoffBarInner entityType={entityType} entityId={entityId} />
    </Suspense>
  )
}
