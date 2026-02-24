// Expense Form Component
// Supports manual entry and receipt upload with AI extraction

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { createExpense, type CreateExpenseInput } from '@/lib/expenses/actions'
import { ExpenseCategorizeSuggest } from '@/components/ai/expense-categorize-suggest'
import { EXPENSE_CATEGORY_GROUPS } from '@/lib/constants/expense-categories'
import { parseCurrencyToCents } from '@/lib/utils/currency'
import { format } from 'date-fns'

type EventOption = {
  id: string
  occasion: string | null
  event_date: string
  client: { full_name: string } | null
}

type ReceiptLineItem = {
  description: string
  quantity: number
  unitPriceCents: number
  totalPriceCents: number
  category: string
  isBusiness: boolean
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

const LINE_ITEM_CATEGORY_OPTIONS = [
  { value: 'protein', label: 'Protein' },
  { value: 'produce', label: 'Produce' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'pantry', label: 'Pantry' },
  { value: 'alcohol', label: 'Alcohol' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'personal', label: 'Personal' },
  { value: 'unknown', label: 'Unknown' },
]

export function ExpenseForm({ events, defaultEventId }: Props) {
  const router = useRouter()
  const [mode, setMode] = useState<'manual' | 'receipt'>('manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Manual form state
  const [eventId, setEventId] = useState(defaultEventId || '')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('groceries')
  const [paymentMethod, setPaymentMethod] = useState('card')
  const [vendorName, setVendorName] = useState('')
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [isBusiness, setIsBusiness] = useState(true)
  const [cardName, setCardName] = useState('')
  const [cashbackPercent, setCashbackPercent] = useState('')

  // Receipt state
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extraction, setExtraction] = useState<any>(null)
  const [lineItems, setLineItems] = useState<ReceiptLineItem[]>([])

  const eventOptions = events.map((e) => ({
    value: e.id,
    label: `${e.occasion || 'Untitled'} - ${format(new Date(e.event_date), 'MMM d')}${e.client ? ` (${e.client.full_name})` : ''}`,
  }))

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setReceiptFile(file)
    setExtraction(null)
    setLineItems([])

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setReceiptPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleExtract = async () => {
    if (!receiptFile) return

    setExtracting(true)
    setError(null)

    try {
      // Convert file to base64
      const buffer = await receiptFile.arrayBuffer()
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )

      // Call server action
      const { parseReceiptImage } = await import('@/lib/ai/parse-receipt')
      const mediaType = receiptFile.type as 'image/jpeg' | 'image/png' | 'image/webp'
      const result = await parseReceiptImage(base64, mediaType)

      setExtraction(result)

      // Convert to editable line items
      setLineItems(
        result.lineItems.map((item: any) => ({
          ...item,
          isBusiness: item.category !== 'personal',
        }))
      )

      // Pre-fill form fields from extraction
      if (result.storeName) setVendorName(result.storeName)
      if (result.purchaseDate) setExpenseDate(result.purchaseDate)
      if (result.paymentMethod) {
        const method = result.paymentMethod.toLowerCase()
        if (
          method.includes('visa') ||
          method.includes('mastercard') ||
          method.includes('amex') ||
          method.includes('card') ||
          method.includes('debit') ||
          method.includes('credit')
        ) {
          setPaymentMethod('card')
        } else if (method.includes('cash')) {
          setPaymentMethod('cash')
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract receipt data')
    } finally {
      setExtracting(false)
    }
  }

  const toggleLineItemBusiness = (index: number) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, isBusiness: !item.isBusiness } : item))
    )
  }

  const updateLineItemCategory = (index: number, newCategory: string) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, category: newCategory, isBusiness: newCategory !== 'personal' }
          : item
      )
    )
  }

  const businessTotal = lineItems
    .filter((item) => item.isBusiness)
    .reduce((sum, item) => sum + item.totalPriceCents, 0)

  const personalTotal = lineItems
    .filter((item) => !item.isBusiness)
    .reduce((sum, item) => sum + item.totalPriceCents, 0)

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!amount || !description) {
      setError('Amount and description are required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const input: CreateExpenseInput = {
        event_id: eventId || null,
        amount_cents: parseCurrencyToCents(amount),
        category: category as any,
        payment_method: paymentMethod as any,
        description,
        expense_date: expenseDate,
        vendor_name: vendorName || null,
        notes: notes || null,
        is_business: isBusiness,
        payment_card_used: cardName || null,
        card_cashback_percent: cashbackPercent ? parseFloat(cashbackPercent) : null,
      }

      await createExpense(input)
      router.push('/expenses')
    } catch (err: any) {
      setError(err.message || 'Failed to create expense')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReceipt = async () => {
    if (lineItems.length === 0) {
      setError('No line items to save')
      return
    }
    if (!eventId) {
      setError('Please select an event')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create one expense for business items
      if (businessTotal > 0) {
        const businessItems = lineItems.filter((i) => i.isBusiness)
        const businessDesc =
          businessItems.length <= 3
            ? businessItems.map((i) => i.description).join(', ')
            : `${businessItems.length} items from ${vendorName || extraction?.storeName || 'store'}`

        await createExpense({
          event_id: eventId,
          amount_cents: businessTotal,
          category: 'groceries',
          payment_method: paymentMethod as any,
          description: businessDesc,
          expense_date: expenseDate,
          vendor_name: vendorName || extraction?.storeName || null,
          notes: `Receipt extraction: ${lineItems.length} items total, ${businessItems.length} business, ${lineItems.length - businessItems.length} personal`,
          is_business: true,
        })
      }

      // Create a separate expense for personal items (tracked but excluded from profit)
      if (personalTotal > 0) {
        const personalItems = lineItems.filter((i) => !i.isBusiness)
        const personalDesc =
          personalItems.length <= 3
            ? personalItems.map((i) => i.description).join(', ')
            : `${personalItems.length} personal items from ${vendorName || extraction?.storeName || 'store'}`

        await createExpense({
          event_id: eventId,
          amount_cents: personalTotal,
          category: 'other',
          payment_method: paymentMethod as any,
          description: personalDesc,
          expense_date: expenseDate,
          vendor_name: vendorName || extraction?.storeName || null,
          notes: 'Personal items from mixed shopping trip',
          is_business: false,
        })
      }

      router.push('/expenses')
    } catch (err: any) {
      setError(err.message || 'Failed to save expense')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === 'manual' ? 'primary' : 'secondary'}
          onClick={() => setMode('manual')}
        >
          Manual Entry
        </Button>
        <Button
          variant={mode === 'receipt' ? 'primary' : 'secondary'}
          onClick={() => setMode('receipt')}
        >
          Receipt Upload
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Shared: Event Selection */}
      <Card className="p-6">
        <Select
          label="Event"
          options={[{ value: '', label: 'No event (general expense)' }, ...eventOptions]}
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
        />
      </Card>

      {/* Manual Entry Mode */}
      {mode === 'manual' && (
        <form onSubmit={handleSubmitManual}>
          <Card className="p-6 space-y-4">
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
              <Select
                label="Category"
                groups={CATEGORY_GROUPS}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Payment Method"
                options={PAYMENT_METHOD_OPTIONS}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
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

            <div>
              <Input
                label="Description"
                type="text"
                placeholder="What was this expense for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <div className="mt-1">
                <ExpenseCategorizeSuggest
                  description={description}
                  amountCents={parseCurrencyToCents(amount) || 0}
                  onAccept={(cat) => setCategory(cat)}
                />
              </div>
            </div>

            <Input
              label="Store/Vendor"
              type="text"
              placeholder="Where was the purchase made?"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />

            <Textarea
              label="Notes"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />

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

            {/* Card & Cashback */}
            {paymentMethod === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Card Used (optional)"
                  type="text"
                  placeholder="e.g., Amex Blue Cash Preferred"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
                <Input
                  label="Cash-Back Rate % (optional)"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 4"
                  value={cashbackPercent}
                  onChange={(e) => setCashbackPercent(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" loading={loading}>
                Save Expense
              </Button>
              <Button type="button" variant="secondary" onClick={() => router.push('/expenses')}>
                Cancel
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Receipt Upload Mode */}
      {mode === 'receipt' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-300 mb-2">Receipt Photo</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,image/webp"
                capture="environment"
                onChange={handleFileChange}
                className="block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-brand-950 file:text-brand-400 hover:file:bg-brand-900"
              />
              <p className="text-xs text-stone-500 mt-1">
                On mobile, opens camera directly. JPEG, PNG, HEIC, or WebP. Max 10MB.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Payment Method"
                options={PAYMENT_METHOD_OPTIONS}
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
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

            {receiptFile && !extraction && (
              <Button onClick={handleExtract} loading={extracting}>
                {extracting ? 'Extracting...' : 'Extract Receipt Data'}
              </Button>
            )}
          </Card>

          {/* Dual View: Receipt Photo + Extracted Data */}
          {extraction && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Original Photo */}
              <Card className="p-4">
                <h3 className="text-sm font-medium text-stone-500 mb-2">Original Receipt</h3>
                {receiptPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={receiptPreview}
                    alt="Receipt"
                    className="w-full rounded border border-stone-700"
                  />
                )}
              </Card>

              {/* Right: Extracted Data */}
              <Card className="p-4 space-y-4">
                <Alert variant="info" title="Parsed Data">
                  These line items were parsed automatically. Please review amounts and categories
                  before saving.
                </Alert>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-stone-500">Extracted Data</h3>
                    <Badge variant="info">Parsed</Badge>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      extraction.confidence === 'high'
                        ? 'bg-green-900 text-green-800'
                        : extraction.confidence === 'medium'
                          ? 'bg-yellow-900 text-yellow-800'
                          : 'bg-red-900 text-red-800'
                    }`}
                  >
                    {extraction.confidence} confidence
                  </span>
                </div>

                {/* Store info */}
                {extraction.storeName && (
                  <div className="text-sm">
                    <span className="text-stone-500">Store:</span>{' '}
                    <span className="font-medium">{extraction.storeName}</span>
                    {extraction.storeLocation && (
                      <span className="text-stone-400 ml-1">({extraction.storeLocation})</span>
                    )}
                  </div>
                )}

                {/* Warnings */}
                {extraction.warnings.length > 0 && (
                  <Alert variant="warning" title="Extraction Notes">
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {extraction.warnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {/* Line Items */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-stone-300">
                    {lineItems.length} items - mark each as business or personal
                  </p>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {lineItems.map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded border text-sm ${
                          item.isBusiness
                            ? 'border-stone-700 bg-stone-900'
                            : 'border-amber-200 bg-amber-950'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.description}</p>
                          <p className="text-xs text-stone-500">
                            {item.quantity > 1
                              ? `${item.quantity} × $${(item.unitPriceCents / 100).toFixed(2)}`
                              : ''}
                          </p>
                        </div>
                        <select
                          value={item.category}
                          onChange={(e) => updateLineItemCategory(idx, e.target.value)}
                          className="text-xs border-stone-600 rounded px-1 py-0.5"
                        >
                          {LINE_ITEM_CATEGORY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                        <span className="font-medium whitespace-nowrap">
                          ${(item.totalPriceCents / 100).toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleLineItemBusiness(idx)}
                          className={`text-xs px-2 py-0.5 rounded font-medium ${
                            item.isBusiness
                              ? 'bg-brand-900 text-brand-300'
                              : 'bg-amber-900 text-amber-800'
                          }`}
                        >
                          {item.isBusiness ? 'Biz' : 'Personal'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t border-stone-700 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Business items</span>
                    <span className="font-medium">${(businessTotal / 100).toFixed(2)}</span>
                  </div>
                  {personalTotal > 0 && (
                    <div className="flex justify-between">
                      <span className="text-amber-600">
                        Personal items (excluded from food cost)
                      </span>
                      <span className="font-medium text-amber-600">
                        ${(personalTotal / 100).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1 border-t">
                    <span>Receipt total</span>
                    <span>${((businessTotal + personalTotal) / 100).toFixed(2)}</span>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSubmitReceipt} loading={loading} disabled={loading}>
                    Confirm & Save
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => router.push('/expenses')}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
