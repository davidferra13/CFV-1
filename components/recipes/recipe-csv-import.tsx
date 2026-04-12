'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { parseCsvForPreview, importCsvRecipes } from '@/lib/recipes/csv-import-actions'
import type { CsvRecipeRow, CsvImportPreview } from '@/lib/recipes/csv-import-actions'
import { useRouter } from 'next/navigation'

type Props = {
  open: boolean
  onClose: () => void
}

type Stage = 'input' | 'preview' | 'importing' | 'done'

const EXAMPLE_CSV = `name,category,description,method,ingredients,prep_time,cook_time,yield
"Steak Diane","protein","Classic 70s tableside dish","1. Pound steaks thin. 2. Sear in butter 2 min per side. 3. Deglaze with cognac. 4. Add cream and mustard. Reduce.","2 NY strip steaks|2 tbsp butter|2 oz cognac|1 cup heavy cream|1 tbsp Dijon",10,15,"Serves 2"
"Roasted Carrots","vegetable","Simple honey-glazed side","1. Toss carrots with oil and honey. 2. Roast at 425F for 25 min.","1 lb carrots|2 tbsp olive oil|1 tbsp honey|salt|pepper",5,25,"Serves 4"`

export function RecipeCsvImport({ open, onClose }: Props) {
  const [stage, setStage] = useState<Stage>('input')
  const [csvText, setCsvText] = useState('')
  const [preview, setPreview] = useState<CsvImportPreview | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{
    importedCount: number
    skippedCount: number
    errors: string[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  if (!open) return null

  const handleClose = () => {
    if (stage === 'importing') return
    setStage('input')
    setCsvText('')
    setPreview(null)
    setParseError(null)
    setImportResult(null)
    onClose()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setCsvText((ev.target?.result as string) || '')
    }
    reader.readAsText(file)
  }

  const handlePreview = async () => {
    if (!csvText.trim()) {
      setParseError('Paste your CSV or upload a file first.')
      return
    }
    setIsLoading(true)
    setParseError(null)
    try {
      const result = await parseCsvForPreview(csvText)
      if (!result.success) {
        setParseError(result.error)
      } else {
        setPreview(result.preview)
        setStage('preview')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    if (!preview) return
    setStage('importing')
    setIsLoading(true)
    try {
      const result = await importCsvRecipes(preview.rows)
      if (result.success) {
        setImportResult({
          importedCount: result.importedCount,
          skippedCount: result.skippedCount,
          errors: result.errors,
        })
        setStage('done')
        router.refresh()
      } else {
        setParseError(result.error)
        setStage('preview')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

      {/* Panel */}
      <div className="relative bg-stone-900 border border-stone-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">CSV Recipe Import</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Import multiple recipes from a spreadsheet
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-stone-500 hover:text-stone-300 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {stage === 'input' && (
            <>
              {/* Column reference */}
              <div className="rounded-lg border border-stone-700 bg-stone-950/50 p-4 text-xs">
                <p className="font-semibold text-stone-300 mb-2">Supported columns</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-stone-400">
                  <span>
                    <span className="text-amber-400 font-medium">name</span> (required)
                  </span>
                  <span>
                    category (protein, vegetable, pasta, soup, salad, sauce, dessert, bread,
                    other...)
                  </span>
                  <span>description</span>
                  <span>method (or: instructions, steps, directions)</span>
                  <span>ingredients (pipe-separated: "2 cups flour|1 egg|...")</span>
                  <span>prep_time and cook_time (minutes)</span>
                  <span>yield (or: serves, servings)</span>
                  <span>Column order and names are flexible</span>
                </div>
              </div>

              {/* Upload or paste */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload .csv File
                  </Button>
                  <span className="text-xs text-stone-500">or paste CSV text below</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  aria-label="Upload CSV file"
                  title="Upload CSV file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Paste your CSV here..."
                  className="w-full h-44 rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-sm text-stone-200 placeholder-stone-600 resize-none focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                />
              </div>

              {/* Example */}
              <details className="text-xs">
                <summary className="text-stone-500 cursor-pointer hover:text-stone-300 select-none">
                  Show example CSV
                </summary>
                <pre className="mt-2 p-3 rounded bg-stone-950 text-stone-400 overflow-x-auto text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                  {EXAMPLE_CSV}
                </pre>
                <button
                  type="button"
                  className="mt-2 text-xs text-brand-500 hover:text-brand-400"
                  onClick={() => setCsvText(EXAMPLE_CSV)}
                >
                  Load example
                </button>
              </details>

              {parseError && (
                <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded p-3">
                  {parseError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button onClick={handlePreview} disabled={isLoading || !csvText.trim()}>
                  {isLoading ? 'Parsing...' : 'Preview Import'}
                </Button>
              </div>
            </>
          )}

          {stage === 'preview' && preview && (
            <>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-emerald-400 font-semibold">
                  {preview.rows.length} recipes ready to import
                </span>
                {preview.skippedCount > 0 && (
                  <span className="text-stone-500">
                    {preview.skippedCount} rows skipped (no name)
                  </span>
                )}
              </div>

              {preview.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-3 text-xs text-amber-400 space-y-1">
                  {preview.warnings.map((w, i) => (
                    <p key={i}>{w}</p>
                  ))}
                </div>
              )}

              <div className="rounded-lg border border-stone-700 divide-y divide-stone-800 overflow-hidden max-h-80 overflow-y-auto">
                {preview.rows.map((row, i) => (
                  <RecipePreviewRow key={i} row={row} />
                ))}
              </div>

              {parseError && (
                <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/50 rounded p-3">
                  {parseError}
                </p>
              )}

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="ghost" onClick={() => setStage('input')}>
                  Back
                </Button>
                <Button onClick={handleImport} disabled={isLoading}>
                  Import {preview.rows.length} Recipes
                </Button>
              </div>
            </>
          )}

          {stage === 'importing' && (
            <div className="py-12 text-center">
              <p className="text-stone-400 text-sm">
                Importing {preview?.rows.length} recipes... this may take a moment for large
                batches.
              </p>
            </div>
          )}

          {stage === 'done' && importResult && (
            <>
              <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-6 text-center">
                <p className="text-3xl font-bold text-emerald-400">{importResult.importedCount}</p>
                <p className="text-sm text-stone-400 mt-1">recipes imported successfully</p>
                {importResult.skippedCount > 0 && (
                  <p className="text-xs text-stone-500 mt-1">
                    {importResult.skippedCount} skipped due to errors
                  </p>
                )}
              </div>

              {importResult.errors.length > 0 && (
                <div className="rounded-lg border border-red-800/50 bg-red-950/20 p-3 text-xs text-red-400 space-y-1">
                  <p className="font-semibold mb-2">Rows with errors:</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i}>{e}</p>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStage('input')
                    setCsvText('')
                    setPreview(null)
                    setImportResult(null)
                  }}
                >
                  Import More
                </Button>
                <Button
                  onClick={() => {
                    handleClose()
                    router.push('/recipes')
                  }}
                >
                  View Recipes
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function RecipePreviewRow({ row }: { row: CsvRecipeRow }) {
  return (
    <div className="px-4 py-3 bg-stone-900/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-200 truncate">{row.name}</p>
          {row.description && (
            <p className="text-xs text-stone-500 truncate mt-0.5">{row.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-stone-500">
          <span className="bg-stone-800 px-2 py-0.5 rounded-full">{row.category}</span>
          {row.rawIngredients.length > 0 && <span>{row.rawIngredients.length} ingr.</span>}
          {(row.prepTimeMinutes || row.cookTimeMinutes) && (
            <span>{(row.prepTimeMinutes ?? 0) + (row.cookTimeMinutes ?? 0)}m</span>
          )}
        </div>
      </div>
    </div>
  )
}
