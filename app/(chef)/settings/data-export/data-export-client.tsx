'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, Loader2, Package, Check } from '@/components/ui/icons'
import { toast } from 'sonner'
import {
  TAKEOUT_CATEGORIES,
  TAKEOUT_SECTIONS,
  TAKEOUT_CATEGORY_MAP,
  type TakeoutCategoryId,
} from '@/lib/exports/takeout-categories'
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

/** Rough per-row byte estimate for size display */
function estimateCategoryBytes(catId: TakeoutCategoryId, count: number): number {
  const cat = TAKEOUT_CATEGORY_MAP.get(catId)
  if (!cat) return 0
  const bytesPerRow = cat.heavyCategory ? 100_000 : 500
  return count * bytesPerRow
}

export function DataExportClient({ initialCounts }: { initialCounts: Record<string, number> }) {
  const [selected, setSelected] = useState<Set<TakeoutCategoryId>>(new Set())
  const [includePDFs, setIncludePDFs] = useState(true)
  const [includePhotos, setIncludePhotos] = useState(false)
  const [isExporting, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const hasData = Object.values(initialCounts).some((c) => c > 0)
  const hasSelection = selected.size > 0

  // Calculate estimated total size
  const estimatedBytes = Array.from(selected).reduce((total, catId) => {
    const count = initialCounts[catId] ?? 0
    let estimate = estimateCategoryBytes(catId, count)
    if (catId === 'photos' && !includePhotos) estimate = 0
    return total + estimate
  }, 0)

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
        const result = await buildTakeoutZip(Array.from(selected), { includePDFs })
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

          {/* Grouped sections */}
          {TAKEOUT_SECTIONS.map((section) => (
            <div key={section.id} className="mt-3 first:mt-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 px-3 py-1.5">
                {section.label}
              </p>
              {section.categories.map((catId) => {
                const cat = TAKEOUT_CATEGORY_MAP.get(catId)
                if (!cat) return null
                const count = initialCounts[catId] ?? 0
                const estBytes = estimateCategoryBytes(catId, count)
                return (
                  <label
                    key={catId}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-md hover:bg-stone-800/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(catId)}
                      onChange={() => toggleCategory(catId)}
                      className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500/50"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-stone-200">{cat.label}</span>
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-xs text-stone-500 tabular-nums">
                            {count > 0 ? pluralize(count, 'item') : '0 items'}
                          </span>
                          {count > 0 && (
                            <span className="text-xs text-stone-600 tabular-nums">
                              ~{formatBytes(estBytes)}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">{cat.description}</p>
                    </div>
                  </label>
                )
              })}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Options */}
      <Card>
        <CardContent className="py-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Options</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includePDFs}
              onChange={(e) => setIncludePDFs(e.target.checked)}
              className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500/50"
            />
            <span className="text-sm text-stone-300">
              Include PDFs (recipe cards, menus, quotes)
            </span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includePhotos}
              onChange={(e) => setIncludePhotos(e.target.checked)}
              className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-amber-500 focus:ring-amber-500/50"
            />
            <span className="text-sm text-stone-300">Include original photos</span>
          </label>

          {estimatedBytes > 500 * 1024 * 1024 && (
            <div className="rounded-md border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
              Large export ({formatBytes(estimatedBytes)}). This may take a minute.
            </div>
          )}
          {estimatedBytes > 2 * 1024 * 1024 * 1024 && (
            <div className="rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
              Very large export. Consider excluding photos to avoid browser download limits.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Download */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-stone-400">
              {hasSelection ? (
                <>
                  {selected.size} {selected.size === 1 ? 'category' : 'categories'} selected
                  {estimatedBytes > 0 && (
                    <span className="ml-2 text-stone-500">(~{formatBytes(estimatedBytes)})</span>
                  )}
                </>
              ) : (
                'Select at least one category'
              )}
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
