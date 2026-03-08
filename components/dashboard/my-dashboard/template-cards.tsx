'use client'

import { useMemo } from 'react'
import { Sparkles } from '@/components/ui/icons'
import { Button } from '@/components/ui/button'
import { getTemplatesForChef, type DashboardTemplate } from '@/lib/dashboard/dashboard-templates'
import {
  DASHBOARD_WIDGET_LABELS,
  getWidgetIcon,
  type DashboardWidgetId,
} from '@/lib/scheduling/types'

interface Props {
  chefArchetype: string | null
  onApply: (widgetIds: string[]) => void
  isPending: boolean
}

export function TemplateCards({ chefArchetype, onApply, isPending }: Props) {
  const { recommended, templates } = useMemo(
    () => getTemplatesForChef(chefArchetype),
    [chefArchetype]
  )

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          isRecommended={template.id === recommended?.id}
          onApply={() => onApply(template.widgets)}
          isPending={isPending}
        />
      ))}
    </div>
  )
}

function TemplateCard({
  template,
  isRecommended,
  onApply,
  isPending,
}: {
  template: DashboardTemplate
  isRecommended: boolean
  onApply: () => void
  isPending: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 transition-colors ${
        isRecommended
          ? 'border-brand-600/60 bg-brand-950/30'
          : 'border-stone-700/50 bg-stone-900/60 hover:border-stone-600'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{template.icon}</span>
          <div>
            <p className="text-sm font-semibold text-stone-100">{template.name}</p>
            {isRecommended && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-400 mt-0.5">
                <Sparkles className="h-3 w-3" />
                Recommended for you
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-stone-500 mb-3">{template.description}</p>

      {/* Widget preview (first 5) */}
      <div className="flex flex-wrap gap-1 mb-3">
        {template.widgets.slice(0, 5).map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-800/80 text-[10px] text-stone-400"
          >
            {getWidgetIcon(id)}
            {DASHBOARD_WIDGET_LABELS[id as DashboardWidgetId]?.split(' ')[0] || id}
          </span>
        ))}
        {template.widgets.length > 5 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-stone-800/80 text-[10px] text-stone-500">
            +{template.widgets.length - 5} more
          </span>
        )}
      </div>

      {/* Apply button */}
      <Button
        size="sm"
        variant={isRecommended ? 'primary' : 'secondary'}
        onClick={onApply}
        disabled={isPending}
        className="w-full text-xs"
      >
        {isPending ? 'Applying...' : `Use this template`}
      </Button>
    </div>
  )
}
