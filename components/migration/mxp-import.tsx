'use client'

import { useState, useCallback, useTransition } from 'react'
import {
  parseMXPFile,
  importRecipes,
  type MXPRecipe,
  type ImportResult,
} from '@/lib/migration/csv-import-actions'

export default function MXPImport() {
  const [recipes, setRecipes] = useState<MXPRecipe[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.mxp') && !file.name.endsWith('.txt')) {
      setError('Please upload an MXP or TXT file.')
      return
    }

    setFileName(file.name)
    setError('')
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      startTransition(async () => {
        try {
          const parsed = await parseMXPFile(content)
          setRecipes(parsed)
          // Select all by default
          setSelected(new Set(parsed.map((_, i) => i)))
          if (parsed.length === 0) {
            setError(
              'No recipes found in this file. Make sure it is a valid MasterCook MXP export.'
            )
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to parse MXP file.')
        }
      })
    }
    reader.onerror = () => {
      setError('Failed to read file.')
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  function toggleRecipe(index: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  function toggleAll() {
    if (selected.size === recipes.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(recipes.map((_, i) => i)))
    }
  }

  function runImport() {
    const selectedRecipes = recipes.filter((_, i) => selected.has(i))
    if (selectedRecipes.length === 0) {
      setError('Please select at least one recipe to import.')
      return
    }

    setError('')
    startTransition(async () => {
      try {
        // Convert MXP recipes to mapped rows for the importRecipes action
        const mappedRows = selectedRecipes.map((recipe) => ({
          name: recipe.name,
          category: recipe.category,
          method: recipe.instructions || 'Imported from MasterCook',
          notes: [
            recipe.servings ? `Servings: ${recipe.servings}` : '',
            recipe.ingredients.length > 0 ? `Ingredients:\n${recipe.ingredients.join('\n')}` : '',
            recipe.notes || '',
          ]
            .filter(Boolean)
            .join('\n\n'),
        }))

        const importResult = await importRecipes(mappedRows)
        setResult(importResult)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed.')
      }
    })
  }

  function reset() {
    setRecipes([])
    setSelected(new Set())
    setFileName('')
    setResult(null)
    setError('')
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Upload area */}
      {recipes.length === 0 && !result && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-300'
          }`}
        >
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Drag and drop a MasterCook .mxp file here, or click to browse
            </p>
            <input type="file" accept=".mxp,.txt" onChange={handleFileInput} className="text-sm" />
          </div>
        </div>
      )}

      {/* Recipe list */}
      {recipes.length > 0 && !result && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Found <strong>{recipes.length}</strong> recipes in{' '}
              <span className="font-mono text-xs">{fileName}</span>
            </p>
            <button onClick={toggleAll} className="text-xs text-brand-600 hover:underline">
              {selected.size === recipes.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recipes.map((recipe, idx) => (
              <label
                key={idx}
                className={`flex items-start gap-3 rounded border p-3 cursor-pointer transition-colors ${
                  selected.has(idx) ? 'border-brand-300 bg-brand-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(idx)}
                  onChange={() => toggleRecipe(idx)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{recipe.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {recipe.category !== 'other' && (
                      <span className="inline-block bg-gray-100 rounded px-1.5 py-0.5 mr-2">
                        {recipe.category}
                      </span>
                    )}
                    {recipe.servings && <span>Serves {recipe.servings}</span>}
                    {recipe.ingredients.length > 0 && (
                      <span className="ml-2">{recipe.ingredients.length} ingredients</span>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-between">
            <button
              onClick={reset}
              className="rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={runImport}
              disabled={isPending || selected.size === 0}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending
                ? 'Importing...'
                : `Import ${selected.size} Recipe${selected.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <h3 className="font-medium text-green-800 mb-2">MXP Import Complete</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-700">{result.imported}</div>
                <div className="text-xs text-green-600">Imported</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">{result.skipped}</div>
                <div className="text-xs text-amber-500">Skipped</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{result.errors.length}</div>
                <div className="text-xs text-red-500">Errors</div>
              </div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <h4 className="text-sm font-medium text-red-800 mb-1">Errors</h4>
              <ul className="text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
                {result.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={reset}
              className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
