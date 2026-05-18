'use client'

import type {
  RailCategory,
  ContextualRailCategoryData,
} from '@/lib/discovery/contextual-rail-types'
import { CATEGORY_ICONS } from '@/lib/discovery/contextual-rail-types'
import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import { RailIntelCard } from '@/components/rail/rail-intel-card'
import { cn } from '@/lib/utils'

const CATEGORY_ICON_TEXT: Record<string, string> = {
  'check-circle': '✓',
  'dollar-sign': '$',
  users: '👥',
  clock: '⏰',
  'alert-triangle': '⚠',
  brain: '🧠',
  'message-circle': '💬',
  zap: '⚡',
}

type CategorySectionProps =
  | {
      category: RailCategory
      items: GodModeResolvedItem[]
      colorClass: string
      label: string
      data?: never
    }
  | {
      data: ContextualRailCategoryData
      category?: never
      items?: never
      colorClass?: never
      label?: never
    }

export function CategorySection(props: CategorySectionProps) {
  const category = props.data?.category ?? props.category!
  const items = props.data?.items ?? props.items!
  const colorClass = props.data?.colorClass ?? props.colorClass!
  const label = props.data?.label ?? props.label!
  const iconName = CATEGORY_ICONS[category]
  const iconText = CATEGORY_ICON_TEXT[iconName] ?? '•'
  const visible = items.slice(0, 8)

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider',
          colorClass
        )}
      >
        <span aria-hidden>{iconText}</span>
        <span>{label}</span>
      </div>

      {visible.length === 0 ? (
        <div className="flex items-center gap-1 px-2 text-xs text-stone-600">
          <span className="text-green-600">✓</span>
          <span>All clear</span>
        </div>
      ) : (
        <div className="space-y-0.5">
          {visible.map((item) => (
            <RailIntelCard key={item.definitionId} item={item} categoryColor={colorClass} />
          ))}
        </div>
      )}
    </div>
  )
}
