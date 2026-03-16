// Inquiry Import Component
// Full import flow for historical inquiries: CSV or freeform text → preview → save.
// CSV uses deterministic parsing, freeform uses Ollama (local AI only).
// Follows the PastEventsImport pattern with an internal CSV/Freeform toggle.

'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  parseInquiriesCsv,
  type ParsedInquiryRow,
  type CsvInquiriesParseResult,
} from '@/lib/ai/parse-csv-inquiries'
import { parseInquiriesFromBulk } from '@/lib/ai/parse-inquiries-bulk'
import {
  importInquiries,
  checkInquiryDuplicates,
  type ImportInquiriesResult,
} from '@/lib/inquiries/import-actions'
import { IMPORT_STATUS_OPTIONS, IMPORT_CHANNEL_OPTIONS } from '@/lib/inquiries/import-constants'
import { InquiryPreviewTable } from './inquiry-preview-table'

type Phase = 'input' | 'parsing' | 'preview' | 'saving' | 'done'
type InputMode = 'csv' | 'freeform'

type Props = {
  aiConfigured: boolean
}

export function InquiryImport({ aiConfigured }: Props) {
  const [phase, setPhase] = useState<Phase>('input')
  const [inputMode, setInputMode] = useState<InputMode>('csv')
  const [rawText, setRawText] = useState('')
  const [rows, setRows] = useState<ParsedInquiryRow[]>([])
  const [csvResult, setCsvResult] = useState<CsvInquiriesParseResult | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'low'>('low')
  const [skippedRows, setSkippedRows] = useState<Set<string>>(new Set())
  const [duplicateRows, setDuplicateRows] = useState<Set<string>>(new Set())
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportInquiriesResult | null>(null)

  // Batch defaults
  const [defaultStatus, setDefaultStatus] = useState('expired')
  const [defaultChannel, setDefaultChannel] = useState('website')

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---- FILE UPLOAD ----
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setRawText((ev.target?.result as string) || '')
    }
    reader.readAsText(file)
  }

  // ---- CSV PARSE ----
  const handleCsvParse = useCallback(async () => {
    setError(null)
    if (!rawText.trim()) return

    const parsed = parseInquiriesCsv(rawText)
    setCsvResult(parsed)
    setRows(parsed.rows)
    setWarnings(parsed.warnings)
    setConfidence(parsed.confidence)

    // Apply batch defaults to all rows
    const withDefaults = parsed.rows.map((r) => ({
      ...r,
      status: r.status || defaultStatus,
      channel: r.channel || defaultChannel,
    }))
    setRows(withDefaults)

    // Check for duplicates
    if (parsed.rows.length > 0) {
      try {
        const dupeMap = await checkInquiryDuplicates(
          parsed.rows.map((r) => ({
            client_name: r.client_name,
            first_contact_at: r.first_contact_at,
          }))
        )
        const dupes = new Set<string>()
        parsed.rows.forEach((r) => {
          const key = `${r.client_name}|${r.first_contact_at}`
          if (dupeMap.get(key)) dupes.add(r.id)
        })
        setDuplicateRows(dupes)
      } catch {
        // Non-fatal
      }
    }

    setPhase('preview')
  }, [rawText, defaultStatus, defaultChannel])

  // ---- FREEFORM AI PARSE ----
  const handleFreeformParse = useCallback(async () => {
    setError(null)
    if (!rawText.trim()) return
    setPhase('parsing')

    try {
      const parsed = await parseInquiriesFromBulk(rawText)
      const withDefaults = parsed.parsed.map((r) => ({
        ...r,
        id: r.id || Math.random().toString(36).slice(2),
        status: r.status || defaultStatus,
        channel: r.channel || defaultChannel,
      }))
      setRows(withDefaults)
      setWarnings(parsed.warnings)
      setConfidence(parsed.confidence)

      // Check for duplicates
      if (withDefaults.length > 0) {
        try {
          const dupeMap = await checkInquiryDuplicates(
            withDefaults.map((r) => ({
              client_name: r.client_name,
              first_contact_at: r.first_contact_at,
            }))
          )
          const dupes = new Set<string>()
          withDefaults.forEach((r) => {
            const key = `${r.client_name}|${r.first_contact_at}`
            if (dupeMap.get(key)) dupes.add(r.id)
          })
          setDuplicateRows(dupes)
        } catch {
          // Non-fatal
        }
      }

      setPhase('preview')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to parse text'
      if (msg.includes('Ollama') || msg.includes('OLLAMA')) {
        setError('Ollama is not running. Start Ollama to use AI parsing, or switch to CSV mode.')
      } else {
        setError(msg)
      }
      setPhase('input')
    }
  }, [rawText, defaultStatus, defaultChannel])

  // ---- BATCH DEFAULT CHANGE ----
  const applyBatchStatus = (status: string) => {
    setDefaultStatus(status)
    setRows((prev) => prev.map((r) => ({ ...r, status })))
  }

  const applyBatchChannel = (channel: string) => {
    setDefaultChannel(channel)
    setRows((prev) => prev.map((r) => ({ ...r, channel })))
  }

  // ---- ROW MANAGEMENT ----
  const toggleSkip = (id: string) => {
    setSkippedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const updateRow = (id: string, updates: Partial<ParsedInquiryRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)))
  }

  // ---- SAVE ----
  const handleSave = async () => {
    setPhase('saving')
    setError(null)

    const toImport = rows
      .filter((r) => !skippedRows.has(r.id))
      .map((r) => ({
        client_name: r.client_name,
        client_email: r.client_email,
        client_phone: r.client_phone,
        channel: r.channel || defaultChannel,
        status: r.status || defaultStatus,
        first_contact_at: r.first_contact_at,
        confirmed_date: r.first_contact_at,
        confirmed_guest_count: r.confirmed_guest_count,
        confirmed_location: r.confirmed_location,
        confirmed_occasion: r.confirmed_occasion,
        confirmed_budget_cents: r.confirmed_budget_cents,
        confirmed_dietary_restrictions: r.dietary_restrictions,
        source_message: r.source_message,
        notes: r.notes,
        decline_reason: r.decline_reason,
      }))

    try {
      const importResult = await importInquiries(toImport)
      setResult(importResult)
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import inquiries')
      setPhase('preview')
    }
  }

  // ---- RESET ----
  const reset = () => {
    setPhase('input')
    setRawText('')
    setRows([])
    setCsvResult(null)
    setWarnings([])
    setConfidence('low')
    setSkippedRows(new Set())
    setDuplicateRows(new Set())
    setConfirmed(false)
    setError(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const activeRows = rows.filter((r) => !skippedRows.has(r.id))
  const duplicateCount = rows.filter((r) => duplicateRows.has(r.id)).length

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" title="Error">
          {error}
        </Alert>
      )}

      {/* ---- INPUT PHASE ---- */}
      {(phase === 'input' || phase === 'parsing') && (
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setInputMode('csv')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                inputMode === 'csv'
                  ? 'bg-brand-600/20 border-brand-500 text-brand-400'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
            >
              CSV / Spreadsheet
            </button>
            <button
              onClick={() => setInputMode('freeform')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                inputMode === 'freeform'
                  ? 'bg-brand-600/20 border-brand-500 text-brand-400'
                  : 'bg-stone-800 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
            >
              Freeform Text (AI)
            </button>
          </div>

          {inputMode === 'csv' ? (
            <>
              <Alert variant="info" title="Supported CSV formats">
                <ul className="list-disc list-inside space-y-0.5 text-sm">
                  <li>Wix form submissions export</li>
                  <li>
                    Google Sheets or Excel export with columns like Name, Date, Occasion, Guests,
                    Budget
                  </li>
                  <li>Any spreadsheet - we auto-detect columns</li>
                </ul>
              </Alert>

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
                placeholder={`Paste CSV content here, or upload a file.\n\nExample:\nName,Date,Occasion,Guests,Budget,Status\nJohn Smith,2025-06-15,Birthday Dinner,8,$1200,Confirmed\nSarah Jones,2025-07-20,Anniversary,4,$800,Declined\nMike Wilson,2025-08-01,Dinner Party,12,$2000,Ghosted`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={10}
                className="font-mono text-sm"
              />

              <div className="flex gap-3">
                <Button onClick={handleCsvParse} disabled={!rawText.trim()}>
                  Detect Columns
                </Button>
                {rawText && (
                  <Button variant="secondary" onClick={reset}>
                    Clear
                  </Button>
                )}
              </div>
            </>
          ) : (
            <>
              <Alert variant="info" title="Paste anything">
                <p className="text-sm">
                  Paste text messages, email threads, form submissions, notes - anything with
                  inquiry details. AI will parse them into structured records.
                </p>
                {!aiConfigured && (
                  <p className="text-sm mt-2 font-semibold text-yellow-400">
                    Note: Ollama must be running for AI parsing.
                  </p>
                )}
              </Alert>

              <Textarea
                placeholder={`Paste your inquiry data here. Separate different inquiries with blank lines.\n\nExample:\nJohn Smith - texted me June 15 about a birthday dinner for 8 people\nBudget around $1200. Booked him and it went great.\n\nSarah Jones - emailed July 20 asking about an anniversary dinner\n4 guests, $800 budget. Never heard back from her.\n\nMike Wilson - Instagram DM Aug 1 - dinner party, 12 people\n$2000 budget. He went with another chef.`}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={12}
                className="text-sm"
              />

              <div className="flex gap-3">
                <Button
                  onClick={handleFreeformParse}
                  disabled={!rawText.trim() || phase === 'parsing'}
                >
                  {phase === 'parsing' ? 'Parsing...' : 'Parse with AI'}
                </Button>
                {rawText && (
                  <Button variant="secondary" onClick={reset}>
                    Clear
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ---- PARSING PHASE (spinner) ---- */}
      {phase === 'parsing' && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
          <p className="text-stone-400">Parsing inquiries with AI...</p>
        </div>
      )}

      {/* ---- PREVIEW PHASE ---- */}
      {phase === 'preview' && rows.length > 0 && (
        <div className="space-y-6">
          {/* CSV column detection card */}
          {csvResult && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-semibold text-stone-100">Column Detection</h3>
                <Badge
                  variant={
                    confidence === 'high'
                      ? 'success'
                      : confidence === 'medium'
                        ? 'warning'
                        : 'error'
                  }
                >
                  {confidence} confidence
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {csvResult.columnMappings.map((col, i) => (
                  <span
                    key={i}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      col.detected === 'skip'
                        ? 'bg-stone-800 text-stone-400'
                        : 'bg-brand-900/30 text-brand-400'
                    }`}
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
            </Card>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <Alert variant="warning" title="Heads up">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {warnings.map((w, i) => (
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
              Inquiries marked below may already exist. You can skip them or import anyway.
            </Alert>
          )}

          {/* Batch defaults bar */}
          <Card className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm text-stone-400">Apply to all:</span>

              <div className="flex items-center gap-2">
                <label className="text-xs text-stone-500">Status</label>
                <select
                  value={defaultStatus}
                  onChange={(e) => applyBatchStatus(e.target.value)}
                  className="px-2 py-1 text-xs rounded border border-stone-600 bg-stone-800 text-stone-200"
                >
                  {IMPORT_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-stone-500">Channel</label>
                <select
                  value={defaultChannel}
                  onChange={(e) => applyBatchChannel(e.target.value)}
                  className="px-2 py-1 text-xs rounded border border-stone-600 bg-stone-800 text-stone-200"
                >
                  {IMPORT_CHANNEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

          {/* Summary */}
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-stone-100">
              {rows.length} inquir{rows.length !== 1 ? 'ies' : 'y'} detected
            </h3>
            {rows.length !== activeRows.length && (
              <span className="text-xs text-stone-500">
                ({rows.length - activeRows.length} skipped)
              </span>
            )}
          </div>

          {/* Editable preview table */}
          <InquiryPreviewTable
            rows={rows}
            skippedRows={skippedRows}
            duplicateRows={duplicateRows}
            onToggleSkip={toggleSkip}
            onUpdateRow={updateRow}
          />

          {/* Confirmation checkbox */}
          {activeRows.length > 0 && (
            <label className="flex items-center gap-3 pt-4 border-t border-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-stone-300">
                Everything looks right - import these inquiries
              </span>
            </label>
          )}

          <div className="flex gap-3 pt-2">
            {activeRows.length > 0 && (
              <Button onClick={handleSave} disabled={!confirmed}>
                Import {activeRows.length} Inquir{activeRows.length !== 1 ? 'ies' : 'y'}
              </Button>
            )}
            <Button variant="secondary" onClick={reset}>
              Start Over
            </Button>
          </div>
        </div>
      )}

      {/* Empty preview fallback */}
      {phase === 'preview' && rows.length === 0 && (
        <div className="space-y-4">
          <Alert variant="warning" title="No inquiries found">
            No valid inquiry records could be extracted. Make sure your data includes at least a
            client name per inquiry.
          </Alert>
          <Button variant="secondary" onClick={reset}>
            Start Over
          </Button>
        </div>
      )}

      {/* ---- SAVING PHASE ---- */}
      {phase === 'saving' && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
          <p className="text-stone-400">
            Importing {activeRows.length} inquir{activeRows.length !== 1 ? 'ies' : 'y'}...
          </p>
        </div>
      )}

      {/* ---- DONE PHASE ---- */}
      {phase === 'done' && result && (
        <div className="space-y-4">
          <Alert variant="success" title="Import complete">
            <p>
              Successfully imported {result.imported} inquir{result.imported !== 1 ? 'ies' : 'y'}.
              {result.failed > 0 && ` ${result.failed} failed.`}
            </p>
          </Alert>

          {result.errors.length > 0 && (
            <Alert variant="warning" title="Some imports failed">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {result.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
                {result.errors.length > 10 && <li>...and {result.errors.length - 10} more</li>}
              </ul>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button onClick={reset}>Import More</Button>
            <Button variant="secondary" onClick={() => (window.location.href = '/inquiries')}>
              View Inquiries
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
