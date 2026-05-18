'use client'

import type {
  ContextualRailCategoryData,
  RailCategory,
} from '@/lib/discovery/contextual-rail-types'
import type { GodModeResolvedItem } from '@/lib/discovery/god-mode-types'
import { RailIntelCard } from '@/components/rail/rail-intel-card'
import { cn } from '@/lib/utils'
import {
  Brain,
  CheckCircle,
  CheckSquare,
  Clock,
  DollarSign,
  MessageCircle,
  Shield,
  Users,
  type LucideIcon,
} from '@/components/ui/icons'

const CATEGORY_ICON: Record<RailCategory, LucideIcon> = {
  readiness: CheckCircle,
  money: DollarSign,
  people: Users,
  time: Clock,
  risk: Shield,
  intelligence: Brain,
  communication: MessageCircle,
  actions: CheckSquare,
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
  const Icon = CATEGORY_ICON[category]
  const visible = items.slice(0, 8)

  return (
    <div className="space-y-1">
      <div
        className={cn(
          'flex items-center gap-1.5 px-2 text-[10px] font-semibold uppercase tracking-wider',
          colorClass
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        <span>{label}</span>
      </div>

      {visible.length === 0 ? (
        <div className="flex items-center gap-1 px-2 text-xs text-stone-600">
          <CheckCircle className="h-3 w-3 text-green-600" aria-hidden />
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
