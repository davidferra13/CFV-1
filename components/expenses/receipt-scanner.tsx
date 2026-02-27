// Receipt Scanner Component — OCR.space Integration
// Drag & drop or click to upload a receipt image.
// Calls the server action for OCR, shows parsed data, and lets the chef
// confirm before creating an expense entry.

'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { scanAndParseReceipt } from '@/lib/expenses/receipt-actions'
import { createExpense, type CreateExpenseInput } from '@/lib/expenses/actions'
import { EXPENSE_CATEGORY_GROUPS } from '@/lib/constants/expense-categories'
import { formatCentsToDisplay, parseCurrencyToCents } from '@/lib/utils/currency'
import { format } from 'date-fns'
import type { ParsedReceipt, ParsedLineItem } from '@/lib/ocr/receipt-parser'

type EventOption = {
  id: string
  occasion: string | null
  event_date: string
  client: { full_name: string } | null
}

type Props = {
  events: EventOption[]
  defaultEventId?: string
}

const CATEGORY_GROUPS = EXPENSE_CATEGORY_GROUPS.map((g) => ({
  label: g.label,
  options: g.categories.map((c) => ({ value: c.value, label: c.label })),
}))

const PAYMENT_METHOD_OPTIONS = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
]

export function ReceiptScanner({ events, defaultEventId }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parsed result
  const [parsed, setParsed] = useState<ParsedReceipt | null>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [showRawText, setShowRawText] = useState(false)

  // Editable form fields (pre-filled from OCR, editable by chef)
  const [storeName, setStoreName] = useState('')
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('groceries')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [description, setDescription] = useState('')
  const [eventId, setEventId] = useState(defaultEventId || '')
  const [isBusiness, setIsBusiness] = useState(true)

  // Submit state
  const [saving, setSaving] = useState(false)

  const [isDragging, setIsDragging] = useState(false)

  const eventOptions = events.map((e) => ({
    value: e.id,
    label: `${e.occasion || 'Untitled'} - ${format(new Date(e.event_date), 'MMM d')}${e.client ? ` (${e.client.full_name})` : ''}`,
  }))

  // --- File handling ---

  const handleFile = useCallback((selectedFile: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Invalid file type. Please upload a JPEG, PNG, or WebP image.')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10 MB.')
      return
    }

    setFile(selectedFile)
    setError(null)
    setParsed(null)
    setRawText(null)

    // Generate preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(selectedFile)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFile(selected)
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const droppedFile = e.dataTransfer.files?.[0]
      if (droppedFile) handleFile(droppedFile)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  // --- OCR scan ---

  const handleScan = async () => {
    if (!file) return

    setScanning(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('receipt', file)

      const result = await scanAndParseReceipt(formData)

      if (!result.success || !result.data) {
        setError(result.error || 'Failed to scan receipt')
        return
      }

      setParsed(result.data)
      setRawText(result.rawText || null)

      // Pre-fill form fields from parsed data
      if (result.data.storeName) {
        setStoreName(result.data.storeName)
        setDescription(`Purchase at ${result.data.storeName}`)
      }
      if (result.data.date) {
        setExpenseDate(result.data.date)
      }
      if (result.data.totalCents) {
        setAmount(formatCentsToDisplay(result.data.totalCents))
      }
    } catch (err: any) {
      setError(err.message || 'Scan failed. Please try again.')
    } finally {
      setScanning(false)
    }
  }

  // --- Save expense ---

  const handleSave = async () => {
    if (!amount || !description) {
      setError('Amount and description are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const input: CreateExpenseInput = {
        event_id: eventId || null,
        amount_cents: parseCurrencyToCents(amount),
        category: category as any,
        payment_method: paymentMethod as any,
        description,
        expense_date: expenseDate,
        vendor_name: storeName || null,
        notes: parsed
          ? `Scanned via OCR.space receipt scanner${parsed.items.length > 0 ? ` (${parsed.items.length} line items detected)` : ''}`
          : null,
        is_business: isBusiness,
      }

      await createExpense(input)
      router.push('/expenses')
    } catch (err: any) {
      setError(err.message || 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  // --- Reset ---

  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setParsed(null)
    setRawText(null)
    setShowRawText(false)
    setError(null)
    setStoreName('')
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'))
    setAmount('')
    setDescription('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="space-y-6">
      {error && <Alert variant="error">{error}</Alert>}

      {/* Drop Zone / File Selector */}
      {!parsed && (
        <Card className="p-6">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-150
              ${isDragging ? 'border-brand-500 bg-brand-950/30' : 'border-stone-600 hover:border-stone-500 hover:bg-stone-800/50'}
              ${file ? 'border-brand-600 bg-brand-950/20' : ''}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {!file ? (
              <div>
                <svg
                  className="mx-auto h-12 w-12 text-stone-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
                <p className="mt-3 text-sm font-medium text-stone-300">
                  Drop a receipt image here, or click to select
                </p>
                <p className="mt-1 text-xs text-stone-500">JPEG, PNG, or WebP. Max 10 MB.</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-brand-400">{file.name}</p>
                <p className="text-xs text-stone-500 mt-1">
                  {(file.size / 1024).toFixed(0)} KB - Click to change
                </p>
              </div>
            )}
          </div>

          {/* Preview + Scan button */}
          {file && preview && (
            <div className="mt-4 space-y-4">
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="max-h-64 rounded border border-stone-700 object-contain"
                />
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleScan} loading={scanning}>
                  {scanning ? 'Scanning...' : 'Scan Receipt'}
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  Clear
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Parsed Results + Editable Form */}
      {parsed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Scanned Data Summary */}
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-stone-300">Scanned Data</h3>
              <Badge variant="info">OCR Result</Badge>
            </div>

            {/* Receipt preview thumbnail */}
            {preview && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Receipt"
                  className="max-h-48 rounded border border-stone-700 object-contain"
                />
              </div>
            )}

            {/* Extracted fields summary */}
            <div className="space-y-2 text-sm">
              {parsed.storeName && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Store</span>
                  <span className="font-medium text-stone-200">{parsed.storeName}</span>
                </div>
              )}
              {parsed.date && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Date</span>
                  <span className="font-medium text-stone-200">{parsed.date}</span>
                </div>
              )}
              {parsed.subtotalCents != null && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="font-medium text-stone-200">
                    ${formatCentsToDisplay(parsed.subtotalCents)}
                  </span>
                </div>
              )}
              {parsed.taxCents != null && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Tax</span>
                  <span className="font-medium text-stone-200">
                    ${formatCentsToDisplay(parsed.taxCents)}
                  </span>
                </div>
              )}
              {parsed.totalCents != null && (
                <div className="flex justify-between border-t border-stone-700 pt-2">
                  <span className="text-stone-400 font-medium">Total</span>
                  <span className="font-bold text-stone-100">
                    ${formatCentsToDisplay(parsed.totalCents)}
                  </span>
                </div>
              )}
            </div>

            {/* Line items */}
            {parsed.items.length > 0 && (
              <div>
                <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">
                  {parsed.items.length} line items detected
                </p>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {parsed.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between text-xs px-2 py-1 rounded bg-stone-800/50"
                    >
                      <span className="text-stone-300 truncate mr-2">{item.name}</span>
                      <span className="text-stone-400 whitespace-nowrap">
                        ${formatCentsToDisplay(item.priceCents)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {parsed.items.length === 0 && parsed.totalCents == null && (
              <Alert variant="warning">
                Could not extract structured data. You can still enter the details manually on the
                right.
              </Alert>
            )}

            {/* Raw OCR text toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowRawText(!showRawText)}
                className="text-xs text-stone-500 hover:text-stone-400 underline"
              >
                {showRawText ? 'Hide raw OCR text' : 'Show raw OCR text'}
              </button>
              {showRawText && rawText && (
                <pre className="mt-2 p-3 bg-stone-800 rounded text-xs text-stone-400 overflow-auto max-h-48 whitespace-pre-wrap">
                  {rawText}
                </pre>
              )}
            </div>

            <Button variant="secondary" onClick={handleReset} className="w-full">
              Scan Another Receipt
            </Button>
          </Card>

          {/* Right: Editable Expense Form */}
          <Card className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-stone-300">Create Expense</h3>
              <Badge variant="warning">Review & Confirm</Badge>
            </div>

            <Alert variant="info">
              Review the scanned data below. Edit any fields that need correction before saving.
            </Alert>

            {/* Event selector */}
            <Select
              label="Event"
              options={[{ value: '', label: 'No event (general expense)' }, ...eventOptions]}
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Amount ($)"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <Input
                label="Date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </div>

            <Input
              label="Store/Vendor"
              type="text"
              placeholder="Store name"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />

            <Input
              label="Description"
              type="text"
              placeholder="What was this expense for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Category"
                groups={CATEGORY_GROUPS}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
              <Select
                label="Payment Method"
                options={PAYMENT_METHOD_OPTIONS}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
              />
            </div>

            {/* Business/Personal Toggle */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-stone-300">Type:</label>
              <button
                type="button"
                onClick={() => setIsBusiness(true)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  isBusiness
                    ? 'bg-brand-900 text-brand-300 ring-1 ring-brand-600'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                Business
              </button>
              <button
                type="button"
                onClick={() => setIsBusiness(false)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  !isBusiness
                    ? 'bg-amber-900 text-amber-800 ring-1 ring-amber-300'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                Personal
              </button>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} loading={saving}>
                Create Expense
              </Button>
              <Button variant="secondary" onClick={() => router.push('/expenses')}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
