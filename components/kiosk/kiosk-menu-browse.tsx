'use client'

import { useCallback, useEffect, useState } from 'react'
import { getKioskMenus, type KioskMenu, type KioskMenuDish } from '@/lib/devices/kiosk-menu-actions'

interface KioskMenuBrowseProps {
  token: string
}

const DIETARY_LABELS: Record<string, { label: string; color: string }> = {
  gf: { label: 'GF', color: 'bg-amber-700 text-amber-100' },
  'gluten-free': { label: 'GF', color: 'bg-amber-700 text-amber-100' },
  'gluten free': { label: 'GF', color: 'bg-amber-700 text-amber-100' },
  v: { label: 'V', color: 'bg-green-700 text-green-100' },
  vegan: { label: 'VG', color: 'bg-emerald-700 text-emerald-100' },
  vg: { label: 'VG', color: 'bg-emerald-700 text-emerald-100' },
  vegetarian: { label: 'V', color: 'bg-green-700 text-green-100' },
  df: { label: 'DF', color: 'bg-sky-700 text-sky-100' },
  'dairy-free': { label: 'DF', color: 'bg-sky-700 text-sky-100' },
  'dairy free': { label: 'DF', color: 'bg-sky-700 text-sky-100' },
  nf: { label: 'NF', color: 'bg-orange-700 text-orange-100' },
  'nut-free': { label: 'NF', color: 'bg-orange-700 text-orange-100' },
  'nut free': { label: 'NF', color: 'bg-orange-700 text-orange-100' },
}

const ALLERGEN_COLORS: Record<string, string> = {
  nuts: 'bg-red-800 text-red-100',
  'tree nuts': 'bg-red-800 text-red-100',
  peanuts: 'bg-red-800 text-red-100',
  shellfish: 'bg-red-800 text-red-100',
  fish: 'bg-red-800 text-red-100',
  dairy: 'bg-red-800 text-red-100',
  eggs: 'bg-red-800 text-red-100',
  soy: 'bg-red-800 text-red-100',
  wheat: 'bg-red-800 text-red-100',
  gluten: 'bg-red-800 text-red-100',
  sesame: 'bg-red-800 text-red-100',
}

function DietaryBadge({ tag }: { tag: string }) {
  const key = tag.toLowerCase().trim()
  const info = DIETARY_LABELS[key]
  if (!info) {
    return (
      <span className="inline-flex items-center rounded-full bg-stone-700 px-2.5 py-0.5 text-sm font-medium text-stone-200">
        {tag}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold ${info.color}`}
    >
      {info.label}
    </span>
  )
}

function AllergenBadge({ allergen }: { allergen: string }) {
  const key = allergen.toLowerCase().trim()
  const color = ALLERGEN_COLORS[key] || 'bg-red-800 text-red-100'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold ${color}`}>
      ⚠ {allergen}
    </span>
  )
}

function formatTime(time: string | null): string {
  if (!time) return ''
  // time is in HH:MM:SS or HH:MM format
  const parts = time.split(':')
  const hours = parseInt(parts[0])
  const minutes = parts[1] || '00'
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes} ${ampm}`
}

/** Group dishes by course */
function groupByCourse(dishes: KioskMenuDish[]): Map<string, KioskMenuDish[]> {
  const groups = new Map<string, KioskMenuDish[]>()
  for (const dish of dishes) {
    const key = dish.course_name
    const list = groups.get(key) || []
    list.push(dish)
    groups.set(key, list)
  }
  return groups
}

export function KioskMenuBrowse({ token }: KioskMenuBrowseProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [menus, setMenus] = useState<KioskMenu[]>([])
  const [selectedMenuIdx, setSelectedMenuIdx] = useState(0)

  const loadMenus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getKioskMenus(token)
      if (!result.success) {
        setError(result.error)
        return
      }
      setMenus(result.menus)
      setSelectedMenuIdx(0)
    } catch {
      setError('Failed to load menus')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadMenus()
  }, [loadMenus])

  if (loading) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center justify-center gap-4 select-none">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-600 border-t-brand-500" />
        <p className="text-lg text-stone-400">Loading menu...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center justify-center gap-4 select-none">
        <div className="rounded-xl bg-red-950 px-6 py-4 text-center">
          <p className="text-xl text-red-300">{error}</p>
        </div>
        <button
          onClick={loadMenus}
          className="rounded-xl bg-stone-800 px-6 py-3 text-lg font-medium text-stone-200 transition-colors hover:bg-stone-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (menus.length === 0) {
    return (
      <div className="flex w-full max-w-2xl flex-col items-center justify-center gap-3 select-none">
        <p className="text-2xl font-semibold text-stone-300">No Menus Today</p>
        <p className="text-lg text-stone-500">
          There are no event menus scheduled for today.
        </p>
      </div>
    )
  }

  const currentMenu = menus[selectedMenuIdx]
  const courseGroups = groupByCourse(currentMenu.dishes)

  return (
    <div className="flex w-full max-w-2xl flex-col gap-6 select-none">
      {/* Event selector (only if multiple events today) */}
      {menus.length > 1 && (
        <div className="flex flex-col gap-3">
          <p className="text-center text-lg font-medium text-stone-400">
            {menus.length} events today. Select one:
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {menus.map((menu, idx) => (
              <button
                key={menu.menu_id}
                onClick={() => setSelectedMenuIdx(idx)}
                className={`rounded-xl px-5 py-3 text-lg font-medium transition-colors ${
                  idx === selectedMenuIdx
                    ? 'bg-brand-500 text-white'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {menu.event_occasion || menu.menu_name}
                {menu.serve_time ? ` (${formatTime(menu.serve_time)})` : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-stone-100">{currentMenu.menu_name}</h2>
        {currentMenu.menu_description && (
          <p className="mt-2 text-lg text-stone-400">{currentMenu.menu_description}</p>
        )}
        <div className="mt-2 flex items-center justify-center gap-4 text-base text-stone-500">
          {currentMenu.event_occasion && <span>{currentMenu.event_occasion}</span>}
          {currentMenu.serve_time && <span>{formatTime(currentMenu.serve_time)}</span>}
          {currentMenu.guest_count > 0 && (
            <span>{currentMenu.guest_count} guests</span>
          )}
        </div>
      </div>

      {/* Courses */}
      {currentMenu.dishes.length === 0 ? (
        <div className="rounded-xl bg-stone-900 p-6 text-center">
          <p className="text-xl text-stone-400">No dishes added to this menu yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(courseGroups.entries()).map(([courseName, dishes]) => (
            <div key={courseName} className="flex flex-col gap-3">
              {/* Course header */}
              <div className="border-b border-stone-800 pb-2">
                <h3 className="text-xl font-semibold uppercase tracking-wider text-stone-400">
                  {courseName}
                </h3>
              </div>

              {/* Dishes in this course */}
              {dishes.map((dish) => (
                <div
                  key={dish.id}
                  className="rounded-xl bg-stone-900 px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-2xl font-medium text-stone-100">
                        {dish.name || dish.course_name}
                      </p>
                      {dish.description && (
                        <p className="mt-1 text-lg text-stone-400">{dish.description}</p>
                      )}
                    </div>

                    {/* Dietary + allergen badges */}
                    <div className="flex flex-shrink-0 flex-wrap gap-1.5">
                      {dish.dietary_tags.map((tag) => (
                        <DietaryBadge key={tag} tag={tag} />
                      ))}
                    </div>
                  </div>

                  {/* Allergen warning row (prominent) */}
                  {dish.allergen_flags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {dish.allergen_flags.map((allergen) => (
                        <AllergenBadge key={allergen} allergen={allergen} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Allergen disclaimer */}
      <div className="rounded-xl bg-stone-900/50 px-5 py-3 text-center">
        <p className="text-base text-stone-500">
          Please inform your server of any allergies or dietary requirements.
        </p>
      </div>
    </div>
  )
}
