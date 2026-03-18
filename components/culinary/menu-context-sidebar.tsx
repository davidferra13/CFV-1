'use client'

// MenuContextSidebar - Shows client dietary info, past menus, matching templates
// Appears alongside the menu editor to give chefs context while building menus

import { useEffect, useState, useTransition } from 'react'
import { Badge } from '@/components/ui/badge'
import { getMenuContextData } from '@/lib/menus/menu-intelligence-actions'
import Link from 'next/link'

interface MenuContextSidebarProps {
  menuId: string
  className?: string
}

export function MenuContextSidebar({ menuId, className = '' }: MenuContextSidebarProps) {
  const [isPending, startTransition] = useTransition()
  const [context, setContext] = useState<Awaited<ReturnType<typeof getMenuContextData>> | null>(
    null
  )
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getMenuContextData(menuId)
        setContext(data)
        setLoadError(null)
      } catch (err) {
        console.error('[MenuContextSidebar] Failed to load:', err)
        setLoadError('Could not load context')
      }
    })
  }, [menuId])

  if (loadError) {
    return (
      <div className={`rounded-lg border border-red-500/30 bg-red-500/10 p-3 ${className}`}>
        <p className="text-xs text-red-300">{loadError}</p>
      </div>
    )
  }

  if (!context && isPending) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-stone-700 rounded w-2/3" />
          <div className="h-3 bg-stone-700 rounded w-full" />
          <div className="h-3 bg-stone-700 rounded w-4/5" />
        </div>
      </div>
    )
  }

  if (!context) return null

  const hasDietary = context.clientDietary.length > 0 || context.clientAllergies.length > 0
  const hasPreviousMenus = context.previousMenus.length > 0
  const hasTemplates = context.matchingTemplates.length > 0
  const hasAnyContent = hasDietary || hasPreviousMenus || hasTemplates

  if (!hasAnyContent) {
    return (
      <div className={`rounded-lg border border-stone-700 bg-stone-800/50 p-4 ${className}`}>
        <p className="text-xs text-stone-500">
          No additional context available. Link this menu to an event with a client to see dietary
          preferences, past menus, and template suggestions.
        </p>
      </div>
    )
  }

  return (
    <div
      className={`rounded-lg border border-stone-700 bg-stone-800/50 divide-y divide-stone-700 ${className}`}
    >
      {/* Season + guest tier */}
      <div className="px-4 py-3 flex items-center gap-2">
        <Badge variant="info">{context.season}</Badge>
        <Badge variant="default">{context.guestTier}</Badge>
        {context.clientName && (
          <span className="text-xs text-stone-400 ml-auto truncate max-w-[120px]">
            {context.clientName}
          </span>
        )}
      </div>

      {/* Client dietary info */}
      {hasDietary && (
        <div className="px-4 py-3 space-y-2">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Client Dietary
          </h4>
          {context.clientAllergies.length > 0 && (
            <div>
              <p className="text-xxs text-red-400 font-medium mb-1">ALLERGIES</p>
              <div className="flex flex-wrap gap-1">
                {context.clientAllergies.map((allergy) => (
                  <Badge key={allergy} variant="error">
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {context.clientDietary.length > 0 && (
            <div>
              <p className="text-xxs text-stone-500 font-medium mb-1">Restrictions</p>
              <div className="flex flex-wrap gap-1">
                {context.clientDietary.map((restriction) => (
                  <Badge key={restriction} variant="warning">
                    {restriction}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Previous menus for this client */}
      {hasPreviousMenus && (
        <div className="px-4 py-3 space-y-2">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">
            Previously Served
          </h4>
          <div className="space-y-1">
            {context.previousMenus.map((pm) => (
              <Link
                key={pm.id}
                href={`/culinary/menus/${pm.id}`}
                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-stone-800 transition-colors text-xs group"
              >
                <span className="text-stone-300 group-hover:text-stone-100 flex-1 truncate">
                  {pm.name}
                </span>
                {pm.eventDate && (
                  <span className="text-stone-500 text-xxs">
                    {new Date(pm.eventDate).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
                {pm.guestCount && <span className="text-stone-600 text-xxs">{pm.guestCount}g</span>}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Matching templates */}
      {hasTemplates && (
        <div className="px-4 py-3 space-y-2">
          <h4 className="text-xs font-medium text-stone-400 uppercase tracking-wider">Templates</h4>
          <div className="space-y-1">
            {context.matchingTemplates.slice(0, 5).map((tmpl) => (
              <Link
                key={tmpl.id}
                href={`/culinary/menus/${tmpl.id}`}
                className="flex items-center gap-2 py-1 px-2 rounded hover:bg-stone-800 transition-colors text-xs group"
              >
                <span className="text-stone-300 group-hover:text-stone-100 flex-1 truncate">
                  {tmpl.name}
                </span>
                {tmpl.serviceStyle && (
                  <Badge variant="default">{tmpl.serviceStyle.replace('_', ' ')}</Badge>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
