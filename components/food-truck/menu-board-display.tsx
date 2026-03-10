'use client'

import { useEffect, useState, useTransition, useCallback } from 'react'
import {
  getMenuBoardItems,
  type MenuBoardCategory,
  type MenuBoardSettings,
} from '@/lib/food-truck/menu-board-actions'

// ---------------------------------------------------------------------------
// Allergen icon mapping
// ---------------------------------------------------------------------------

const ALLERGEN_ICONS: Record<string, { label: string; abbr: string; color: string }> = {
  gluten_free: { label: 'Gluten Free', abbr: 'GF', color: 'bg-amber-600' },
  dairy_free: { label: 'Dairy Free', abbr: 'DF', color: 'bg-blue-600' },
  nut_free: { label: 'Nut Free', abbr: 'NF', color: 'bg-red-600' },
  vegan: { label: 'Vegan', abbr: 'VG', color: 'bg-green-600' },
  vegetarian: { label: 'Vegetarian', abbr: 'V', color: 'bg-green-500' },
}

const DIETARY_ICONS: Record<string, { label: string; abbr: string; color: string }> = {
  'gluten-free': { label: 'Gluten Free', abbr: 'GF', color: 'bg-amber-600' },
  'dairy-free': { label: 'Dairy Free', abbr: 'DF', color: 'bg-blue-600' },
  'nut-free': { label: 'Nut Free', abbr: 'NF', color: 'bg-red-600' },
  vegan: { label: 'Vegan', abbr: 'VG', color: 'bg-green-600' },
  vegetarian: { label: 'Vegetarian', abbr: 'V', color: 'bg-green-500' },
  keto: { label: 'Keto', abbr: 'K', color: 'bg-purple-600' },
  paleo: { label: 'Paleo', abbr: 'P', color: 'bg-orange-600' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type MenuBoardDisplayProps = {
  initialCategories: MenuBoardCategory[]
  initialSettings: MenuBoardSettings
  fullScreen?: boolean
}

export function MenuBoardDisplay({
  initialCategories,
  initialSettings,
  fullScreen = false,
}: MenuBoardDisplayProps) {
  const [categories, setCategories] = useState(initialCategories)
  const [settings] = useState(initialSettings)
  const [, startTransition] = useTransition()
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const refresh = useCallback(() => {
    startTransition(async () => {
      try {
        const result = await getMenuBoardItems()
        setCategories(result.categories)
        setLastRefresh(new Date())
      } catch (err) {
        console.error('[menu-board] Auto-refresh failed:', err)
      }
    })
  }, [])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(refresh, (settings.refreshIntervalSeconds ?? 60) * 1000)
    return () => clearInterval(interval)
  }, [settings.refreshIntervalSeconds, refresh])

  const fontSizeClass =
    settings.fontSize === 'large'
      ? 'text-2xl'
      : settings.fontSize === 'medium'
        ? 'text-xl'
        : 'text-lg'

  const priceFontClass =
    settings.fontSize === 'large'
      ? 'text-3xl'
      : settings.fontSize === 'medium'
        ? 'text-2xl'
        : 'text-xl'

  const headerClass =
    settings.fontSize === 'large'
      ? 'text-4xl'
      : settings.fontSize === 'medium'
        ? 'text-3xl'
        : 'text-2xl'

  const containerClass = fullScreen
    ? 'min-h-screen bg-zinc-950 text-white p-8'
    : 'bg-zinc-950 text-white p-6 rounded-xl'

  if (categories.length === 0) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-2xl text-zinc-400 mb-2">No items on the menu board yet</p>
            <p className="text-zinc-500">
              Add recipes to the menu board from the admin panel to get started.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      {/* Title */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold tracking-tight" style={{ color: settings.accentColor }}>
          {settings.title}
        </h1>
        {!fullScreen && (
          <p className="text-xs text-zinc-600 mt-2">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* Categories */}
      <div
        className={
          settings.layout === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-8'
            : 'space-y-8 max-w-3xl mx-auto'
        }
      >
        {categories.map((cat) => (
          <div key={cat.name}>
            {/* Category header */}
            <div className="border-b-2 border-zinc-700 pb-2 mb-4">
              <h2
                className={`${headerClass} font-semibold tracking-wide uppercase`}
                style={{ color: settings.accentColor }}
              >
                {cat.name}
              </h2>
            </div>

            {/* Items */}
            <div className="space-y-4">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-4 ${
                    !item.available ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`${fontSizeClass} font-medium ${
                          !item.available ? 'line-through' : ''
                        }`}
                      >
                        {item.name}
                      </span>

                      {!item.available && (
                        <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                          Sold Out
                        </span>
                      )}

                      {/* Dietary tags */}
                      {settings.showAllergens &&
                        item.dietaryTags.map((tag) => {
                          const info = DIETARY_ICONS[tag]
                          if (!info) return null
                          return (
                            <span
                              key={tag}
                              className={`${info.color} text-white text-xs font-bold px-1.5 py-0.5 rounded`}
                              title={info.label}
                            >
                              {info.abbr}
                            </span>
                          )
                        })}

                      {/* Allergen flags from ingredients */}
                      {settings.showAllergens &&
                        item.allergenFlags.map((flag) => {
                          const info = ALLERGEN_ICONS[flag]
                          if (!info) return null
                          // Skip if already shown via dietary tags
                          if (item.dietaryTags.some((t) => DIETARY_ICONS[t]?.abbr === info.abbr))
                            return null
                          return (
                            <span
                              key={flag}
                              className={`${info.color} text-white text-xs font-bold px-1.5 py-0.5 rounded`}
                              title={info.label}
                            >
                              {info.abbr}
                            </span>
                          )
                        })}
                    </div>

                    {settings.showDescriptions && item.description && (
                      <p className="text-zinc-400 text-sm mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="flex-shrink-0">
                    <span
                      className={`${priceFontClass} font-bold ${
                        !item.available ? 'line-through' : ''
                      }`}
                    >
                      {item.priceCents !== null ? `$${(item.priceCents / 100).toFixed(2)}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer for full-screen mode */}
      {fullScreen && (
        <div className="fixed bottom-4 right-4 text-zinc-700 text-xs">
          Auto-refreshes every {settings.refreshIntervalSeconds}s
        </div>
      )}
    </div>
  )
}
