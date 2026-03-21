import Link from 'next/link'
import { WidgetCardShell, WidgetCardEmpty } from './widget-card-shell'

// ============================================
// LIST CARD (md, 2-column)
// Shows a hero count + short item list + action link
//
//  ┌──────────────────────────────────────┐
//  │ TODAY'S SCHEDULE                 3   │
//  │                                      │
//  │  ● 11:00  Johnson Wedding Tasting    │
//  │  ● 14:00  Garcia Dinner (8 guests)   │
//  │  ● 18:00  Prep: Miller Event         │
//  │                                      │
//  │                   View Schedule ->    │
//  └──────────────────────────────────────┘
// ============================================

export interface ListCardItem {
  id: string
  label: string
  sublabel?: string
  href?: string
  /** Dot color: red, amber, green, blue, stone (default) */
  status?: 'red' | 'amber' | 'green' | 'blue' | 'stone'
}

export interface ListCardProps {
  widgetId: string
  title: string
  /** The count shown in the header (e.g. "3") */
  count?: number
  /** Items to display (max 5 shown, rest hidden) */
  items: ListCardItem[]
  /** Link to full list page */
  href?: string
  /** Max items to show before truncating */
  maxItems?: number
  /** Empty state */
  emptyMessage?: string
  emptyActionLabel?: string
  emptyActionHref?: string
}

const STATUS_COLORS: Record<string, string> = {
  red: 'bg-red-400',
  amber: 'bg-amber-400',
  green: 'bg-green-400',
  blue: 'bg-blue-400',
  stone: 'bg-stone-600',
}

export function ListCard({
  widgetId,
  title,
  count,
  items,
  href,
  maxItems = 5,
  emptyMessage,
  emptyActionLabel,
  emptyActionHref,
}: ListCardProps) {
  if (items.length === 0 && emptyMessage) {
    return (
      <WidgetCardShell widgetId={widgetId} title={title} size="md" href={href}>
        <WidgetCardEmpty
          message={emptyMessage}
          actionLabel={emptyActionLabel}
          actionHref={emptyActionHref}
        />
      </WidgetCardShell>
    )
  }

  const visible = items.slice(0, maxItems)
  const remaining = items.length - maxItems

  return (
    <WidgetCardShell widgetId={widgetId} title={title} size="md" href={href}>
      {/* Hero count */}
      {count != null && (
        <p className="text-2xl font-bold text-stone-100 leading-tight mb-2">
          {count}
          <span className="text-sm font-normal text-stone-500 ml-1.5">
            {count === 1 ? 'item' : 'items'}
          </span>
        </p>
      )}

      {/* Item list */}
      <div className="space-y-1">
        {visible.map((item) => {
          const dotColor = STATUS_COLORS[item.status ?? 'stone']
          const content = (
            <div className="flex items-start gap-2.5 py-1.5 group">
              <span
                className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${dotColor}`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-stone-200 truncate group-hover:text-stone-100 transition-colors">
                  {item.label}
                </p>
                {item.sublabel && (
                  <p className="text-xs text-stone-500 truncate">{item.sublabel}</p>
                )}
              </div>
            </div>
          )

          return item.href ? (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-lg px-2 -mx-2 hover:bg-white/[0.07] transition-all duration-200 hover:translate-x-0.5"
            >
              {content}
            </Link>
          ) : (
            <div key={item.id} className="px-2 -mx-2">
              {content}
            </div>
          )
        })}
      </div>

      {/* Overflow indicator */}
      {remaining > 0 && href && (
        <Link
          href={href}
          className="block text-xs text-stone-500 hover:text-stone-300 font-medium mt-2 transition-colors"
        >
          +{remaining} more
        </Link>
      )}
    </WidgetCardShell>
  )
}
