'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateChefPreferences } from '@/lib/chef/actions'
import { MOBILE_TAB_OPTIONS, mobileTabItems } from '@/components/navigation/nav-config'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const DEFAULT_HREFS = mobileTabItems.map((t) => t.href)
const MAX_TABS = 5

function getInitialSelection(saved: string[]): string[] {
  if (saved.length === 0) return [...DEFAULT_HREFS]
  const valid = saved.filter((h) => MOBILE_TAB_OPTIONS.some((o) => o.href === h))
  return valid.length > 0 ? valid : [...DEFAULT_HREFS]
}

export function MobileTabForm({ initialMobileTabHrefs }: { initialMobileTabHrefs: string[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedHrefs, setSelectedHrefs] = useState<string[]>(
    getInitialSelection(initialMobileTabHrefs)
  )
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedSet = useMemo(() => new Set(selectedHrefs), [selectedHrefs])
  const hasChanges = useMemo(() => {
    const initial = getInitialSelection(initialMobileTabHrefs)
    if (initial.length !== selectedHrefs.length) return true
    return initial.some((h, i) => h !== selectedHrefs[i])
  }, [selectedHrefs, initialMobileTabHrefs])

  function toggle(href: string) {
    setSuccess(false)
    setError(null)
    if (selectedSet.has(href)) {
      setSelectedHrefs((prev) => prev.filter((h) => h !== href))
    } else if (selectedHrefs.length < MAX_TABS) {
      setSelectedHrefs((prev) => [...prev, href])
    }
  }

  function moveUp(index: number) {
    if (index <= 0) return
    setSelectedHrefs((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  function moveDown(index: number) {
    if (index >= selectedHrefs.length - 1) return
    setSelectedHrefs((prev) => {
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  function resetDefaults() {
    setSelectedHrefs([...DEFAULT_HREFS])
    setSuccess(false)
    setError(null)
  }

  function save() {
    setSuccess(false)
    setError(null)
    startTransition(async () => {
      try {
        await updateChefPreferences({ mobile_tab_hrefs: selectedHrefs })
        setSuccess(true)
        router.refresh()
      } catch {
        setError('Failed to save mobile tabs. Please try again.')
      }
    })
  }

  return (
    <Card className="border-stone-700 bg-stone-900/50">
      <CardHeader>
        <CardTitle className="text-stone-100">Mobile Bottom Tabs</CardTitle>
        <p className="text-sm text-stone-400">
          Pick up to {MAX_TABS} tabs for your mobile bottom bar. Drag to reorder.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current selection (ordered) */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Active tabs ({selectedHrefs.length}/{MAX_TABS})
          </p>
          {selectedHrefs.length === 0 && (
            <p className="text-sm text-stone-500 italic">No tabs selected. Pick from below.</p>
          )}
          <div className="space-y-1">
            {selectedHrefs.map((href, i) => {
              const opt = MOBILE_TAB_OPTIONS.find((o) => o.href === href)
              if (!opt) return null
              const Icon = opt.icon
              return (
                <div
                  key={href}
                  className="flex items-center gap-2 rounded-lg border border-brand-600/40 bg-brand-950/30 px-3 py-2"
                >
                  <Icon className="h-4 w-4 text-brand-400 shrink-0" />
                  <span className="flex-1 text-sm text-stone-200">{opt.label}</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="p-1 rounded text-stone-500 hover:text-stone-200 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 19V5M5 12l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(i)}
                      disabled={i === selectedHrefs.length - 1}
                      className="p-1 rounded text-stone-500 hover:text-stone-200 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 5v14M5 12l7 7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(href)}
                      className="p-1 rounded text-stone-500 hover:text-red-400"
                      aria-label="Remove"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Available options */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">
            Available tabs
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {MOBILE_TAB_OPTIONS.filter((o) => !selectedSet.has(o.href)).map((opt) => {
              const Icon = opt.icon
              const disabled = selectedHrefs.length >= MAX_TABS
              return (
                <button
                  key={opt.href}
                  type="button"
                  onClick={() => toggle(opt.href)}
                  disabled={disabled}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
                    disabled
                      ? 'border-stone-800 bg-stone-900/30 text-stone-600 cursor-not-allowed'
                      : 'border-stone-700 bg-stone-900/50 text-stone-300 hover:border-brand-600/40 hover:bg-brand-950/20'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={save} disabled={isPending || !hasChanges} variant="primary">
            {isPending ? 'Saving...' : 'Save Mobile Tabs'}
          </Button>
          <Button onClick={resetDefaults} variant="ghost" disabled={isPending}>
            Reset to Default
          </Button>
        </div>

        {success && (
          <p className="text-sm text-green-400">Mobile tabs saved. Changes visible on mobile.</p>
        )}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </CardContent>
    </Card>
  )
}
