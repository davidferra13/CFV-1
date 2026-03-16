'use client'

// MenuHistoryPanel - Shows all menus/dishes served to this client across past events.
// Helps chef avoid repeating menus and surfaces culinary patterns per relationship.

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { ClientMenuHistory, MenuHistoryEntry } from '@/lib/clients/menu-history'

function EventMenuRow({ entry }: { entry: MenuHistoryEntry }) {
  const [open, setOpen] = useState(false)

  const hasDishes = entry.dishes.length > 0
  const hasContent = hasDishes || (entry.isSimpleMode && entry.simpleContent)
  const dateStr = new Date(entry.eventDate + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="border-b border-stone-800 last:border-0 py-2">
      <button
        type="button"
        onClick={() => hasContent && setOpen((o) => !o)}
        className={`w-full text-left flex items-start justify-between gap-2 ${hasContent ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/events/${entry.eventId}`}
              className="text-sm font-medium text-stone-100 hover:text-brand-600"
              onClick={(e) => e.stopPropagation()}
            >
              {entry.occasion || 'Event'}
            </Link>
            {entry.cuisineType && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-stone-800 text-stone-500">
                {entry.cuisineType}
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {dateStr}
            {entry.guestCount > 0 && ` · ${entry.guestCount} guests`}
            {entry.menuName && ` · ${entry.menuName}`}
          </p>
          {/* Collapsed preview: first 3 component names */}
          {!open && hasDishes && (
            <p className="text-xs text-stone-400 mt-0.5 truncate">
              {entry.dishes
                .flatMap((d) => d.componentNames)
                .slice(0, 4)
                .join(', ')}
              {entry.dishes.flatMap((d) => d.componentNames).length > 4 && ' …'}
            </p>
          )}
        </div>
        {hasContent && (
          <span className="text-stone-400 text-xs shrink-0 mt-0.5">{open ? '▲' : '▼'}</span>
        )}
      </button>

      {open && hasContent && (
        <div className="mt-2 pl-1 space-y-2">
          {entry.isSimpleMode && entry.simpleContent ? (
            <pre className="whitespace-pre-wrap text-xs text-stone-400 font-sans">
              {entry.simpleContent}
            </pre>
          ) : (
            entry.dishes.map((dish, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                  {dish.courseName}
                  {dish.dishName ? ` - ${dish.dishName}` : ''}
                </p>
                {dish.componentNames.length > 0 ? (
                  <p className="text-xs text-stone-500 mt-0.5">{dish.componentNames.join(', ')}</p>
                ) : (
                  <p className="text-xs text-stone-400 mt-0.5 italic">No components</p>
                )}
                {(dish.allergenFlags.length > 0 || dish.dietaryTags.length > 0) && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dish.allergenFlags.map((f) => (
                      <span
                        key={f}
                        className="text-[10px] px-1 py-0.5 rounded bg-red-950 text-red-600 font-medium"
                      >
                        {f}
                      </span>
                    ))}
                    {dish.dietaryTags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1 py-0.5 rounded bg-emerald-950 text-emerald-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function MenuHistoryPanel({ history }: { history: ClientMenuHistory }) {
  if (history.totalEvents === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Culinary History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-stone-500">
            No completed events yet - menu history will appear here after the first dinner.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Culinary History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Aggregates - what's been served most */}
        {history.topComponents.length > 0 && (
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
              Frequently Served
            </p>
            <div className="flex flex-wrap gap-1.5">
              {history.topComponents.map((c) => (
                <span
                  key={c.name}
                  className="text-xs px-2 py-0.5 rounded-full bg-brand-950 text-brand-400 border border-brand-100"
                  title={`Served ${c.count} time${c.count !== 1 ? 's' : ''}`}
                >
                  {c.name}
                  {c.count > 1 && <span className="ml-1 text-brand-400">×{c.count}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {history.cuisinesServed.length > 0 && (
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
              Cuisines Served
            </p>
            <p className="text-sm text-stone-300">{history.cuisinesServed.join(', ')}</p>
          </div>
        )}

        {/* Per-event breakdown */}
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1.5">
            Past Events ({history.totalEvents})
          </p>
          <div>
            {history.entries.map((entry) => (
              <EventMenuRow key={entry.eventId} entry={entry} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
