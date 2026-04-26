'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import type { EventDetailTab } from '@/components/events/event-detail-mobile-nav'
import { EventDetailSection } from '@/components/events/event-detail-mobile-nav'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Snowflake,
  Flame,
  Leaf,
  AlertTriangle,
  Clock,
  Check,
  ShoppingCart,
  ListChecks,
  Calendar,
  Thermometer,
} from '@/components/ui/icons'
import { SymbolKeyTrigger } from '@/components/ui/symbol-key'
import type {
  PrepTimeline,
  PrepDay,
  PrepItem,
  PrepSymbol,
} from '@/lib/prep-timeline/compute-timeline'
import { formatPrepTime, formatHoursAsReadable } from '@/lib/prep-timeline/compute-timeline'

type EventDetailPrepTabProps = {
  activeTab: EventDetailTab
  timeline: PrepTimeline | null
  eventId: string
  hasMenu: boolean
}

// localStorage key for checkbox state
function checkKey(eventId: string, itemId: string, componentName: string, dishName: string) {
  return `cf-prep-${eventId}-${itemId}-${componentName}-${dishName}`
}

function SymbolIcon({ symbol }: { symbol: PrepSymbol }) {
  switch (symbol) {
    case 'freezable':
      return (
        <span title="Freezable">
          <Snowflake className="h-3.5 w-3.5 text-sky-400" />
        </span>
      )
    case 'day_of':
      return (
        <span title="Day-of only">
          <Flame className="h-3.5 w-3.5 text-orange-400" />
        </span>
      )
    case 'fresh':
      return (
        <span title="Short window">
          <Leaf className="h-3.5 w-3.5 text-emerald-400" />
        </span>
      )
    case 'safety_warning':
      return (
        <span title="Safety note">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        </span>
      )
    case 'serve_immediately':
      return (
        <span title="Serve immediately">
          <Flame className="h-3.5 w-3.5 text-red-400" />
        </span>
      )
    case 'hold_warm':
      return (
        <span title="Can hold warm">
          <Thermometer className="h-3.5 w-3.5 text-amber-400" />
        </span>
      )
    default:
      return null
  }
}

function PrepItemRow({
  item,
  eventId,
  checked,
  onToggle,
}: {
  item: PrepItem
  eventId: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div
      className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${
        checked ? 'bg-stone-800/50 opacity-60' : 'hover:bg-stone-800/30'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex-shrink-0 p-2 -m-2 flex items-center justify-center"
      >
        <span
          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
            checked ? 'bg-brand-600 border-brand-600' : 'border-stone-600 hover:border-stone-400'
          }`}
        >
          {checked && <Check className="h-3 w-3 text-white" />}
        </span>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`text-sm font-medium ${checked ? 'line-through text-stone-500' : 'text-stone-200'}`}
          >
            {item.recipeName}
          </span>
          {item.prepTier === 'base' && (
            <Badge variant="default" className="text-[10px] px-1 py-0">
              base
            </Badge>
          )}
        </div>
        {item.componentName !== item.recipeName && (
          <div className="text-xs text-stone-500">{item.dishName}</div>
        )}
      </div>

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {item.symbols
          .filter((s) => s !== 'allergen')
          .map((symbol) =>
            symbol === 'freezable' && item.frozenExtendsHours ? (
              <span
                key={symbol}
                title={`Freezable (+${formatHoursAsReadable(item.frozenExtendsHours)})`}
              >
                <Snowflake className="h-3.5 w-3.5 text-sky-400" />
              </span>
            ) : (
              <SymbolIcon key={symbol} symbol={symbol} />
            )
          )}
        {item.allergenFlags.length > 0 && (
          <div className="flex items-center gap-0.5" title={item.allergenFlags.join(', ')}>
            {item.allergenFlags.slice(0, 3).map((flag) => (
              <span key={flag} className="w-2 h-2 rounded-full bg-red-500" title={flag} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-stone-500 flex-shrink-0">
        <Clock className="h-3 w-3" />
        {item.passiveMinutes > 0 ? (
          <span
            title={`${formatPrepTime(item.activeMinutes)} active + ${formatPrepTime(item.passiveMinutes)} passive`}
          >
            {formatPrepTime(item.activeMinutes)}
            <span className="text-stone-600"> + {formatPrepTime(item.passiveMinutes)}</span>
          </span>
        ) : (
          formatPrepTime(item.prepTimeMinutes)
        )}
      </div>
    </div>
  )
}

function DayCard({
  day,
  eventId,
  checkedItems,
  toggleItem,
  maxDayMinutes,
}: {
  day: PrepDay
  eventId: string
  checkedItems: Set<string>
  toggleItem: (key: string) => void
  maxDayMinutes: number
}) {
  const completedCount = day.items.filter((item) =>
    checkedItems.has(checkKey(eventId, item.recipeId, item.componentName, item.dishName))
  ).length
  const isHeavyDay = day.activeMinutes >= 240
  const activeWidth = `${(day.activeMinutes / maxDayMinutes) * 100}%`
  const passiveWidth = `${(day.passiveMinutes / maxDayMinutes) * 100}%`

  // Card style based on state
  let borderClass = 'border-stone-700'
  let bgClass = ''
  if (day.isServiceDay) {
    borderClass = 'border-brand-700'
    bgClass = 'bg-brand-950/30'
  } else if (day.isToday) {
    borderClass = 'border-blue-700'
    bgClass = 'bg-blue-950/20'
  } else if (day.isPast) {
    borderClass = 'border-stone-800'
    bgClass = 'opacity-60'
  } else if (isHeavyDay) {
    borderClass = 'border-amber-700/60'
  }

  const isDeadline = day.deadlineType != null

  return (
    <Card className={`${borderClass} ${bgClass} overflow-hidden`}>
      {/* Day header */}
      <div className={`px-4 py-3 border-b border-stone-800 ${isDeadline ? 'bg-stone-800/60' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {day.deadlineType === 'grocery' && <ShoppingCart className="h-4 w-4 text-green-400" />}
            {day.deadlineType === 'prep' && <ListChecks className="h-4 w-4 text-orange-400" />}
            {day.isServiceDay && <Calendar className="h-4 w-4 text-brand-400" />}
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-stone-200">
                  {format(day.date, 'EEEE, MMM d')}
                </div>
                {isHeavyDay && (
                  <Badge variant="warning" className="text-[10px] px-1.5 py-0">
                    Heavy day
                  </Badge>
                )}
              </div>
              <div className="text-xs text-stone-500">
                {day.isServiceDay ? 'Service day' : day.label}
                {day.deadlineType === 'grocery' && ' - Grocery deadline'}
                {day.deadlineType === 'prep' && ' - Prep deadline'}
              </div>
            </div>
          </div>

          {day.items.length > 0 && (
            <div className="text-right text-xs text-stone-500">
              {completedCount}/{day.items.length} done
              {day.totalPrepMinutes > 0 && (
                <span className="ml-2">
                  {day.activeMinutes > 0 && day.passiveMinutes > 0 ? (
                    <span
                      title={`${formatPrepTime(day.activeMinutes)} hands-on, ${formatPrepTime(day.passiveMinutes)} passive`}
                    >
                      {formatPrepTime(day.activeMinutes)} active
                    </span>
                  ) : (
                    <span>{formatPrepTime(day.totalPrepMinutes)} total</span>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {day.items.length > 0 && (
        <div className="mx-4 my-1 h-1.5 rounded-full bg-stone-800 overflow-hidden">
          <div className="flex h-full">
            {day.activeMinutes > 0 && (
              <div
                className={isHeavyDay ? 'bg-amber-500' : 'bg-brand-500'}
                style={{ width: activeWidth }}
              />
            )}
            {day.passiveMinutes > 0 && (
              <div className="bg-stone-600" style={{ width: passiveWidth }} />
            )}
          </div>
        </div>
      )}

      {/* Items */}
      {day.items.length > 0 ? (
        <div className="divide-y divide-stone-800/50">
          {day.items.map((item) => {
            const key = checkKey(eventId, item.recipeId, item.componentName, item.dishName)
            return (
              <PrepItemRow
                key={key}
                item={item}
                eventId={eventId}
                checked={checkedItems.has(key)}
                onToggle={() => toggleItem(key)}
              />
            )
          })}
        </div>
      ) : (
        day.deadlineType === 'grocery' && (
          <div className="px-4 py-3 text-sm text-stone-500">Buy everything for this event</div>
        )
      )}
    </Card>
  )
}

export function EventDetailPrepTab({
  activeTab,
  timeline,
  eventId,
  hasMenu,
}: EventDetailPrepTabProps) {
  // Checkbox state: localStorage for instant UX, server for cross-device sync
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  useEffect(() => {
    // 1. Load from localStorage instantly
    const loaded = new Set<string>()
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(`cf-prep-${eventId}-`) && localStorage.getItem(key) === '1') {
        loaded.add(key)
      }
    }
    setCheckedItems(loaded)

    // 2. Merge server state (async, overwrites localStorage on conflict)
    import('@/lib/prep-timeline/actions').then(({ getPrepCompletions }) => {
      getPrepCompletions(eventId)
        .then((serverKeys) => {
          if (serverKeys.length > 0) {
            setCheckedItems((prev) => {
              const merged = new Set(prev)
              for (const key of serverKeys) {
                merged.add(key)
                try {
                  localStorage.setItem(key, '1')
                } catch {
                  /* ignore */
                }
              }
              return merged
            })
          }
        })
        .catch(() => {
          /* server unavailable, localStorage is fine */
        })
    })
  }, [eventId])

  function toggleItem(key: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev)
      const completed = !next.has(key)
      if (completed) {
        next.add(key)
        try {
          localStorage.setItem(key, '1')
        } catch {
          /* ignore */
        }
      } else {
        next.delete(key)
        try {
          localStorage.removeItem(key)
        } catch {
          /* ignore */
        }
      }
      // Sync to server in background
      import('@/lib/prep-timeline/actions').then(({ togglePrepCompletion }) => {
        togglePrepCompletion(eventId, key, completed).catch(() => {})
      })
      return next
    })
  }

  const maxDayMinutes = timeline
    ? Math.max(...timeline.days.map((day) => day.totalPrepMinutes), 1)
    : 1

  return (
    <EventDetailSection tab="prep" activeTab={activeTab}>
      <div className="space-y-4 mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-200">Prep Timeline</h2>
          <div className="flex items-center gap-2">
            {timeline && (
              <a
                href={`/api/prep-timeline/ical?eventId=${encodeURIComponent(eventId)}`}
                download
                className="inline-flex items-center gap-2 rounded-lg border border-stone-600 bg-stone-800 px-3 py-1.5 text-sm text-stone-300 hover:bg-stone-700"
              >
                Export to Calendar
              </a>
            )}
            {checkedItems.size > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (!confirm('Clear all checked items?')) return
                  for (const key of checkedItems) {
                    localStorage.removeItem(key)
                  }
                  setCheckedItems(new Set())
                }}
                className="text-xs text-stone-500 hover:text-stone-300 transition-colors"
              >
                Clear all
              </button>
            )}
            <SymbolKeyTrigger />
          </div>
        </div>

        {/* No menu */}
        {!hasMenu && (
          <Card className="border-stone-700 p-6 text-center">
            <p className="text-stone-500">Add a menu to see your prep timeline.</p>
          </Card>
        )}

        {/* Menu but no timeline (no components) */}
        {hasMenu && !timeline && (
          <Card className="border-stone-700 p-6 text-center">
            <p className="text-stone-500">
              No components found on this menu. Add items and components to generate a prep
              timeline.
            </p>
          </Card>
        )}

        {/* Timeline summary */}
        {timeline &&
          (() => {
            const totalItems =
              timeline.days.reduce((s, d) => s + d.items.length, 0) + timeline.untimedItems.length
            const totalMinutes =
              timeline.days.reduce((s, d) => s + d.totalPrepMinutes, 0) +
              timeline.untimedItems.reduce((s, i) => s + i.prepTimeMinutes, 0)
            const timedCount = timeline.days.reduce((s, d) => s + d.items.length, 0)
            const prepDays = timeline.days.filter(
              (d) => d.items.length > 0 && !d.isServiceDay
            ).length

            return totalItems > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                <span>
                  {totalItems} component{totalItems !== 1 ? 's' : ''}
                </span>
                <span>{formatPrepTime(totalMinutes)} total prep</span>
                {prepDays > 0 && (
                  <span>
                    {prepDays} prep day{prepDays !== 1 ? 's' : ''}
                  </span>
                )}
                {timeline.untimedItems.length > 0 && (
                  <span className="text-amber-500">
                    {timeline.untimedItems.length} need peak windows
                  </span>
                )}
                {timeline.groceryDeadline && (
                  <span>Shop by {format(timeline.groceryDeadline, 'EEE, MMM d')}</span>
                )}
              </div>
            ) : null
          })()}

        {/* Timeline */}
        {timeline && (
          <div className="space-y-3">
            {timeline.days.map((day) => (
              <DayCard
                key={day.date.toISOString()}
                day={day}
                eventId={eventId}
                checkedItems={checkedItems}
                toggleItem={toggleItem}
                maxDayMinutes={maxDayMinutes}
              />
            ))}

            {/* Untimed items */}
            {timeline.untimedItems.length > 0 && (
              <Card className="border-stone-700 border-dashed">
                <div className="px-4 py-3 border-b border-stone-800">
                  <div className="text-sm font-medium text-stone-400">Not yet timed</div>
                  <div className="text-xs text-stone-600">
                    Set peak windows on these recipes to place them on the timeline
                  </div>
                </div>
                <div className="divide-y divide-stone-800/50">
                  {timeline.untimedItems.map((item) => (
                    <PrepItemRow
                      key={`${item.recipeId}-${item.componentName}`}
                      item={item}
                      eventId={eventId}
                      checked={false}
                      onToggle={() => {}}
                    />
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </EventDetailSection>
  )
}
