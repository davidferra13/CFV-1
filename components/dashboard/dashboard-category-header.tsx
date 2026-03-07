import { WIDGET_CATEGORY_STYLES, type WidgetCategory } from '@/lib/scheduling/types'

const SECTION_META: Record<string, { icon: string; category: WidgetCategory }> = {
  'Schedule & Prep': { icon: '\u{1F52A}', category: 'prep' },
  'Action Items': { icon: '\u26A1', category: 'actions' },
  'Analytics & Intelligence': { icon: '\u{1F4CA}', category: 'analytics' },
  'Business & Money': { icon: '\u{1F4B0}', category: 'money' },
}

/**
 * Category section divider for the dashboard grid.
 * Full-width colored label separating widget groups.
 */
export function DashboardCategoryHeader({ label, count }: { label: string; count?: number }) {
  const section = SECTION_META[label]
  const color = section ? WIDGET_CATEGORY_STYLES[section.category].border : '#78716c'
  const icon = section?.icon

  return (
    <div className="col-span-1 md:col-span-2 flex items-center gap-3 pt-8 pb-1 first:pt-0">
      {icon && <span className="text-lg leading-none">{icon}</span>}
      <h2
        className="text-xs font-bold uppercase tracking-wider whitespace-nowrap"
        style={{ color }}
      >
        {label}
      </h2>
      {count != null && count > 0 && (
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {count}
        </span>
      )}
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}25` }} />
    </div>
  )
}
