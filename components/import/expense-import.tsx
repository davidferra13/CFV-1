// Expense Import Component
// Lets a chef import historical expenses in bulk via manual entry or CSV.
// Expenses are inserted directly into the expenses table.
// Supports two input modes:
//   - Manual: fill a row-per-expense form
//   - CSV: paste a spreadsheet, auto-detect columns, populate rows

'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  importExpenses,
  type ExpenseImportInput,
  type ExpenseImportResult,
} from '@/lib/finance/expense-import-actions'
import { parseExpensesCsv } from '@/lib/ai/parse-csv-expenses'
import { EXPENSE_CATEGORY_OPTIONS } from '@/lib/constants/expense-categories'

type Phase = 'form' | 'review' | 'saving' | 'done'
type InputMode = 'manual' | 'csv'

type ExpenseRow = {
  id: string
  date: string
  description: string
  amount_dollars: string
  category: string
  vendor: string
  tax_deductible: boolean
  notes: string
}

function emptyRow(): ExpenseRow {
  return {
    id: Math.random().toString(36).slice(2),
    date: '',
    description: '',
    amount_dollars: '',
    category: 'other',
    vendor: '',
    tax_deductible: true,
    notes: '',
  }
}

function rowToInput(row: ExpenseRow): ExpenseImportInput {
  const amountCents =
    row.amount_dollars && !isNaN(parseFloat(row.amount_dollars))
      ? Math.round(parseFloat(row.amount_dollars) * 100)
      : 0

  return {
    date: row.date,
    description: row.description.trim(),
    amount_cents: amountCents,
    category: row.category || 'other',
    vendor: row.vendor.trim() || null,
    notes: row.notes.trim() || null,
    tax_deductible: row.tax_deductible,
  }
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ExpenseImport() {
  const [phase, setPhase] = useState<Phase>('form')
  const [inputMode, setInputMode] = useState<InputMode>('manual')
  const [rows, setRows] = useState<ExpenseRow[]>([emptyRow()])
  const [results, setResults] = useState<ExpenseImportResult[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // CSV paste state
  const [csvText, setCsvText] = useState('')
  const [csvWarnings, setCsvWarnings] = useState<string[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const updateRow = (id: string, field: keyof ExpenseRow, value: string | boolean) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  const addRow = () => setRows((prev) => [...prev, emptyRow()])
  const removeRow = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev))

  const validRows = rows.filter((r) => r.date && (r.description.trim() || r.amount_dollars))

  // ---- CSV PARSE ----
  const handleCsvParse = useCallback(() => {
    setCsvError(null)
    setCsvWarnings([])
    const result = parseExpensesCsv(csvText)
    setCsvWarnings(result.warnings)
    if (result.rows.length === 0) {
      setCsvError('No valid expenses could be detected. Check the column headers.')
      return
    }
    // Populate rows from CSV
    const csvRows: ExpenseRow[] = result.rows.map((r) => ({
      id: Math.random().toString(36).slice(2),
      date: r.date,
      description: r.description,
      amount_dollars: r.amount_dollars,
      category: r.category || 'other',
      vendor: r.vendor,
      tax_deductible: r.tax_deductible,
      notes: r.notes,
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
      setError('At least one expense needs a date and either a description or amount.')
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
      const response = await importExpenses(inputs)
      setResults(response.results)
      setPhase('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save expenses')
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
              columns: Date, Description, Amount, Category, Vendor, Notes, Tax Deductible. Any
              column order works.
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
              placeholder={`Date,Description,Amount,Category,Vendor\n2024-03-15,Ingredients for Johnson dinner,245.50,groceries,Whole Foods\n2024-03-16,Gas to event,45.00,gas,Shell\n2024-03-18,New knife set,189.99,equipment,Amazon`}
              rows={10}
              className="w-full text-sm font-mono border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            />

            <div className="flex items-center gap-3">
              <Button onClick={handleCsvParse} disabled={!csvText.trim()}>
                Detect Expenses
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
            <Alert variant="info" title="Import your expenses">
              Fill in your historical expenses. Date is required, plus a description or amount. All
              imported expenses are tagged as historical imports.
            </Alert>

            {error && (
              <Alert variant="error" title="Error">
                {error}
              </Alert>
            )}

            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[140px_1fr_100px_160px_140px_80px] gap-2 px-1">
              {['Date *', 'Description', 'Amount ($)', 'Category', 'Vendor', 'Deductible'].map(
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

            {/* Expense rows */}
            <div className="space-y-3">
              {rows.map((row, index) => (
                <Card key={row.id} className="p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="text-xs text-stone-400 pt-2 w-5 text-right shrink-0">
                      {index + 1}
                    </span>
                    <div className="flex-1 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[140px_1fr_100px_160px_140px_80px] sm:gap-2">
                      {/* Date */}
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(row.id, 'date', e.target.value)}
                        aria-label={`Expense date for row ${index + 1}`}
                        className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />

                      {/* Description */}
                      <input
                        type="text"
                        value={row.description}
                        onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                        placeholder="e.g. Groceries for Smith dinner"
                        aria-label={`Description for row ${index + 1}`}
                        className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />

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

                      {/* Category */}
                      <select
                        value={row.category}
                        onChange={(e) => updateRow(row.id, 'category', e.target.value)}
                        aria-label={`Category for row ${index + 1}`}
                        className="w-full text-sm border border-stone-600 rounded-lg px-2 py-2 bg-stone-900 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {EXPENSE_CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Vendor */}
                      <input
                        type="text"
                        value={row.vendor}
                        onChange={(e) => updateRow(row.id, 'vendor', e.target.value)}
                        placeholder="Store/vendor"
                        aria-label={`Vendor for row ${index + 1}`}
                        className="w-full text-sm border border-stone-600 rounded-lg px-3 py-2 text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />

                      {/* Tax Deductible */}
                      <div className="flex items-center justify-center pt-2">
                        <input
                          type="checkbox"
                          checked={row.tax_deductible}
                          onChange={(e) => updateRow(row.id, 'tax_deductible', e.target.checked)}
                          aria-label={`Tax deductible for row ${index + 1}`}
                          className="h-4 w-4 rounded border-stone-600 text-brand-600 focus:ring-brand-500"
                        />
                      </div>
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

                  {/* Notes - secondary row */}
                  <div className="mt-2 ml-7 sm:ml-8">
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateRow(row.id, 'notes', e.target.value)}
                      placeholder="Notes (optional)"
                      aria-label={`Notes for row ${index + 1}`}
                      className="w-full text-sm border border-stone-700 rounded-lg px-3 py-1.5 text-stone-300 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-brand-500 bg-stone-800"
                    />
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
                + Add another expense
              </button>
            </div>

            <div className="flex gap-3 pt-2 border-t border-stone-700">
              <Button onClick={handleReview} disabled={validRows.length === 0}>
                Review {validRows.length} Expense{validRows.length !== 1 ? 's' : ''}
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
    const categoryLabel = (cat: string) => {
      const found = EXPENSE_CATEGORY_OPTIONS.find((o) => o.value === cat)
      return found?.label || cat
    }

    return (
      <div className="space-y-5">
        <Alert variant="info" title="Review before saving">
          These expenses will be added to your records as historical imports. Double-check the
          amounts and categories before confirming.
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
                {['Date', 'Description', 'Amount', 'Category', 'Vendor', 'Deductible'].map((h) => (
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
                  <td className="py-2 pr-4 text-stone-100">{input.description || '-'}</td>
                  <td className="py-2 pr-4 text-stone-100">
                    {input.amount_cents > 0 ? `$${(input.amount_cents / 100).toFixed(2)}` : '-'}
                  </td>
                  <td className="py-2 pr-4 text-stone-400">{categoryLabel(input.category)}</td>
                  <td className="py-2 pr-4 text-stone-400">{input.vendor || '-'}</td>
                  <td className="py-2 pr-4 text-stone-400">
                    {input.tax_deductible ? 'Yes' : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
            {totalCents > 0 && (
              <tfoot>
                <tr className="border-t-2 border-stone-700">
                  <td className="py-2 text-sm font-medium text-stone-300">Total</td>
                  <td />
                  <td className="py-2 font-semibold text-stone-100">
                    ${(totalCents / 100).toFixed(2)}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>

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
            Save {inputs.length} Expense{inputs.length !== 1 ? 's' : ''}
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
        <p className="text-stone-400">Saving your expenses...</p>
      </div>
    )
  }

  // ---- DONE PHASE ----
  const succeeded = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  return (
    <div className="space-y-4">
      <Alert variant="success" title="Expenses imported">
        <p>
          {succeeded.length} expense{succeeded.length !== 1 ? 's' : ''} added to your records.
          {failed.length > 0 && ` ${failed.length} could not be saved - see below.`}
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
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button onClick={reset}>Add More Expenses</Button>
        <Button variant="secondary" onClick={() => (window.location.href = '/finance')}>
          View Expenses
        </Button>
      </div>
    </div>
  )
}
