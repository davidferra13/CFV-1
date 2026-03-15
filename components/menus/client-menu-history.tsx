'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { getClientMenuHistory, type ClientMenuHistoryEntry } from '@/lib/menus/repeat-detection'

interface ClientMenuHistoryProps {
  clientId: string
}

export function ClientMenuHistory({ clientId }: ClientMenuHistoryProps) {
  const [history, setHistory] = useState<ClientMenuHistoryEntry[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    startTransition(async () => {
      try {
        const data = await getClientMenuHistory(clientId)
        if (!cancelled) {
          setHistory(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ClientMenuHistory] Failed to load:', err)
          setError('Could not load menu history')
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [clientId])

  const toggleExpanded = (eventId: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }

  if (isPending) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-stone-200 rounded w-1/3" />
        <div className="h-10 bg-stone-100 rounded" />
        <div className="h-10 bg-stone-100 rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="text-sm text-stone-400 py-4 text-center">
        No menu history for this client yet.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-200">
            <th className="text-left py-2 pr-4 text-xs font-medium text-stone-500 uppercase tracking-wide">
              Date
            </th>
            <th className="text-left py-2 pr-4 text-xs font-medium text-stone-500 uppercase tracking-wide">
              Occasion
            </th>
            <th className="text-left py-2 pr-4 text-xs font-medium text-stone-500 uppercase tracking-wide">
              Menu
            </th>
            <th className="text-left py-2 text-xs font-medium text-stone-500 uppercase tracking-wide">
              Dishes
            </th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <>
              <tr
                key={entry.eventId}
                className="border-b border-stone-100 hover:bg-stone-50 cursor-pointer"
                onClick={() => toggleExpanded(entry.eventId)}
              >
                <td className="py-2 pr-4 text-stone-600 whitespace-nowrap">
                  {new Date(entry.eventDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="py-2 pr-4 text-stone-600">{entry.eventOccasion || '-'}</td>
                <td className="py-2 pr-4">
                  <Link
                    href={`/culinary/menus/${entry.menuId}`}
                    className="text-brand-600 hover:text-brand-800 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {entry.menuName}
                  </Link>
                </td>
                <td className="py-2 text-stone-500">
                  {entry.dishes.length} course{entry.dishes.length !== 1 ? 's' : ''}
                  <span className="ml-2 text-xs text-stone-400">
                    {expandedMenus.has(entry.eventId) ? '(collapse)' : '(expand)'}
                  </span>
                </td>
              </tr>
              {expandedMenus.has(entry.eventId) && (
                <tr key={`${entry.eventId}-detail`}>
                  <td colSpan={4} className="pb-3 pt-1 pl-4">
                    <div className="bg-stone-50 rounded-lg p-3 space-y-2">
                      {entry.dishes.map((dish) => (
                        <div key={dish.dishId}>
                          <p className="text-xs font-medium text-stone-700">
                            Course {dish.courseNumber}: {dish.courseName}
                            {dish.dishName ? ` - ${dish.dishName}` : ''}
                          </p>
                          {dish.components.length > 0 && (
                            <ul className="mt-0.5 space-y-0.5 pl-3">
                              {dish.components.map((comp) => (
                                <li key={comp.componentId} className="text-xs text-stone-500">
                                  {comp.componentName}
                                  {comp.recipeName && (
                                    <span className="text-stone-400">
                                      {' '}
                                      (recipe: {comp.recipeName})
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}
