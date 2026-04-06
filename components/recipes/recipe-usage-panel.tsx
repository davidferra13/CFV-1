'use client'

// RecipeUsagePanel - Shows which menus use this recipe (bidirectional navigation).
// Displays on recipe detail pages so chefs can trace where recipes are deployed.

import { useEffect, useState, useTransition } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { getRecipeUsage } from '@/lib/menus/menu-intelligence-actions'
import type { RecipeUsageEntry } from '@/lib/menus/menu-intelligence-actions'

interface RecipeUsagePanelProps {
  recipeId: string
}

export function RecipeUsagePanel({ recipeId }: RecipeUsagePanelProps) {
  const [isPending, startTransition] = useTransition()
  const [usage, setUsage] = useState<RecipeUsageEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getRecipeUsage(recipeId)
        setUsage(data)
      } catch {
        // Non-blocking: if lookup fails, just show nothing
      } finally {
        setLoaded(true)
      }
    })
  }, [recipeId])

  if (!loaded && isPending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Used In</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-stone-700 rounded w-3/4" />
            <div className="h-3 bg-stone-700 rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (usage.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Used In</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-stone-500 text-sm">This recipe is not used in any menus yet.</p>
          <Link
            href="/culinary/menus"
            className="inline-block mt-2 text-sm text-brand-400 hover:text-brand-300"
          >
            Add to a menu →
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Used In ({usage.length} {usage.length === 1 ? 'menu' : 'menus'})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {usage.map((entry) => (
            <div
              key={entry.menuId}
              className="flex items-center justify-between py-1.5 border-b border-stone-800 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Link
                  href={`/culinary/menus/${entry.menuId}`}
                  className="text-stone-200 hover:text-brand-400 hover:underline truncate text-sm"
                >
                  {entry.menuName}
                </Link>
                {entry.dishName && (
                  <span className="text-xs text-stone-500 truncate hidden sm:inline">
                    ({entry.dishName})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {entry.clientName && (
                  <span className="text-xs text-stone-500">{entry.clientName}</span>
                )}
                {entry.eventDate && (
                  <Badge variant="default">
                    {new Date(entry.eventDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Badge>
                )}
                {entry.eventId && (
                  <Link
                    href={`/events/${entry.eventId}`}
                    className="text-xs text-stone-500 hover:text-stone-300"
                  >
                    Event →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
