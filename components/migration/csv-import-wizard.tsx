'use client'

import { useState, useCallback, useTransition } from 'react'
import ColumnMapper from './column-mapper'
import {
  parseCSVPreview,
  importClients,
  importRecipes,
  importEvents,
  type ColumnMapping,
  type CSVPreview,
  type ImportResult,
} from '@/lib/migration/csv-import-actions'
import { parseCSV } from '@/lib/migration/csv-parser'

type TargetType = 'clients' | 'recipes' | 'events'
type Step = 1 | 2 | 3 | 4

const TARGET_LABELS: Record<TargetType, string> = {
  clients: 'Clients',
  recipes: 'Recipes',
  events: 'Events',
}

export default function CSVImportWizard() {
  const [step, setStep] = useState<Step>(1)
  const [targetType, setTargetType] = useState<TargetType>('clients')
  const [csvText, setCsvText] = useState('')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<CSVPreview | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const [dragOver, setDragOver] = useState(false)

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.tsv') && !file.name.endsWith('.txt')) {
      setError('Please upload a CSV, TSV, or TXT file.')
      return
    }

    setFileName(file.name)
    setError('')

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvText(text)
    }
    reader.onerror = () => {
      setError('Failed to read file. Please try again.')
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

  function goToStep2() {
    if (!csvText.trim()) {
      setError('Please upload a CSV file first.')
      return
    }

    setError('')
    startTransition(async () => {
      try {
        const p = await parseCSVPreview(csvText)
        setPreview(p)
        setMappings([])
        setStep(2)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to parse CSV.'
        )
      }
    })
  }

  function goToStep3() {
    // Validate that required fields are mapped
    const mappedFields = new Set(
      mappings
        .filter((m) => m.targetField !== '__skip__')
        .map((m) => m.targetField)
    )

    const requiredMap: Record<TargetType, string[]> = {
      clients: ['full_name', 'email'],
      recipes: ['name'],
      events: ['event_date', 'guest_count'],
    }

    const missing = requiredMap[targetType].filter((f) => !mappedFields.has(f))
    if (missing.length > 0) {
      setError(`Please map required fields: ${missing.join(', ')}`)
      return
    }

    setError('')
    setStep(3)
  }

  function runImport() {
    if (!csvText || mappings.length === 0) return

    setError('')
    startTransition(async () => {
      try {
        // Parse all rows and apply mappings
        const parsed = parseCSV(csvText)
        const mappedRows = parsed.rows.map((row) => {
          const mapped: Record<string, string> = {}
          mappings.forEach((m) => {
            if (m.targetField === '__skip__') return
            const colIdx = parsed.headers.indexOf(m.sourceColumn)
            if (colIdx >= 0 && row[colIdx]) {
              mapped[m.targetField] = row[colIdx]
            }
          })
          return mapped
        })

        let importResult: ImportResult

        switch (targetType) {
          case 'clients':
            importResult = await importClients(mappedRows)
            break
          case 'recipes':
            importResult = await importRecipes(mappedRows)
            break
          case 'events':
            importResult = await importEvents(mappedRows)
            break
        }

        setResult(importResult)
        setStep(4)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Import failed. Please try again.'
        )
      }
    })
  }

  function reset() {
    setStep(1)
    setCsvText('')
    setFileName('')
    setPreview(null)
    setMappings([])
    setResult(null)
    setError('')
  }

  // Build preview of mapped data for step 3
  function getMappedPreview(): Record<string, string>[] {
    if (!preview) return []
    const activeMappings = mappings.filter((m) => m.targetField !== '__skip__')
    return preview.sampleRows.slice(0, 5).map((row) => {
      const mapped: Record<string, string> = {}
      activeMappings.forEach((m) => {
        const colIdx = preview.headers.indexOf(m.sourceColumn)
        if (colIdx >= 0) {
          mapped[m.targetField] = row[colIdx] || ''
        }
      })
      return mapped
    })
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                s === step
                  ? 'bg-blue-600 text-white'
                  : s < step
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {s < step ? '\u2713' : s}
            </div>
            {s < 4 && (
              <div
                className={`w-8 h-px ${s < step ? 'bg-green-300' : 'bg-gray-200'}`}
              />
            )}
          </div>
        ))}
        <span className="ml-2 text-gray-500">
          {step === 1 && 'Upload'}
          {step === 2 && 'Map Columns'}
          {step === 3 && 'Review'}
          {step === 4 && 'Results'}
        </span>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              What are you importing?
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as TargetType)}
              className="w-full rounded border px-3 py-2 text-sm"
            >
              {Object.entries(TARGET_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : fileName
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300'
            }`}
          >
            {fileName ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-700">
                  {fileName}
                </p>
                <p className="text-xs text-gray-500">
                  File loaded. Click "Next" to continue.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Drag and drop a CSV file here, or click to browse
                </p>
                <input
                  type="file"
                  accept=".csv,.tsv,.txt"
                  onChange={handleFileInput}
                  className="text-sm"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={goToStep2}
              disabled={!csvText || isPending}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending ? 'Parsing...' : 'Next'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 2 && preview && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Found <strong>{preview.totalRows}</strong> rows with{' '}
            <strong>{preview.headers.length}</strong> columns (delimiter:{' '}
            {preview.detectedDelimiter}).
          </div>

          <ColumnMapper
            headers={preview.headers}
            sampleRows={preview.sampleRows}
            targetType={targetType}
            mappings={mappings}
            onMappingsChange={setMappings}
          />

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={goToStep3}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && preview && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600">
            Importing <strong>{preview.totalRows}</strong>{' '}
            {TARGET_LABELS[targetType].toLowerCase()} with the following
            mapping:
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b bg-gray-50">
                  {mappings
                    .filter((m) => m.targetField !== '__skip__')
                    .map((m) => (
                      <th key={m.targetField} className="text-left p-2 font-medium">
                        {m.targetField}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {getMappedPreview().map((row, idx) => (
                  <tr key={idx} className="border-b">
                    {mappings
                      .filter((m) => m.targetField !== '__skip__')
                      .map((m) => (
                        <td
                          key={m.targetField}
                          className="p-2 text-xs max-w-[150px] truncate"
                        >
                          {row[m.targetField] || '(empty)'}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.totalRows > 5 && (
            <p className="text-xs text-gray-400">
              Showing 5 of {preview.totalRows} rows
            </p>
          )}

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={runImport}
              disabled={isPending}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isPending ? 'Importing...' : `Import ${preview.totalRows} ${TARGET_LABELS[targetType]}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Results */}
      {step === 4 && result && (
        <div className="space-y-4">
          <div className="rounded-md bg-green-50 border border-green-200 p-4">
            <h3 className="font-medium text-green-800 mb-2">Import Complete</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-700">
                  {result.imported}
                </div>
                <div className="text-xs text-green-600">Imported</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600">
                  {result.skipped}
                </div>
                <div className="text-xs text-amber-500">Skipped</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {result.errors.length}
                </div>
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
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Import More
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
