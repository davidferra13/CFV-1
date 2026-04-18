'use client'

// Receipt Summary - Interactive per-receipt review UI
// One block per uploaded receipt: store info, photo thumbnail, line items table.
// Chef can tag each line item (business/personal), edit descriptions, and approve.
// On approval, business items are written to the expenses table.

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { ReceiptPhoto, ReceiptLineItemRecord } from '@/lib/receipts/actions'
import { updateLineItem, approveReceiptSummary, processReceiptOCR } from '@/lib/receipts/actions'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/utils/currency'

function formatCentsDisplay(cents: number | null | undefined): string {
  if (!cents && cents !== 0) return '-'
  return formatCurrency(cents)
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (!score) return null
  const label =
    score >= 0.8
      ? 'High confidence'
      : score >= 0.5
        ? 'Medium confidence'
        : 'Low confidence - review carefully'
  const cls =
    score >= 0.8
      ? 'bg-green-900 text-green-700'
      : score >= 0.5
        ? 'bg-amber-900 text-amber-700'
        : 'bg-red-900 text-red-700'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

function LineItemRow({
  item,
  onUpdate,
}: {
  item: ReceiptLineItemRecord
  onUpdate: (id: string, field: string, value: string | number | null) => void
}) {
  const [editingDesc, setEditingDesc] = useState(false)
  const [desc, setDesc] = useState(item.description)

  const handleDescBlur = () => {
    setEditingDesc(false)
    if (desc !== item.description) {
      onUpdate(item.id, 'description', desc)
    }
  }

  return (
    <tr
      className={`border-b border-stone-800 last:border-0 ${item.expenseTag === 'personal' ? 'opacity-50' : ''}`}
    >
      <td className="py-1.5 pr-3 text-sm text-stone-200">
        {editingDesc ? (
          <input
            autoFocus
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={handleDescBlur}
            onKeyDown={(e) => e.key === 'Enter' && handleDescBlur()}
            className="w-full text-sm border-b border-brand-400 outline-none bg-transparent"
          />
        ) : (
          <button
            onClick={() => setEditingDesc(true)}
            className="text-left w-full hover:text-brand-400"
          >
            {item.description}
          </button>
        )}
      </td>
      <td className="py-1.5 pr-3 text-sm text-stone-300 text-right whitespace-nowrap">
        {formatCentsDisplay(item.priceCents)}
      </td>
      <td className="py-1.5 pr-3">
        <select
          value={item.ingredientCategory ?? ''}
          onChange={(e) => onUpdate(item.id, 'ingredientCategory', e.target.value || null)}
          className="text-xs border border-stone-700 rounded px-1 py-0.5 text-stone-400 bg-stone-900"
        >
          <option value="">-</option>
          <option value="protein">Protein</option>
          <option value="produce">Produce</option>
          <option value="dairy">Dairy</option>
          <option value="pantry">Pantry</option>
          <option value="alcohol">Alcohol</option>
          <option value="supplies">Supplies</option>
          <option value="personal">Personal</option>
          <option value="unknown">Unknown</option>
        </select>
      </td>
      <td className="py-1.5">
        <select
          value={item.expenseTag}
          onChange={(e) => onUpdate(item.id, 'expenseTag', e.target.value)}
          className={`text-xs border rounded px-1 py-0.5 bg-stone-900 ${
            item.expenseTag === 'personal'
              ? 'border-stone-700 text-stone-400'
              : item.expenseTag === 'business'
                ? 'border-green-200 text-green-700'
                : 'border-amber-200 text-amber-700'
          }`}
        >
          <option value="business">Business</option>
          <option value="personal">Personal</option>
          <option value="unknown">Unknown</option>
        </select>
      </td>
    </tr>
  )
}

function ReceiptBlock({ receipt: initialReceipt }: { receipt: ReceiptPhoto }) {
  const [receipt, setReceipt] = useState(initialReceipt)
  const [lineItems, setLineItems] = useState<ReceiptLineItemRecord[]>(initialReceipt.lineItems)
  const [approving, setApproving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [approved, setApproved] = useState(initialReceipt.uploadStatus === 'approved')
  const [, startTransition] = useTransition()

  const businessTotal = lineItems
    .filter((li) => li.expenseTag === 'business')
    .reduce((sum, li) => sum + (li.priceCents ?? 0), 0)
  const personalTotal = lineItems
    .filter((li) => li.expenseTag === 'personal')
    .reduce((sum, li) => sum + (li.priceCents ?? 0), 0)

  const handleLineItemUpdate = (id: string, field: string, value: string | number | null) => {
    const prevItems = lineItems

    // Optimistic update
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === id
          ? {
              ...li,
              [field === 'expenseTag'
                ? 'expenseTag'
                : field === 'ingredientCategory'
                  ? 'ingredientCategory'
                  : field]: value,
            }
          : li
      )
    )
    startTransition(async () => {
      try {
        await updateLineItem({
          lineItemId: id,
          ...(field === 'expenseTag' ? { expenseTag: value as any } : {}),
          ...(field === 'ingredientCategory' ? { ingredientCategory: value as string | null } : {}),
          ...(field === 'description' ? { description: value as string } : {}),
          ...(field === 'priceCents' ? { priceCents: value as number | null } : {}),
        })
      } catch (err) {
        console.error('[receipt-summary] Failed to update line item', err)
        setLineItems(prevItems)
        toast.error('Failed to save line item change')
      }
    })
  }

  const handleRunOCR = async () => {
    setProcessing(true)
    try {
      await processReceiptOCR(receipt.id)
      toast.success('Receipt extracted successfully')
      window.location.reload()
    } catch (err) {
      console.error('[receipt-summary] OCR extraction failed', err)
      toast.error('Failed to extract receipt data. Please try again.')
      setProcessing(false)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      await approveReceiptSummary(receipt.id)
      setApproved(true)
      toast.success('Receipt approved and added to expenses')
    } catch (err) {
      console.error('[receipt-summary] Approval failed', err)
      toast.error('Failed to approve receipt. Please try again.')
    } finally {
      setApproving(false)
    }
  }

  const { extraction } = receipt

  return (
    <Card className={`p-4 ${approved ? 'border-green-200 bg-green-950' : ''}`}>
      <div className="flex gap-4">
        {/* Thumbnail */}
        <a href={receipt.photoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <div className="w-16 h-20 bg-stone-800 rounded border border-stone-700 overflow-hidden">
            <Image
              src={receipt.photoUrl}
              alt="Receipt"
              width={64}
              height={80}
              className="object-cover w-full h-full"
              unoptimized
            />
          </div>
        </a>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-100 text-sm">
                  {extraction?.storeName ?? 'Unknown Store'}
                </h3>
                {approved && (
                  <span className="text-xs bg-green-900 text-green-700 font-medium px-2 py-0.5 rounded-full">
                    Approved
                  </span>
                )}
                {!approved && receipt.uploadStatus === 'extracted' && (
                  <ConfidenceBadge score={extraction?.extractionConfidence ?? null} />
                )}
              </div>
              <p className="text-xs text-stone-500">
                {extraction?.storeLocation && <span>{extraction.storeLocation} · </span>}
                {extraction?.purchaseDate &&
                  format(new Date(extraction.purchaseDate), 'MMM d, yyyy')}
                {extraction?.paymentMethod && <span> · {extraction.paymentMethod}</span>}
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-sm font-bold text-stone-100">
                {formatCentsDisplay(extraction?.totalCents ?? null)}
              </div>
              {extraction?.subtotalCents !== null && extraction?.subtotalCents !== undefined && (
                <div className="text-xs text-stone-400">
                  subtotal {formatCentsDisplay(extraction.subtotalCents)}
                  {extraction.taxCents ? ` + ${formatCentsDisplay(extraction.taxCents)} tax` : ''}
                </div>
              )}
            </div>
          </div>

          {/* No extraction yet */}
          {!extraction && receipt.uploadStatus !== 'approved' && (
            <div className="text-sm text-stone-500 mb-3">
              {receipt.uploadStatus === 'processing'
                ? 'Processing…'
                : 'Receipt uploaded. Run OCR to extract line items.'}
            </div>
          )}

          {/* Line items */}
          {lineItems.length > 0 && (
            <div className="mb-3 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-stone-700">
                    <th className="text-xs font-medium text-stone-400 pb-1 pr-3">Item</th>
                    <th className="text-xs font-medium text-stone-400 pb-1 pr-3 text-right">
                      Price
                    </th>
                    <th className="text-xs font-medium text-stone-400 pb-1 pr-3">Category</th>
                    <th className="text-xs font-medium text-stone-400 pb-1">Tag</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item) => (
                    <LineItemRow key={item.id} item={item} onUpdate={handleLineItemUpdate} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals bar */}
          {lineItems.length > 0 && (
            <div className="flex gap-4 text-xs text-stone-500 mb-3">
              <span>
                Business:{' '}
                <span className="font-semibold text-stone-300">
                  {formatCentsDisplay(businessTotal)}
                </span>
              </span>
              {personalTotal > 0 && (
                <span>
                  Personal:{' '}
                  <span className="font-semibold text-stone-500">
                    {formatCentsDisplay(personalTotal)}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Actions */}
          {!approved && (
            <div className="flex gap-2">
              {receipt.uploadStatus === 'pending' && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleRunOCR}
                  loading={processing}
                  disabled={processing}
                >
                  {processing ? 'Extracting…' : 'Auto-Extract'}
                </Button>
              )}
              {receipt.uploadStatus === 'extracted' && lineItems.length > 0 && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleRunOCR}
                    loading={processing}
                    disabled={processing}
                  >
                    Re-extract
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    loading={approving}
                    disabled={approving}
                  >
                    Approve → Add to Expenses
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

type Props = {
  receipts: ReceiptPhoto[]
  eventId: string
}

export function ReceiptSummaryClient({ receipts, eventId }: Props) {
  const totalBusinessCents = receipts
    .filter((r) => r.uploadStatus === 'approved')
    .flatMap((r) => r.lineItems)
    .filter((li) => li.expenseTag === 'business')
    .reduce((sum, li) => sum + (li.priceCents ?? 0), 0)

  const approvedCount = receipts.filter((r) => r.uploadStatus === 'approved').length
  const pendingCount = receipts.filter((r) => r.uploadStatus !== 'approved').length

  if (receipts.length === 0) {
    return (
      <div className="text-sm text-stone-400 text-center py-8">
        No receipts uploaded yet. Upload a receipt from the event page to get started.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      {receipts.length > 1 && (
        <div className="flex gap-6 text-sm text-stone-400 bg-stone-800 rounded-lg px-4 py-3">
          <span>
            <strong>{receipts.length}</strong> receipts total
          </span>
          {approvedCount > 0 && (
            <span>
              <strong>{approvedCount}</strong> approved
            </span>
          )}
          {pendingCount > 0 && (
            <span>
              <strong>{pendingCount}</strong> pending review
            </span>
          )}
          {totalBusinessCents > 0 && (
            <span className="ml-auto">
              Total business spend: <strong>{formatCurrency(totalBusinessCents)}</strong>
            </span>
          )}
        </div>
      )}

      {/* Receipt blocks */}
      {receipts.map((receipt) => (
        <ReceiptBlock key={receipt.id} receipt={receipt} />
      ))}
    </div>
  )
}
