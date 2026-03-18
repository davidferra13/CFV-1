'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  addPreference,
  getClientPreferences,
  deletePreference,
  type ClientPreference,
  type PreferenceRating,
  type PreferenceItemType,
} from '@/lib/clients/preference-actions'

type TabKey = 'loved' | 'liked' | 'disliked' | 'all'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'loved', label: 'Loved' },
  { key: 'liked', label: 'Liked' },
  { key: 'disliked', label: 'Disliked' },
  { key: 'all', label: 'All' },
]

const RATING_LABELS: Record<PreferenceRating, string> = {
  loved: 'Loved',
  liked: 'Liked',
  neutral: 'Neutral',
  disliked: 'Disliked',
}

const RATING_COLORS: Record<PreferenceRating, string> = {
  loved: 'bg-rose-900/40 text-rose-300',
  liked: 'bg-emerald-900/40 text-emerald-300',
  neutral: 'bg-stone-800 text-stone-400',
  disliked: 'bg-amber-900/40 text-amber-300',
}

const TYPE_COLORS: Record<PreferenceItemType, string> = {
  dish: 'bg-blue-900/40 text-blue-300',
  ingredient: 'bg-purple-900/40 text-purple-300',
  cuisine: 'bg-teal-900/40 text-teal-300',
  technique: 'bg-orange-900/40 text-orange-300',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function PreferencePanel({
  clientId,
  clientName,
}: {
  clientId: string
  clientName?: string
}) {
  const [tab, setTab] = useState<TabKey>('all')
  const [prefs, setPrefs] = useState<ClientPreference[]>([])
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [loadError, setLoadError] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formType, setFormType] = useState<PreferenceItemType>('dish')
  const [formRating, setFormRating] = useState<PreferenceRating>('liked')
  const [formNotes, setFormNotes] = useState('')

  const loadPreferences = useCallback(() => {
    startTransition(async () => {
      try {
        const data = await getClientPreferences(clientId)
        setPrefs(data)
        setLoadError(false)
      } catch {
        setLoadError(true)
      }
    })
  }, [clientId])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  const filtered = tab === 'all' ? prefs : prefs.filter((p) => p.rating === tab)

  function handleAdd() {
    if (!formName.trim()) return
    const previous = prefs
    startTransition(async () => {
      try {
        const newPref = await addPreference(clientId, {
          itemType: formType,
          itemName: formName.trim(),
          rating: formRating,
          notes: formNotes.trim() || null,
        })
        setPrefs((prev) => [newPref, ...prev])
        setFormName('')
        setFormNotes('')
        setShowForm(false)
      } catch {
        setPrefs(previous)
      }
    })
  }

  function handleDelete(prefId: string) {
    const previous = prefs
    setPrefs((prev) => prev.filter((p) => p.id !== prefId))
    startTransition(async () => {
      try {
        await deletePreference(prefId)
      } catch {
        setPrefs(previous)
      }
    })
  }

  if (loadError) {
    return (
      <Card className="bg-stone-900 border-stone-800">
        <CardContent className="py-6">
          <p className="text-sm text-red-400">Could not load preferences. Please try again.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-stone-900 border-stone-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base text-stone-100">
          Taste Profile{clientName ? ` - ${clientName}` : ''}
        </CardTitle>
        <Button variant="ghost" onClick={() => setShowForm(!showForm)} className="text-xs">
          {showForm ? 'Cancel' : '+ Add'}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add form */}
        {showForm && (
          <div className="space-y-3 p-3 rounded bg-stone-800/60 border border-stone-700">
            <Input
              placeholder="Item name (e.g., Truffle risotto)"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="bg-stone-900"
            />
            <div className="flex gap-2">
              <Select
                value={formType}
                onChange={(e) => setFormType(e.target.value as PreferenceItemType)}
                className="flex-1 bg-stone-900"
              >
                <option value="dish">Dish</option>
                <option value="ingredient">Ingredient</option>
                <option value="cuisine">Cuisine</option>
                <option value="technique">Technique</option>
              </Select>
              <Select
                value={formRating}
                onChange={(e) => setFormRating(e.target.value as PreferenceRating)}
                className="flex-1 bg-stone-900"
              >
                <option value="loved">Loved</option>
                <option value="liked">Liked</option>
                <option value="neutral">Neutral</option>
                <option value="disliked">Disliked</option>
              </Select>
            </div>
            <Textarea
              placeholder="Notes (optional)"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={2}
              className="bg-stone-900"
            />
            <Button
              variant="primary"
              onClick={handleAdd}
              disabled={!formName.trim() || isPending}
              className="w-full"
            >
              {isPending ? 'Saving...' : 'Add Preference'}
            </Button>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-stone-800 pb-1">
          {TABS.map((t) => {
            const count =
              t.key === 'all' ? prefs.length : prefs.filter((p) => p.rating === t.key).length
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 text-xs rounded-t transition-colors ${
                  tab === t.key
                    ? 'bg-stone-800 text-stone-100 font-medium'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                {t.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Preference list */}
        {filtered.length === 0 ? (
          <p className="text-sm text-stone-500 py-4 text-center">No preferences recorded yet.</p>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filtered.map((pref) => (
              <div
                key={pref.id}
                className="flex items-start justify-between gap-2 p-2 rounded bg-stone-800/40 hover:bg-stone-800/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium text-stone-100">{pref.itemName}</span>
                    <span
                      className={`text-xxs px-1.5 py-0.5 rounded ${TYPE_COLORS[pref.itemType]}`}
                    >
                      {pref.itemType}
                    </span>
                    <span
                      className={`text-xxs px-1.5 py-0.5 rounded ${RATING_COLORS[pref.rating]}`}
                    >
                      {RATING_LABELS[pref.rating]}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {formatDate(pref.observedAt)}
                    {pref.notes && ` · ${pref.notes}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(pref.id)}
                  className="text-stone-600 hover:text-red-400 text-xs shrink-0 mt-1"
                  title="Remove preference"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
