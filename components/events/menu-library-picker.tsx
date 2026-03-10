'use client'

import { useState, useMemo, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Alert } from '@/components/ui/alert'
import { applyMenuToEvent } from '@/lib/menus/actions'
import { markPreferencesViewed } from '@/lib/menus/preference-actions'
import Link from 'next/link'

type MenuSummary = {
  id: string
  name: string
  description: string | null
  cuisineType: string | null
  serviceStyle: string | null
  isTemplate: boolean
  isShowcase: boolean
  status: string
  timesUsed: number
  guestCount: number | null
  dishCount: number
  dietaryTags: string[]
  updatedAt: string
  dishes: Array<{
    id: string
    courseName: string
    courseNumber: number
    description: string | null
    dietaryTags: string[]
    allergenFlags: string[]
  }>
}

type Preferences = {
  id: string
  cuisine_preferences: string[]
  service_style_pref: string | null
  foods_love: string | null
  foods_avoid: string | null
  special_requests: string | null
  adventurousness: string
  selection_mode: string
  selected_menu_id: string | null
  customization_notes: string | null
  submitted_at: string
  chef_viewed_at: string | null
} | null

type Props = {
  eventId: string
  menus: MenuSummary[]
  preferences: Preferences
}

type TabKey = 'all' | 'templates' | 'showcase' | 'recent'

export function MenuLibraryPicker({ eventId, menus, preferences }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabKey>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-mark preferences as viewed if they haven't been
  if (preferences && !preferences.chef_viewed_at) {
    startTransition(() => {
      try {
        void markPreferencesViewed(eventId)
      } catch (err) {
        console.error('[non-blocking] markPreferencesViewed failed:', err)
      }
    })
  }

  const filtered = useMemo(() => {
    let result = menus

    // Tab filter
    if (tab === 'templates') result = result.filter((m) => m.isTemplate)
    else if (tab === 'showcase') result = result.filter((m) => m.isShowcase)
    else if (tab === 'recent') result = result.slice(0, 10)

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.cuisineType ?? '').toLowerCase().includes(q) ||
          (m.description ?? '').toLowerCase().includes(q)
      )
    }

    return result
  }, [menus, tab, search])

  const handleApply = async (menuId: string) => {
    setLoading(true)
    setError(null)
    try {
      await applyMenuToEvent(menuId, eventId)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply menu')
    } finally {
      setLoading(false)
    }
  }

  const modeLabels: Record<string, string> = {
    picked: 'picked a showcase menu',
    customized: 'wants to customize a menu',
    custom_request: 'submitted preferences',
    exact_request: 'has a specific request',
    surprise_me: 'wants to be surprised',
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: menus.length },
    { key: 'templates', label: 'Templates', count: menus.filter((m) => m.isTemplate).length },
    { key: 'showcase', label: 'Showcase', count: menus.filter((m) => m.isShowcase).length },
    { key: 'recent', label: 'Recent', count: Math.min(menus.length, 10) },
  ]

  return (
    <div className="space-y-4">
      {/* Client Preferences Summary */}
      {preferences && (
        <Card className="border-brand-700">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-950 flex items-center justify-center shrink-0 mt-0.5">
                <svg
                  className="w-4 h-4 text-brand-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-300">
                  Client {modeLabels[preferences.selection_mode] ?? 'submitted preferences'}
                  {!preferences.chef_viewed_at && (
                    <Badge variant="warning" className="ml-2">
                      New
                    </Badge>
                  )}
                </p>

                {preferences.cuisine_preferences?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {preferences.cuisine_preferences.map((c: string) => (
                      <Badge key={c} variant="default">
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}

                {preferences.foods_love && (
                  <p className="text-xs text-stone-400 mt-1">
                    <span className="text-emerald-400">Loves:</span> {preferences.foods_love}
                  </p>
                )}
                {preferences.foods_avoid && (
                  <p className="text-xs text-stone-400 mt-1">
                    <span className="text-red-400">Avoids:</span> {preferences.foods_avoid}
                  </p>
                )}
                {preferences.special_requests && (
                  <p className="text-xs text-stone-400 mt-1">
                    <span className="text-stone-300">Notes:</span> {preferences.special_requests}
                  </p>
                )}
                {preferences.customization_notes && (
                  <p className="text-xs text-stone-400 mt-1">
                    <span className="text-stone-300">Customization:</span>{' '}
                    {preferences.customization_notes}
                  </p>
                )}
                {preferences.adventurousness && preferences.adventurousness !== 'balanced' && (
                  <Badge variant="info" className="mt-1">
                    {preferences.adventurousness === 'classic' ? 'Prefers classic' : 'Adventurous'}
                  </Badge>
                )}

                {preferences.selected_menu_id && (
                  <p className="text-xs text-brand-400 mt-1">
                    Selected menu:{' '}
                    {menus.find((m) => m.id === preferences.selected_menu_id)?.name ??
                      preferences.selected_menu_id}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Menu Library</CardTitle>
            <Link href="/menus/new">
              <Button variant="primary" size="sm">
                Create New
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-stone-800 pb-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-t text-sm transition ${
                  tab === t.key
                    ? 'bg-stone-800 text-brand-300 font-medium'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {t.label} <span className="text-stone-500">({t.count})</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <Input
            type="text"
            placeholder="Search by name or cuisine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {error && <Alert variant="error">{error}</Alert>}

          {/* Menu List */}
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm text-stone-500 text-center py-4">No menus found.</p>
            ) : (
              filtered.map((menu) => (
                <div
                  key={menu.id}
                  className="border border-stone-700 rounded-lg p-3 hover:border-stone-600 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expandedId === menu.id ? null : menu.id)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-stone-100 text-sm">{menu.name}</span>
                        {menu.isTemplate && <Badge variant="info">Template</Badge>}
                        {menu.isShowcase && <Badge variant="success">Showcase</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                        {menu.cuisineType && <span>{menu.cuisineType}</span>}
                        <span>{menu.dishCount} courses</span>
                        {menu.timesUsed > 0 && <span>Used {menu.timesUsed}x</span>}
                      </div>
                    </button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleApply(menu.id)}
                      disabled={loading}
                    >
                      Use
                    </Button>
                  </div>

                  {/* Expanded: show dishes */}
                  {expandedId === menu.id && menu.dishes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-800 space-y-1">
                      {menu.dishes
                        .sort((a, b) => a.courseNumber - b.courseNumber)
                        .map((dish) => (
                          <div key={dish.id} className="flex items-start gap-2">
                            <span className="text-xs text-stone-500 w-4 shrink-0 text-right mt-0.5">
                              {dish.courseNumber}.
                            </span>
                            <div>
                              <span className="text-sm text-stone-300">{dish.courseName}</span>
                              {dish.description && (
                                <p className="text-xs text-stone-500">{dish.description}</p>
                              )}
                              {dish.dietaryTags.length > 0 && (
                                <div className="flex gap-1 mt-0.5">
                                  {dish.dietaryTags.map((t) => (
                                    <Badge key={t} variant="info">
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
