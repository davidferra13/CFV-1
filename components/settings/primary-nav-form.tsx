'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp } from '@/components/ui/icons'
import { applyRecommendedPrimaryNav, updateChefPreferences } from '@/lib/chef/actions'
import {
  DEFAULT_PRIMARY_SHORTCUT_HREFS,
  REQUIRED_PRIMARY_SHORTCUT_HREFS,
  ensureRequiredPrimaryShortcutHrefs,
  getPrimaryShortcutOptions,
} from '@/components/navigation/nav-config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type PrimaryShortcutOption = ReturnType<typeof getPrimaryShortcutOptions>[number]

const ALL_SHORTCUT_OPTIONS: PrimaryShortcutOption[] = getPrimaryShortcutOptions()
const REQUIRED_SHORTCUT_SET = new Set<string>(REQUIRED_PRIMARY_SHORTCUT_HREFS)

function normalizeHrefOrder(hrefs: string[]): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const rawHref of hrefs) {
    const href = rawHref.trim()
    if (!href || seen.has(href)) continue
    if (!ALL_SHORTCUT_OPTIONS.some((option) => option.href === href)) continue
    seen.add(href)
    normalized.push(href)
  }

  return ensureRequiredPrimaryShortcutHrefs(normalized)
}

function equalOrder(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) return false
  }
  return true
}

function getInitialSelection(initialPrimaryNavHrefs: string[]): string[] {
  if (initialPrimaryNavHrefs.length === 0) return [...DEFAULT_PRIMARY_SHORTCUT_HREFS]
  const normalized = normalizeHrefOrder(initialPrimaryNavHrefs)
  if (normalized.length === 0) return [...DEFAULT_PRIMARY_SHORTCUT_HREFS]
  return normalized
}

export function PrimaryNavForm({ initialPrimaryNavHrefs }: { initialPrimaryNavHrefs: string[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedHrefs, setSelectedHrefs] = useState<string[]>(
    getInitialSelection(initialPrimaryNavHrefs)
  )
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const selectedSet = useMemo(() => new Set(selectedHrefs), [selectedHrefs])

  const selectedOptions = useMemo(() => {
    const byHref = new Map(ALL_SHORTCUT_OPTIONS.map((option) => [option.href, option] as const))
    return selectedHrefs
      .map((href) => byHref.get(href))
      .filter((option): option is PrimaryShortcutOption => Boolean(option))
  }, [selectedHrefs])

  const availableOptions = useMemo(() => {
    const term = search.trim().toLowerCase()
    return ALL_SHORTCUT_OPTIONS.filter((option) => !selectedSet.has(option.href)).filter(
      (option) => {
        if (!term) return true
        return (
          option.label.toLowerCase().includes(term) ||
          option.href.toLowerCase().includes(term) ||
          option.context.toLowerCase().includes(term)
        )
      }
    )
  }, [search, selectedSet])

  const moveSelected = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= selectedHrefs.length) return

    setSelectedHrefs((prev) => {
      const next = [...prev]
      const [moved] = next.splice(index, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })

    setNotice(null)
  }

  const removeSelected = (href: string) => {
    setSelectedHrefs((prev) => prev.filter((item) => item !== href))
    setNotice(null)
  }

  const addShortcut = (href: string) => {
    setSelectedHrefs((prev) => [...prev, href])
    setNotice(null)
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setNotice(null)

    const normalized = normalizeHrefOrder(selectedHrefs)
    const payload = equalOrder(normalized, DEFAULT_PRIMARY_SHORTCUT_HREFS) ? [] : normalized

    startTransition(async () => {
      try {
        await updateChefPreferences({ primary_nav_hrefs: payload })
        setNotice({ type: 'success', text: 'Primary navigation saved.' })
        router.refresh()
      } catch (err) {
        setNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to save primary navigation',
        })
      }
    })
  }

  const handleApplyRecommended = () => {
    setNotice(null)
    startTransition(async () => {
      try {
        await applyRecommendedPrimaryNav()
        setSelectedHrefs([...DEFAULT_PRIMARY_SHORTCUT_HREFS])
        setSearch('')
        setNotice({ type: 'success', text: 'Recommended navigation applied.' })
        router.refresh()
      } catch (err) {
        setNotice({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to apply recommended navigation',
        })
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Primary Bar (Visible)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-500">
              These tabs stay visible in your primary bar. Drag-style reorder is done with up/down.
            </p>

            {selectedOptions.length === 0 && (
              <p className="rounded-md border border-dashed border-stone-600 p-3 text-sm text-stone-500">
                No primary tabs selected. Add at least one from the available list.
              </p>
            )}

            {selectedOptions.map((option, index) => (
              <div key={option.href} className="rounded-lg border border-stone-700 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-100">{option.label}</p>
                      {REQUIRED_SHORTCUT_SET.has(option.href) && (
                        <span className="rounded-full bg-brand-950 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-300">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500">{option.context}</p>
                    <p className="text-xs text-stone-400">{option.href}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => moveSelected(index, 'up')}
                      aria-label={`Move ${option.label} up`}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === selectedOptions.length - 1}
                      onClick={() => moveSelected(index, 'down')}
                      aria-label={`Move ${option.label} down`}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSelected(option.href)}
                      disabled={REQUIRED_SHORTCUT_SET.has(option.href)}
                    >
                      {REQUIRED_SHORTCUT_SET.has(option.href) ? 'Required' : 'Remove'}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Tabs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-stone-500">
              Any route listed here can be promoted into your primary bar.
            </p>

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by tab name or route"
              className="w-full rounded-md border border-stone-600 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            />

            <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
              {availableOptions.length === 0 && (
                <p className="rounded-md border border-dashed border-stone-600 p-3 text-sm text-stone-500">
                  No matching tabs available.
                </p>
              )}

              {availableOptions.map((option) => (
                <div
                  key={option.href}
                  className="flex items-center justify-between gap-3 rounded-lg border border-stone-700 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-100">{option.label}</p>
                    <p className="text-xs text-stone-500">{option.context}</p>
                    <p className="text-xs text-stone-400">{option.href}</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => addShortcut(option.href)}
                  >
                    Add
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {notice?.type === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-950 p-4">
          <p className="text-sm text-red-200">{notice.text}</p>
        </div>
      )}

      {notice?.type === 'success' && (
        <div className="rounded-lg border border-green-200 bg-green-950 p-4">
          <p className="text-sm text-green-200">{notice.text}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setSelectedHrefs([...DEFAULT_PRIMARY_SHORTCUT_HREFS])
            setSearch('')
            setNotice(null)
          }}
          disabled={isPending}
        >
          Reset Form to Default
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleApplyRecommended}
          disabled={isPending}
        >
          Apply Recommended Nav
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving...' : 'Save Primary Bar'}
        </Button>
      </div>
    </form>
  )
}
