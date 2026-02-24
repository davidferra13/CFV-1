// CSV Client Import Component
// Handles the full CSV import flow: upload/paste → column preview → review → save
// Uses deterministic parsing — no AI required.

'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { parseClientsCsv, type CsvParseResult } from '@/lib/ai/parse-csv-clients'
import {
  importClient,
  importClients,
  checkClientDuplicates,
  type DuplicateCheckResult,
} from '@/lib/ai/import-actions'
import type { ParsedClient } from '@/lib/ai/parse-client'

type Phase = 'input' | 'preview' | 'saving' | 'done'

const COL_COLORS: Record<string, string> = {
  full_name: 'bg-blue-900 text-blue-800',
  first_name: 'bg-blue-950 text-blue-700',
  last_name: 'bg-blue-950 text-blue-700',
  email: 'bg-green-900 text-green-800',
  phone: 'bg-purple-900 text-purple-800',
  notes: 'bg-yellow-900 text-yellow-800',
  address: 'bg-orange-900 text-orange-800',
  city: 'bg-orange-950 text-orange-700',
  state: 'bg-orange-950 text-orange-700',
  zip: 'bg-orange-950 text-orange-700',
  skip: 'bg-stone-800 text-stone-400',
}

export function CsvImport() {
  const [phase, setPhase] = useState<Phase>('input')
  const [rawText, setRawText] = useState('')
  const [parseResult, setParseResult] = useState<CsvParseResult | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateCheckResult | null>(null)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)
  const [skippedClients, setSkippedClients] = useState<Set<number>>(new Set())

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setRawText((ev.target?.result as string) || '')
    }
    reader.readAsText(file)
  }

  const handleParse = async () => {
    setError(null)
    if (!rawText.trim()) return

    const result = parseClientsCsv(rawText)
    setParseResult(result)

    // Check for duplicates immediately
    if (result.clients.length > 0) {
      try {
        const dupes = await checkClientDuplicates(
          result.clients.map((c) => ({ full_name: c.full_name, email: c.email }))
        )
        setDuplicates(dupes)
      } catch {
        // Duplicate check failure is non-fatal
      }
    }

    setPhase('preview')
  }

  const isDuplicate = (client: ParsedClient): boolean => {
    if (!duplicates) return false
    const emailKey = client.email?.toLowerCase()
    if (emailKey && duplicates.byEmail[emailKey]) return true
    if (duplicates.byName[client.full_name.trim().toLowerCase()]) return true
    return false
  }

  const toggleSkip = (index: number) => {
    setSkippedClients((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }

  const handleSave = async () => {
    if (!parseResult) return
    setPhase('saving')
    setError(null)

    const toImport = parseResult.clients.filter((_, i) => !skippedClients.has(i))

    try {
      if (toImport.length === 1) {
        await importClient(toImport[0])
        setImportedCount(1)
        setFailedCount(0)
      } else {
        const result = await importClients(toImport)
        setImportedCount(result.imported)
        setFailedCount(result.failed)
      }
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save clients')
      setPhase('preview')
    }
  }

  const reset = () => {
    setPhase('input')
    setRawText('')
    setParseResult(null)
    setDuplicates(null)
    setConfirmed(false)
    setError(null)
    setImportedCount(0)
    setFailedCount(0)
    setSkippedClients(new Set())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const activeClients = parseResult
    ? parseResult.clients.filter((_, i) => !skippedClients.has(i))
    : []
  const duplicateCount = parseResult ? parseResult.clients.filter((c) => isDuplicate(c)).length : 0

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {/* ---- INPUT PHASE ---- */}
      {phase === 'input' && (
        <div className="space-y-4">
          <Alert variant="info" title="Supported formats">
            <ul className="list-disc list-inside space-y-0.5 text-sm">
              <li>Google Contacts CSV (exported from contacts.google.com)</li>
              <li>iPhone / Android contacts export</li>
              <li>Any spreadsheet with Name, Email, Phone columns</li>
            </ul>
          </Alert>

          {/* File upload */}
          <div className="flex items-center gap-4">
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Upload CSV File
            </Button>
            <span className="text-sm text-stone-500">or paste CSV text below</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload CSV file"
            />
          </div>

          <Textarea
            placeholder={`Paste CSV content here, or upload a file above.\n\nExample:\nName,Email,Phone,Notes\nJohn Smith,john@example.com,555-1234,Regular client — nut allergy\nSarah Jones,sarah@example.com,555-5678,Prefers weekends`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />

          <div className="flex gap-3">
            <Button onClick={handleParse} disabled={!rawText.trim()}>
              Detect Columns
            </Button>
            {rawText && (
              <Button variant="secondary" onClick={reset}>
                Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ---- PREVIEW PHASE ---- */}
      {phase === 'preview' && parseResult && (
        <div className="space-y-6">
          {/* Column mapping */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-stone-100">Column Detection</h3>
              <Badge
                variant={
                  parseResult.confidence === 'high'
                    ? 'success'
                    : parseResult.confidence === 'medium'
                      ? 'warning'
                      : 'error'
                }
              >
                {parseResult.confidence} confidence
              </Badge>
              {parseResult.format !== 'unknown' && (
                <Badge variant="info">
                  {parseResult.format === 'google_contacts' ? 'Google Contacts' : 'Generic CSV'}
                </Badge>
              )}
            </div>

            {/* Column chips */}
            <div className="flex flex-wrap gap-2">
              {parseResult.columnMappings.map((col, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${COL_COLORS[col.detected] || COL_COLORS.skip}`}
                >
                  <span className="opacity-60">{col.header}</span>
                  {col.detected !== 'skip' && (
                    <>
                      <span className="opacity-40">→</span>
                      <span>{col.detected.replace(/_/g, ' ')}</span>
                    </>
                  )}
                  {col.detected === 'skip' && <span className="opacity-50">ignored</span>}
                </span>
              ))}
            </div>

            {/* Preview rows */}
            {parseResult.previewRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-stone-700">
                      {parseResult.columnMappings
                        .filter((m) => m.detected !== 'skip')
                        .map((m, i) => (
                          <th
                            key={i}
                            className="text-left py-1.5 pr-4 font-medium text-stone-500 whitespace-nowrap"
                          >
                            {m.header}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.previewRows.map((row, ri) => (
                      <tr key={ri} className="border-b border-stone-800">
                        {parseResult.columnMappings
                          .filter((m) => m.detected !== 'skip')
                          .map((m, ci) => (
                            <td
                              key={ci}
                              className="py-1.5 pr-4 text-stone-300 max-w-[200px] truncate"
                            >
                              {row[m.index] || '—'}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parseResult.totalRows > 5 && (
                  <p className="text-xs text-stone-400 mt-1">
                    Showing 5 of {parseResult.totalRows} rows
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Warnings */}
          {parseResult.warnings.length > 0 && (
            <Alert variant="warning" title="Heads up">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {parseResult.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Duplicate warning */}
          {duplicateCount > 0 && (
            <Alert
              variant="warning"
              title={`${duplicateCount} possible duplicate${duplicateCount !== 1 ? 's' : ''} detected`}
            >
              Clients marked below may already exist in your account. You can skip them or import
              anyway — duplicates can be merged later.
            </Alert>
          )}

          {/* Summary + client list */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-stone-100">
                {parseResult.clients.length} client{parseResult.clients.length !== 1 ? 's' : ''} to
                import
              </h3>
              {parseResult.skippedRows > 0 && (
                <span className="text-xs text-stone-500">
                  ({parseResult.skippedRows} rows skipped — no name found)
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {parseResult.clients.map((client, i) => {
                const dupe = isDuplicate(client)
                const skipped = skippedClients.has(i)
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-sm transition-opacity ${
                      skipped
                        ? 'border-stone-700 bg-stone-800 opacity-40'
                        : dupe
                          ? 'border-yellow-200 bg-yellow-950'
                          : 'border-stone-700 bg-surface'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-stone-100">{client.full_name}</span>
                      {client.email && (
                        <span className="ml-2 text-stone-500 text-xs">{client.email}</span>
                      )}
                      {client.phone && (
                        <span className="ml-2 text-stone-500 text-xs">{client.phone}</span>
                      )}
                      {dupe && (
                        <Badge variant="warning" className="ml-2 text-xs">
                          possible duplicate
                        </Badge>
                      )}
                    </div>
                    <button
                      onClick={() => toggleSkip(i)}
                      className="text-xs text-stone-500 hover:text-stone-300 shrink-0"
                    >
                      {skipped ? 'Restore' : 'Skip'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Confirmation checkbox */}
          {activeClients.length > 0 && (
            <label className="flex items-center gap-3 pt-4 border-t cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-stone-300">
                The column mapping looks right — import these clients
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-2">
            {activeClients.length > 0 && (
              <Button onClick={handleSave} disabled={!confirmed}>
                Import {activeClients.length} Client{activeClients.length !== 1 ? 's' : ''}
              </Button>
            )}
            <Button variant="secondary" onClick={reset}>
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* ---- SAVING PHASE ---- */}
      {phase === 'saving' && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
          <p className="text-stone-400">Importing clients...</p>
        </div>
      )}

      {/* ---- DONE PHASE ---- */}
      {phase === 'done' && (
        <div className="space-y-4">
          <Alert variant="success" title="Import complete">
            <p>
              Successfully imported {importedCount} client
              {importedCount !== 1 ? 's' : ''}.
              {failedCount > 0 && ` ${failedCount} failed — check for duplicate emails.`}
            </p>
          </Alert>
          <div className="flex gap-3">
            <Button onClick={reset}>Import More</Button>
            <Button variant="secondary" onClick={() => (window.location.href = '/clients')}>
              View Clients
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
