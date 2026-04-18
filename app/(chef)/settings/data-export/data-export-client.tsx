'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Package, Check } from '@/components/ui/icons'
import { toast } from 'sonner'
import { TAKEOUT_CATEGORIES, type TakeoutCategoryId } from '@/lib/exports/takeout-categories'
import { buildTakeoutZip } from '@/lib/exports/data-takeout-actions'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

export function DataExportClient({ initialCounts }: { initialCounts: Record<string, number> }) {
  const [selected, setSelected] = useState<Set<TakeoutCategoryId>>(new Set())
  const [isExporting, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const hasData = Object.values(initialCounts).some((c) => c > 0)
  const hasSelection = selected.size > 0

  function toggleCategory(id: TakeoutCategoryId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setDone(false)
  }

  function toggleAll() {
    if (selected.size === TAKEOUT_CATEGORIES.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(TAKEOUT_CATEGORIES.map((c) => c.id)))
    }
    setDone(false)
  }

  function handleExport() {
    setDone(false)
    startTransition(async () => {
      try {
        const result = await buildTakeoutZip(Array.from(selected))
        // Convert Uint8Array to Blob and trigger download
        const blob = new Blob([new Uint8Array(result.bytes)], { type: 'application/zip' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = result.filename
        a.click()
        URL.revokeObjectURL(url)
        setDone(true)
        toast.success(
          `Export downloaded (${Object.values(result.manifest.counts).reduce((a, b) => a + b, 0)} records)`
        )
      } catch (err: any) {
        toast.error(err.message || 'Export failed. Try fewer categories.')
      }
    })
  }

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Package className="h-12 w-12 text-stone-600 mx-auto mb-4" />
          <p className="text-stone-400">
            No data to export yet. Start by adding your first recipe or client.
          </p>
        </CardContent>
      </Card>
    )
  }

  const allSelected = selected.size === TAKEOUT_CATEGORIES.length

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Select Data to Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* Select All */}
          <label className="flex items-center gap-3 py-2 px-3 rounded-md hover:bg-stone-800/50 cursor-pointer border-b border-stone-800 mb-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500/50"
            />
            <span className="text-sm font-medium text-stone-200">Select All</span>
          </label>

          {/* Category rows */}
          {TAKEOUT_CATEGORIES.map((cat) => {
            const count = initialCounts[cat.id] ?? 0
            return (
              <label
                key={cat.id}
                className="flex items-center gap-3 py-2.5 px-3 rounded-md hover:bg-stone-800/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.has(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
                  className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500/50"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-stone-200">{cat.label}</span>
                    <span className="text-xs text-stone-500 ml-2 tabular-nums">
                      {count > 0 ? pluralize(count, 'item') : '0 items'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{cat.description}</p>
                </div>
              </label>
            )
          })}
        </CardContent>
      </Card>

      {/* Download */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-stone-400">
              {hasSelection
                ? `${selected.size} ${selected.size === 1 ? 'category' : 'categories'} selected`
                : 'Select at least one category'}
            </div>
            <Button
              onClick={handleExport}
              disabled={!hasSelection || isExporting}
              loading={isExporting}
            >
              {done ? (
                <>
                  <Check className="h-4 w-4 mr-1.5" />
                  Downloaded
                </>
              ) : isExporting ? (
                'Preparing export...'
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1.5" />
                  Download My Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-stone-600 text-center">
        Your data is packaged as a ZIP file with organized folders. Nothing is deleted or modified.
      </p>
    </div>
  )
}
