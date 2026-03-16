'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShowcaseMenuCard } from '@/components/menus/showcase-menu-card'
import { ShowcaseMenuPreview } from '@/components/menus/showcase-menu-preview'
import { MenuPreferencesForm } from '@/components/menus/menu-preferences-form'
import { submitMenuPreferences } from '@/lib/menus/preference-actions'

type ShowcaseMenu = {
  id: string
  name: string
  description: string | null
  cuisineType: string | null
  serviceStyle: string | null
  guestCount: number | null
  timesUsed: number
  dishCount: number
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
  cuisine_preferences: string[]
  service_style_pref: string | null
  foods_love: string | null
  foods_avoid: string | null
  special_requests: string | null
  adventurousness: string
  selection_mode: string
  selected_menu_id: string | null
  customization_notes: string | null
} | null

type Props = {
  eventId: string
  showcaseMenus: ShowcaseMenu[]
  existingPreferences: Preferences
  chefName: string
}

type Mode = 'paths' | 'browse' | 'preferences' | 'exact' | 'submitted'

export function ChooseMenuClient({ eventId, showcaseMenus, existingPreferences, chefName }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(existingPreferences ? 'submitted' : 'paths')
  const [selectedMenu, setSelectedMenu] = useState<ShowcaseMenu | null>(null)
  const [previewMenu, setPreviewMenu] = useState<ShowcaseMenu | null>(null)
  const [customizationNotes, setCustomizationNotes] = useState('')
  const [exactRequest, setExactRequest] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Already submitted
  if (mode === 'submitted' && existingPreferences) {
    const modeLabels: Record<string, string> = {
      picked: 'You picked a menu',
      customized: 'You customized a menu',
      custom_request: 'Your preferences were sent',
      exact_request: 'Your request was sent',
      surprise_me: 'You opted for a surprise',
    }
    return (
      <Card>
        <CardContent className="py-8 text-center space-y-3">
          <div className="text-3xl">&#10003;</div>
          <p className="font-semibold text-stone-100">
            {modeLabels[existingPreferences.selection_mode] ?? 'Preferences submitted'}
          </p>
          <p className="text-sm text-stone-400">
            Your chef is working on it. You&apos;ll be notified when the menu is ready for review.
          </p>
          <div className="flex gap-2 justify-center pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setMode('paths')
              }}
            >
              Update Preferences
            </Button>
            <Button variant="ghost" onClick={() => router.push(`/my-events/${eventId}`)}>
              Back to Event
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async (
    selectionMode: 'picked' | 'customized' | 'custom_request' | 'exact_request' | 'surprise_me',
    data: Partial<{
      cuisinePreferences: string[]
      serviceStylePref: string
      foodsLove: string
      foodsAvoid: string
      specialRequests: string
      adventurousness: 'classic' | 'balanced' | 'adventurous'
      selectedMenuId: string
      customizationNotes: string
    }>
  ) => {
    setLoading(true)
    setError(null)
    try {
      await submitMenuPreferences({
        eventId,
        selectionMode,
        cuisinePreferences: data.cuisinePreferences ?? [],
        serviceStylePref: data.serviceStylePref,
        foodsLove: data.foodsLove,
        foodsAvoid: data.foodsAvoid,
        specialRequests: data.specialRequests,
        adventurousness: data.adventurousness ?? 'balanced',
        selectedMenuId: data.selectedMenuId,
        customizationNotes: data.customizationNotes,
      })
      router.refresh()
      setMode('submitted')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // Four path selection
  if (mode === 'paths') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-stone-400">
          Choose how you&apos;d like to get started with your menu.
        </p>

        {/* Path 1: Browse showcase menus */}
        {showcaseMenus.length > 0 && (
          <button
            type="button"
            onClick={() => setMode('browse')}
            className="w-full text-left rounded-xl border border-stone-700 bg-stone-900 p-5 hover:border-brand-500 transition group"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-950 flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5 text-brand-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-stone-100 group-hover:text-brand-300 transition">
                  Browse Past Menus
                </h3>
                <p className="text-sm text-stone-400 mt-0.5">
                  See what {chefName} has created before. Pick one as-is or use it as a starting
                  point.
                </p>
                <Badge variant="info" className="mt-2">
                  {showcaseMenus.length} menus
                </Badge>
              </div>
            </div>
          </button>
        )}

        {/* Path 2: Submit preferences */}
        <button
          type="button"
          onClick={() => setMode('preferences')}
          className="w-full text-left rounded-xl border border-stone-700 bg-stone-900 p-5 hover:border-brand-500 transition group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand-950 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-brand-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-stone-100 group-hover:text-brand-300 transition">
                I Have Some Ideas
              </h3>
              <p className="text-sm text-stone-400 mt-0.5">
                Tell us about your cuisine preferences, dietary needs, and what sounds good. Your
                chef will craft something custom.
              </p>
            </div>
          </div>
        </button>

        {/* Path 3: Exact request */}
        <button
          type="button"
          onClick={() => setMode('exact')}
          className="w-full text-left rounded-xl border border-stone-700 bg-stone-900 p-5 hover:border-brand-500 transition group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand-950 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-brand-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-stone-100 group-hover:text-brand-300 transition">
                I Know Exactly What I Want
              </h3>
              <p className="text-sm text-stone-400 mt-0.5">
                Have specific dishes in mind? Tell your chef exactly what you&apos;d like.
              </p>
            </div>
          </div>
        </button>

        {/* Path 4: Surprise me */}
        <button
          type="button"
          onClick={() => {
            void handleSubmit('surprise_me', { adventurousness: 'adventurous' })
          }}
          disabled={loading}
          className="w-full text-left rounded-xl border border-stone-700 bg-stone-900 p-5 hover:border-brand-500 transition group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand-950 flex items-center justify-center shrink-0">
              <svg
                className="w-5 h-5 text-brand-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-stone-100 group-hover:text-brand-300 transition">
                Surprise Me!
              </h3>
              <p className="text-sm text-stone-400 mt-0.5">
                Give your chef full creative freedom. Just sit back and enjoy.
              </p>
            </div>
          </div>
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  // Browse showcase menus
  if (mode === 'browse') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100">Browse Menus</h2>
          <Button variant="ghost" onClick={() => setMode('paths')}>
            Back
          </Button>
        </div>
        <p className="text-sm text-stone-400">
          Tap any menu to see the full details. Use it as-is or as a starting point for your custom
          menu.
        </p>

        <div className="grid gap-3">
          {showcaseMenus.map((menu) => (
            <ShowcaseMenuCard
              key={menu.id}
              menu={menu}
              onClick={() => setPreviewMenu(menu)}
              selected={selectedMenu?.id === menu.id}
            />
          ))}
        </div>

        {/* Customization notes for "use as base" */}
        {selectedMenu && (
          <Card>
            <CardContent className="py-4 space-y-3">
              <p className="text-sm font-medium text-stone-300">
                Customizing: <span className="text-brand-400">{selectedMenu.name}</span>
              </p>
              <textarea
                value={customizationNotes}
                onChange={(e) => setCustomizationNotes(e.target.value)}
                placeholder="What would you like changed? e.g., Swap the olives for sun-dried tomatoes, make course 2 dairy-free..."
                rows={3}
                className="w-full rounded-lg border border-stone-700 bg-stone-800 p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <Button
                variant="primary"
                onClick={() =>
                  void handleSubmit('customized', {
                    selectedMenuId: selectedMenu.id,
                    customizationNotes,
                  })
                }
                disabled={loading || !customizationNotes.trim()}
                className="w-full"
              >
                {loading ? 'Sending...' : 'Send Customization Request'}
              </Button>
            </CardContent>
          </Card>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {previewMenu && (
          <ShowcaseMenuPreview
            menu={previewMenu}
            onUseAsIs={() => {
              void handleSubmit('picked', { selectedMenuId: previewMenu.id })
              setPreviewMenu(null)
            }}
            onUseAsBase={() => {
              setSelectedMenu(previewMenu)
              setPreviewMenu(null)
            }}
            onClose={() => setPreviewMenu(null)}
            loading={loading}
          />
        )}
      </div>
    )
  }

  // Preferences form
  if (mode === 'preferences') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100">Your Preferences</h2>
          <Button variant="ghost" onClick={() => setMode('paths')}>
            Back
          </Button>
        </div>
        <MenuPreferencesForm
          onSubmit={(data) => void handleSubmit('custom_request', data)}
          loading={loading}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  // Exact request
  if (mode === 'exact') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-100">Your Request</h2>
          <Button variant="ghost" onClick={() => setMode('paths')}>
            Back
          </Button>
        </div>
        <p className="text-sm text-stone-400">
          Tell your chef exactly what you&apos;d like. Be as specific or as general as you want.
        </p>
        <textarea
          value={exactRequest}
          onChange={(e) => setExactRequest(e.target.value)}
          placeholder="e.g., Burrata salad to start, hand-made pappardelle with wild boar ragu for main, and tiramisu for dessert. One guest is vegetarian - please have a veggie main option."
          rows={5}
          className="w-full rounded-lg border border-stone-700 bg-stone-800 p-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <Button
          variant="primary"
          onClick={() => void handleSubmit('exact_request', { specialRequests: exactRequest })}
          disabled={loading || !exactRequest.trim()}
          className="w-full"
        >
          {loading ? 'Sending...' : 'Send Request to Chef'}
        </Button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    )
  }

  return null
}
