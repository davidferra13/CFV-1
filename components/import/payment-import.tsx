// Payment Import Component
// Lets a chef bulk-import historical payments (ledger entries) from records.
// Supports two input modes:
//   - Manual: fill a row-per-payment form
//   - CSV: paste a spreadsheet, auto-detect columns, populate rows

'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  importPayments,
  type PaymentImportInput,
  type PaymentImportResult,
} from '@/lib/ledger/payment-import-actions'
import { parsePaymentsCsv } from '@/lib/ai/parse-csv-payments'

type Phase = 'form' | 'review' | 'saving' | 'done'
type InputMode = 'manual' | 'csv'

type PaymentRow = {
  id: string
  date: string
  client_id: string
  client_name: string
  amount_dollars: string
  payment_method: string
  entry_type: string
  description: string
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'card', label: 'Card' },
  { value: 'check', label: 'Check' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'other', label: 'Other' },
]

const ENTRY_TYPES = [
  { value: 'payment', label: 'Payment' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'tip', label: 'Gratuity' },
  { value: 'refund', label: 'Refund' },
]

function emptyRow(): PaymentRow {
  return {
    id: Math.random().toString(36).slice(2),
    date: '',
    client_id: '',
    client_name: '',
    amount_dollars: '',
    payment_method: 'cash',
    entry_type: 'payment',
    description: '',
  }
}

function rowToInput(row: PaymentRow): PaymentImportInput {
  const amountCents =
    row.amount_dollars && !isNaN(parseFloat(row.amount_dollars))
      ? Math.round(parseFloat(row.amount_dollars) * 100)
      : 0

  return {
    date: row.date,
    client_id: row.client_id || null,
    client_name: row.client_name.trim() || null,
    amount_cents: amountCents,
    payment_method: (row.payment_method as PaymentImportInput['payment_method']) || null,
    entry_type: (row.entry_type as PaymentImportInput['entry_type']) || 'payment',
    description: row.description.trim() || null,
  }
}

// ============================================
// MAIN COMPONENT
// existingClients is fetched server-side and passed as a prop.
// ============================================

export function PaymentImport({
  existingClients = [],
}: {
  existingClients?: { id: string; full_name: string }[]
}) {
  const [phase, setPhase] = useState<Phase>('form')
  const [inputMode, setInputMode] = useState<InputMode>('manual')
  const [rows, setRows] = useState<PaymentRow[]>([emptyRow()])
  const [results, setResults] = useState<PaymentImportResult[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // CSV paste state
  const [csvText, setCsvText] = useState('')
  const [csvWarnings, setCsvWarnings] = useState<string[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateRow = (id: string, field: keyof PaymentRow, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const addRow = () => setRows((prev) => [...prev, emptyRow()])
  const removeRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))

  const validRows = rows.filter(
    (r) => r.date && (r.client_id || r.client_name.trim()) && r.amount_dollars
  )

  // ---- CSV PARSE ----
  const handleCsvParse = useCallback(() => {
    setCsvError(null)
    setCsvWarnings([])
    const result = parsePaymentsCsv(csvText)
    setCsvWarnings(result.warnings)
    if (result.rows.length === 0) {
      setCsvError('No valid payments could be detected. Check the column headers.')
      return
    }
    // Populate rows from CSV
    const csvRows: PaymentRow[] = result.rows.map((r) => ({
      id: Math.random().toString(36).slice(2),
      date: r.date,
      client_id: '',
      client_name: r.client_name,
      amount_dollars: r.amount_dollars,
      payment_method: r.payment_method || 'cash',
      entry_type: r.entry_type || 'payment',
      description: r.description,
    }))
    setRows(csvRows)
    setCsvText('')
    setInputMode('manual')
  }, [csvText])

  const handleCsvFileChange = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvText(text || '')
    }
    reader.readAsText(file)
  }

  const handleReview = () => {
    if (validRows.length === 0) {
      setError('At least one payment needs a date, client, and amount.')
      return
    }
    setError(null)
    setPhase('review')
  }

  const handleSave = async () => {
    setPhase('saving')
    setError(null)
    try {
      const inputs = validRows.map(rowToInput)
      const response = await importPayments(inputs)
      setResults(response.results)
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save payments')
      setPhase('review')
    }
  }

  const reset = () => {
    setPhase('form')
    setRows([emptyRow()])
    setResults([])
    setConfirmed(false)
    setError(null)
    setCsvText('')
    setCsvWarnings([])
    setCsvError(null)
    setInputMode('manual')
  }

  // ---- FORM PHASE ----
  if (phase === 'form') {
    return (
      <div className="space-y-5">
        {/* Input mode tabs */}
        <div className="border-b border-stone-700">
          <nav className="-mb-px flex gap-6">
            {(['manual', 'csv'] as InputMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setInputMode(m)
                  setCsvError(null)
                  setCsvWarnings([])
                }}
                className={`pb-3 px-1 border-b-2 text-sm font-medium ${
                  inputMode === m
                    ? 'border-brand-500 text-brand-600'
                    : 'border-transparent text-stone-500 hover:text-stone-300 hover:border-stone-600'
                }`}
              >
                {m === 'manual' ? 'Manual Entry' : 'Paste CSV'}
              </button>
            ))}
          </nav>
        </div>

        {/* CSV INPUT MODE */}
        {inputMode === 'csv' && (
          <div className="space-y-4">
            <Alert variant="info" title="Paste a CSV or spreadsheet export">
              Copy columns from Google Sheets, Excel, or Numbers and paste below. Recognized
              columns: Date, Client, Amount, Method, Type, Description. Any column order works.
            </Alert>

            {csvError && (
              <Alert variant="error" title="Parse Error">
                {csvError}
              </Alert>
            )}

            {csvWarnings.length > 0 && (
              <Alert variant="warning" title="Heads up">
                <ul className="list-disc list-inside space-y-1">
                  {csvWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </Alert>
            )}

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={`Date,Client,Amount,Method,Type,Description\n2024-03-15,Sarah Johnson,1800,venmo,payment,Birthday dinner\n2024-01-20,Mark & Tina,300,cash,deposit,Anniversary deposit`}
              rows={10}
              className="w-full text-sm font-mono border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />

            <div className="flex items-center gap-3">
              <Button onClick={handleCsvParse} disabled={!csvText.trim()}>
                Detect Payments
              </Button>

              <span className="text-sm text-stone-400">or</span>

              <label className="cursor-pointer inline-flex items-center gap-2 text-sm text-brand-600 hover:text-brand-300 border border-dashed border-brand-600 hover:border-brand-500 rounded-lg px-4 py-2 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleCsvFileChange(file)
                    e.target.value = ''
                  }}
                />
                Upload a CSV file
              </label>
            </div>
          </div>
        )}

        {/* MANUAL INPUT MODE */}
        {inputMode === 'manual' && (
          <div className="space-y-4">
            <Alert variant="info" title="Import historical payments">
              Enter your past payments to build accurate financial records. Date, client, and amount
              are required. These entries go directly into your ledger.
            </Alert>

            {error && (
              <Alert variant="error" title="Error">
                {error}
              </Alert>
            )}

            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[140px_200px_120px_120px_120px_1fr_40px] gap-2 px-1">
              {['Date *', 'Client *', 'Amount ($) *', 'Method', 'Type', 'Description', ''].map(
                (h) => (
                  <span
                    key={h}
                    className="text-xs font-semibold text-stone-500 uppercase tracking-wide"
                  >
                    {h}
                  </span>
                )
              )}
            </div>

            {/* Payment rows */}
            <div className="space-y-3">
              {rows.map((row, index) => (
                <Card key={row.id} className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="text-xs text-stone-400 pt-2 w-5 text-right shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[140px_200px_120px_120px_120px_1fr] sm:gap-2">
                      {/* Date */}
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                        aria-label={`Payment date for row ${index + 1}`}
                        className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />

                      {/* Client - select or type */}
                      <div>
                        {existingClients.length > 0 ? (
                          <select
                            value={row.client_id || '__new__'}
                            onChange={(e) => {
                              const val = e.target.value
                              if (val === '__new__') {
                                updateRow(row.id, 'client_id', '')
                              } else {
                                const found = existingClients.find((c) => c.id === val)
                                updateRow(row.id, 'client_id', val)
                                updateRow(row.id, 'client_name', found?.full_name || '')
                              }
                            }}
                            aria-label={`Client for row ${index + 1}`}
                            className="w-full text-sm border border-stone-600 rounded-lg px-2 py-2 bg-stone-900 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="__new__">+ New client</option>
                            {existingClients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.full_name}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        {!row.client_id && (
                          <input
                            type="text"
                            value={row.client_name}
                            onChange={(e) => updateRow(row.id, 'client_name', e.target.value)}
                            placeholder="Client name"
                            aria-label={`Client name for row ${index + 1}`}
                            className={`w-full text-sm border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 ${existingClients.length > 0 ? 'mt-1' : ''}`}
                          />
                        )}
                      </div>

                      {/* Amount */}
                      <input
                        type="number"
                        value={row.amount_dollars}
                        onChange={(e) => updateRow(row.id, 'amount_dollars', e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        aria-label={`Amount for row ${index + 1}`}
                        className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />

                      {/* Payment method */}
                      <select
                        value={row.payment_method}
                        onChange={(e) => updateRow(row.id, 'payment_method', e.target.value)}
                        aria-label={`Payment method for row ${index + 1}`}
                        className="w-full text-sm border border-stone-600 rounded-lg px-2 py-2 bg-stone-900 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>

                      {/* Entry type */}
                      <select
                        value={row.entry_type}
                        onChange={(e) => updateRow(row.id, 'entry_type', e.target.value)}
                        aria-label={`Entry type for row ${index + 1}`}
                        className="w-full text-sm border border-stone-600 rounded-lg px-2 py-2 bg-stone-900 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {ENTRY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>

                      {/* Description */}
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                        placeholder="e.g. Birthday dinner"
                        aria-label={`Description for row ${index + 1}`}
                        className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>

                    {/* Remove row */}
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      disabled={rows.length === 1}
                      className="text-stone-300 hover:text-red-500 pt-2 shrink-0 disabled:opacity-0"
                      aria-label="Remove row"
                    >
                      ✕
                    </button>
                  </div>
                </Card>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={addRow}
                className="text-sm text-brand-600 hover:text-brand-300 border border-dashed border-brand-600 hover:border-brand-500 rounded-lg px-4 py-2 transition-colors"
              >
                + Add another payment
              </button>
            </div>

            <div className="flex gap-3 pt-2 border-t border-stone-700">
              <Button onClick={handleReview} disabled={validRows.length === 0}>
                Review {validRows.length} Payment{validRows.length !== 1 ? 's' : ''}
              </Button>
              <Button type="button" variant="secondary" onClick={reset}>
                Clear All
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---- REVIEW PHASE ----
  if (phase === 'review') {
    const inputs = validRows.map(rowToInput)
    const totalCents = inputs.reduce((sum, i) => sum + i.amount_cents, 0)
    const refundCents = inputs
      .filter((i) => i.entry_type === 'refund')
      .reduce((sum, i) => sum + i.amount_cents, 0)
    const netCents = totalCents - refundCents * 2 // refunds are already in the total, subtract twice to get net

    return (
      <div className="space-y-5">
        <Alert variant="info" title="Review before saving">
          These payments will be added to your ledger as historical records.
          {inputs.length > 0 &&
            ` ${inputs.length} ledger entr${inputs.length !== 1 ? 'ies' : 'y'} will be created.`}
        </Alert>

        {error && (
          <Alert variant="error" title="Error">
            {error}
          </Alert>
        )}

        {/* Summary table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-stone-500 text-left">
                {['Date', 'Client', 'Amount', 'Type', 'Method', 'Description'].map((h) => (
                  <th key={h} className="py-2 pr-4 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inputs.map((input, i) => (
                <tr key={i} className="border-b border-stone-800">
                  <td className="py-2 pr-4 text-stone-100 whitespace-nowrap">{input.date}</td>
                  <td className="py-2 pr-4 text-stone-100">{input.client_name || '-'}</td>
                  <td className="py-2 pr-4 text-stone-100">
                    ${(input.amount_cents / 100).toFixed(2)}
                  </td>
                  <td className="py-2 pr-4 text-stone-400 capitalize">{input.entry_type}</td>
                  <td className="py-2 pr-4 text-stone-400 capitalize">
                    {input.payment_method || '-'}
                  </td>
                  <td className="py-2 pr-4 text-stone-400">{input.description || '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-stone-700">
                <td colSpan={2} className="py-2 text-sm font-medium text-stone-300">
                  Total ({inputs.length} entr{inputs.length !== 1 ? 'ies' : 'y'})
                </td>
                <td className="py-2 font-semibold text-stone-100">
                  ${(totalCents / 100).toFixed(2)}
                </td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>

        <Alert variant="warning" title="Double-check your amounts">
          Payment amounts and types can&apos;t be changed after saving. Ledger entries are
          immutable. Make sure everything looks correct before confirming.
        </Alert>

        <label className="flex items-center gap-3 pt-4 border-t cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-stone-300">
            I confirm this data is correct and ready to save
          </span>
        </label>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={!confirmed}>
            Save {inputs.length} Payment{inputs.length !== 1 ? 's' : ''}
          </Button>
          <Button variant="secondary" onClick={() => setPhase('form')}>
            Back to Edit
          </Button>
        </div>
      </div>
    )
  }

  // ---- SAVING PHASE ----
  if (phase === 'saving') {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mb-4" />
        <p className="text-stone-400">Saving your payments...</p>
      </div>
    )
  }

  // ---- DONE PHASE ----
  const succeeded = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  return (
    <div className="space-y-4">
      <Alert variant="success" title="Payments imported">
        <p>
          {succeeded.length} payment{succeeded.length !== 1 ? 's' : ''} added to your ledger.
          {failed.length > 0 && ` ${failed.length} could not be saved. See below.`}
        </p>
      </Alert>

      {failed.length > 0 && (
        <div className="space-y-2">
          {failed.map((r, i) => (
            <Alert key={i} variant="error" title={`Failed: ${r.label}`}>
              {r.error}
            </Alert>
          ))}
        </div>
      )}

      {succeeded.length > 0 && (
        <div className="space-y-1">
          {succeeded.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-stone-300">
              <Badge variant="success">Saved</Badge>
              <span>{r.label}</span>
              {r.clientCreated && (
                <span className="text-xs text-stone-400">(new client created)</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button onClick={reset}>Import More Payments</Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/finance')}>
          View Financials
        </Button>
      </div>
    </div>
  )
}
