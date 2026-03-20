'use client'

import { useState, useTransition, useEffect } from 'react'
import { toast } from 'sonner'
import {
  getTaxonomy,
  addTaxonomyEntry,
  removeTaxonomyEntry,
  hideTaxonomyDefault,
  unhideTaxonomyDefault,
} from '@/lib/taxonomy/actions'
import type { TaxonomyCategory, TaxonomyEntry } from '@/lib/taxonomy/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type CategoryInfo = {
  value: TaxonomyCategory
  label: string
  description: string
}

export default function TaxonomySettings({ categories }: { categories: CategoryInfo[] }) {
  const [selectedCategory, setSelectedCategory] = useState<TaxonomyCategory>(
    categories[0]?.value ?? 'cuisine'
  )
  const [entries, setEntries] = useState<TaxonomyEntry[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)

  // Load entries when category changes
  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    getTaxonomy(selectedCategory)
      .then((data) => {
        if (!cancelled) {
          setEntries(data)
          setIsLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntries([])
          setIsLoading(false)
          toast.error('Failed to load entries')
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedCategory])

  const activeCount = entries.filter((e) => !e.isHidden).length
  const selectedInfo = categories.find((c) => c.value === selectedCategory)

  function handleToggleVisibility(entry: TaxonomyEntry) {
    const previous = [...entries]
    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        e.value === entry.value && e.isSystem === entry.isSystem
          ? { ...e, isHidden: !e.isHidden }
          : e
      )
    )

    startTransition(async () => {
      try {
        const result = entry.isHidden
          ? await unhideTaxonomyDefault(selectedCategory, entry.value)
          : await hideTaxonomyDefault(selectedCategory, entry.value)

        if (!result.success) {
          setEntries(previous)
          toast.error(result.error || 'Failed to update visibility')
          return
        }
        // Refresh from server
        const fresh = await getTaxonomy(selectedCategory)
        setEntries(fresh)
      } catch {
        setEntries(previous)
        toast.error('Failed to update visibility')
      }
    })
  }

  function handleRemoveCustom(entry: TaxonomyEntry) {
    if (!entry.id) return
    const previous = [...entries]
    setEntries((prev) => prev.filter((e) => e.id !== entry.id))

    startTransition(async () => {
      try {
        const result = await removeTaxonomyEntry(entry.id!)
        if (!result.success) {
          setEntries(previous)
          toast.error(result.error || 'Failed to remove entry')
          return
        }
        const fresh = await getTaxonomy(selectedCategory)
        setEntries(fresh)
        toast.success(`Removed "${entry.displayLabel}"`)
      } catch {
        setEntries(previous)
        toast.error('Failed to remove entry')
      }
    })
  }

  function handleAdd() {
    const label = newLabel.trim()
    if (!label) return

    // Check for duplicates (case-insensitive)
    const slug = label
      .toLowerCase()
      .replace(/[\s/]+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
    const exists = entries.some(
      (e) => e.value === slug || e.displayLabel.toLowerCase() === label.toLowerCase()
    )
    if (exists) {
      toast.error('That entry already exists')
      return
    }

    setNewLabel('')

    startTransition(async () => {
      try {
        const result = await addTaxonomyEntry(selectedCategory, label, label)
        if (!result.success) {
          toast.error(result.error || 'Failed to add entry')
          return
        }
        const fresh = await getTaxonomy(selectedCategory)
        setEntries(fresh)
        toast.success(`Added "${label}"`)
      } catch {
        toast.error('Failed to add entry')
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left sidebar: category tabs */}
      <div className="w-full lg:w-64 shrink-0">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-semibold text-stone-300">Categories</h2>
          </CardHeader>
          <CardContent className="p-2">
            <nav className="flex flex-col gap-0.5">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    selectedCategory === cat.value
                      ? 'bg-stone-700/60 text-stone-100 font-medium'
                      : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Right panel: entries for selected category */}
      <div className="flex-1 min-w-0">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-stone-100">
                  {selectedInfo?.label ?? selectedCategory}
                </h2>
                <p className="text-sm text-stone-400 mt-0.5">{selectedInfo?.description}</p>
              </div>
              <Badge variant="default">{activeCount} active</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-stone-500">Loading...</div>
            ) : (
              <>
                {/* Entry list */}
                <div className="space-y-1 mb-6">
                  {entries.length === 0 && (
                    <p className="text-sm text-stone-500 py-4 text-center">
                      No entries yet. Add one below.
                    </p>
                  )}
                  {entries.map((entry, idx) => (
                    <div
                      key={`${entry.value}-${entry.isSystem ? 'sys' : (entry.id ?? idx)}`}
                      className={`flex items-center justify-between rounded-md px-3 py-2 group ${
                        entry.isHidden ? 'bg-stone-800/30' : 'bg-stone-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`text-sm truncate ${
                            entry.isHidden ? 'text-stone-600 line-through' : 'text-stone-200'
                          }`}
                        >
                          {entry.displayLabel}
                        </span>
                        {!entry.isSystem && (
                          <Badge variant="info" className="text-[10px] px-1.5 py-0">
                            Custom
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {entry.isSystem ? (
                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(entry)}
                            disabled={isPending}
                            title={entry.isHidden ? 'Show this default' : 'Hide this default'}
                            className={`rounded p-1.5 text-xs transition-colors ${
                              entry.isHidden
                                ? 'text-stone-600 hover:text-stone-300 hover:bg-stone-700'
                                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700'
                            }`}
                          >
                            {entry.isHidden ? (
                              <EyeOffIcon className="h-4 w-4" />
                            ) : (
                              <EyeIcon className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRemoveCustom(entry)}
                            disabled={isPending}
                            title="Remove custom entry"
                            className="rounded p-1.5 text-stone-500 hover:text-red-400 hover:bg-stone-700 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <XIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add form */}
                <div className="flex items-end gap-2 pt-4 border-t border-stone-700/50">
                  <div className="flex-1">
                    <Input
                      label="New entry"
                      placeholder={`Add a ${selectedInfo?.label?.toLowerCase().replace(/s$/, '') ?? 'entry'}...`}
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAdd()
                        }
                      }}
                      disabled={isPending}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAdd}
                    disabled={isPending || !newLabel.trim()}
                  >
                    Add
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Inline SVG icons to avoid extra imports
function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="M6 6l12 12" />
    </svg>
  )
}
