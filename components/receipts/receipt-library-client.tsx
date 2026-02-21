'use client'

// Receipt Library Client Component
// Displays all receipts the chef has ever uploaded, across all events and standalone.
// Includes filter bar (event, client, status) and a summary totals bar.
// Each receipt shows its context label (event name or "Standalone", client name).

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { updateLineItem, approveReceiptSummary, processReceiptOCR } from '@/lib/receipts/actions'
import type { AllReceiptPhoto, EventOption, ClientOption } from '@/lib/receipts/library-actions'
import { format } from 'date-fns'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number | null | undefined): string {
  if (!cents && cents !== 0) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (!score) return null
  const label =
    score >= 0.8 ? 'High confidence' : score >= 0.5 ? 'Medium confidence' : 'Low confidence'
  const cls =
    score >= 0.8
      ? 'bg-green-100 text-green-700'
      : score >= 0.5
        ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

function StatusBadge({ status }: { status: AllReceiptPhoto['uploadStatus'] }) {
  const map: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    extracted: 'bg-sky-100 text-sky-700',
    processing: 'bg-amber-100 text-amber-700',
    pending: 'bg-stone-100 text-stone-500',
  }
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? 'bg-stone-100'}`}
    >
      {status}
    </span>
  )
}

// ─── Individual receipt block ─────────────────────────────────────────────────

function LibraryReceiptBlock({ receipt: initialReceipt }: { receipt: AllReceiptPhoto }) {
  const [receipt] = useState(initialReceipt)
  const [lineItems, setLineItems] = useState(initialReceipt.lineItems)
  const [approving, setApproving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [approved, setApproved] = useState(initialReceipt.uploadStatus === 'approved')
  const [, startTransition] = useTransition()

  const businessTotal = lineItems
    .filter((li) => li.expenseTag === 'business')
    .reduce((sum, li) => sum + (li.priceCents ?? 0), 0)

  const handleLineItemUpdate = (id: string, field: string, value: string | number | null) => {
    setLineItems((prev) =>
      prev.map((li) =>
        li.id === id
          ? {
              ...li,
              ...(field === 'expenseTag' ? { expenseTag: value as any } : {}),
              ...(field === 'ingredientCategory'
                ? { ingredientCategory: value as string | null }
                : {}),
              ...(field === 'description' ? { description: value as string } : {}),
              ...(field === 'priceCents' ? { priceCents: value as number | null } : {}),
            }
          : li
      )
    )
    startTransition(async () => {
      await updateLineItem({
        lineItemId: id,
        ...(field === 'expenseTag' ? { expenseTag: value as any } : {}),
        ...(field === 'ingredientCategory' ? { ingredientCategory: value as string | null } : {}),
        ...(field === 'description' ? { description: value as string } : {}),
        ...(field === 'priceCents' ? { priceCents: value as number | null } : {}),
      })
    })
  }

  const handleRunOCR = async () => {
    setProcessing(true)
    try {
      await processReceiptOCR(receipt.id)
      window.location.reload()
    } catch (err) {
      console.error(err)
      setProcessing(false)
    }
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      await approveReceiptSummary(receipt.id)
      setApproved(true)
    } catch (err) {
      console.error(err)
    } finally {
      setApproving(false)
    }
  }

  const { extraction } = receipt

  // Context label — event name or "Standalone"
  const contextLabel = receipt.eventName
    ? `${receipt.eventName}${receipt.eventDate ? ` · ${format(new Date(receipt.eventDate), 'MMM d, yyyy')}` : ''}`
    : 'Standalone receipt'

  return (
    <Card className={`p-4 ${approved ? 'border-green-200 bg-green-50' : ''}`}>
      <div className="flex gap-4">
        {/* Thumbnail */}
        <a href={receipt.photoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
          <div className="w-16 h-20 bg-stone-100 rounded border border-stone-200 overflow-hidden flex items-center justify-center">
            <Image
              src={receipt.photoUrl}
              alt="Receipt"
              width={64}
              height={80}
              className="object-cover w-full h-full"
              unoptimized
              onError={(e) => {
                // Signed URL may have expired on legacy records — show placeholder
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
          </div>
        </a>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-stone-900 text-sm">
                  {extraction?.storeName ?? 'Unknown Store'}
                </h3>
                <StatusBadge status={receipt.uploadStatus} />
                {!approved && receipt.uploadStatus === 'extracted' && (
                  <ConfidenceBadge score={extraction?.extractionConfidence ?? null} />
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {extraction?.purchaseDate && (
                  <span>{format(new Date(extraction.purchaseDate), 'MMM d, yyyy')} · </span>
                )}
                {extraction?.paymentMethod && <span>{extraction.paymentMethod} · </span>}
                <span className="italic">{contextLabel}</span>
                {receipt.clientName && <span> · {receipt.clientName}</span>}
              </p>
              {receipt.notes && <p className="text-xs text-stone-400 mt-0.5">{receipt.notes}</p>}
            </div>
            <div className="text-right shrink-0 ml-4">
              <div className="text-sm font-bold text-stone-900">
                {formatCents(extraction?.totalCents ?? null)}
              </div>
              {extraction?.subtotalCents != null && (
                <div className="text-xs text-stone-400">
                  sub {formatCents(extraction.subtotalCents)}
                  {extraction.taxCents ? ` + ${formatCents(extraction.taxCents)} tax` : ''}
                </div>
              )}
            </div>
          </div>

          {/* Pending state hint */}
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
                  <tr className="border-b border-stone-200">
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
                    <tr
                      key={item.id}
                      className={`border-b border-stone-100 last:border-0 ${
                        item.expenseTag === 'personal' ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="py-1.5 pr-3 text-sm text-stone-800">{item.description}</td>
                      <td className="py-1.5 pr-3 text-sm text-stone-700 text-right whitespace-nowrap">
                        {formatCents(item.priceCents)}
                      </td>
                      <td className="py-1.5 pr-3">
                        <select
                          value={item.ingredientCategory ?? ''}
                          onChange={(e) =>
                            handleLineItemUpdate(
                              item.id,
                              'ingredientCategory',
                              e.target.value || null
                            )
                          }
                          className="text-xs border border-stone-200 rounded px-1 py-0.5 text-stone-600 bg-white"
                        >
                          <option value="">—</option>
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
                          onChange={(e) =>
                            handleLineItemUpdate(item.id, 'expenseTag', e.target.value)
                          }
                          className={`text-xs border rounded px-1 py-0.5 bg-white ${
                            item.expenseTag === 'personal'
                              ? 'border-stone-200 text-stone-400'
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Totals bar */}
          {businessTotal > 0 && (
            <div className="text-xs text-stone-500 mb-3">
              Business total:{' '}
              <span className="font-semibold text-stone-700">{formatCents(businessTotal)}</span>
            </div>
          )}

          {/* Actions */}
          {!approved && (
            <div className="flex gap-2">
              {receipt.uploadStatus === 'pending' && (
                <Button size="sm" variant="secondary" onClick={handleRunOCR} disabled={processing}>
                  {processing ? 'Extracting…' : 'Auto-Extract'}
                </Button>
              )}
              {receipt.uploadStatus === 'extracted' && lineItems.length > 0 && (
                <>
                  <Button size="sm" variant="ghost" onClick={handleRunOCR} disabled={processing}>
                    Re-extract
                  </Button>
                  <Button size="sm" onClick={handleApprove} disabled={approving}>
                    {approving ? 'Approving…' : 'Approve → Add to Expenses'}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Link to per-event receipt page if tied to an event */}
          {receipt.eventId && (
            <a
              href={`/events/${receipt.eventId}/receipts`}
              className="text-xs text-stone-400 hover:text-stone-600 mt-2 block"
            >
              View in event receipts →
            </a>
          )}
        </div>
      </div>
    </Card>
  )
}

// ─── Library component ────────────────────────────────────────────────────────

type Props = {
  receipts: AllReceiptPhoto[]
  events: EventOption[]
  clients: ClientOption[]
}

export function ReceiptLibraryClient({ receipts, events, clients }: Props) {
  const [filterEventId, setFilterEventId] = useState('')
  const [filterClientId, setFilterClientId] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const filtered = receipts.filter((r) => {
    if (filterEventId && r.eventId !== filterEventId) return false
    if (filterClientId && r.clientId !== filterClientId) return false
    if (filterStatus !== 'all' && r.uploadStatus !== filterStatus) return false
    return true
  })

  const totalBusinessCents = filtered
    .filter((r) => r.uploadStatus === 'approved')
    .flatMap((r) => r.lineItems)
    .filter((li) => li.expenseTag === 'business')
    .reduce((sum, li) => sum + (li.priceCents ?? 0), 0)

  const approvedCount = filtered.filter((r) => r.uploadStatus === 'approved').length
  const pendingCount = filtered.filter((r) => r.uploadStatus !== 'approved').length

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      {(events.length > 0 || clients.length > 0) && (
        <div className="flex flex-wrap gap-3 items-center bg-stone-50 rounded-lg px-4 py-3 border border-stone-200">
          <span className="text-xs font-medium text-stone-500 shrink-0">Filter:</span>

          <select
            value={filterEventId}
            onChange={(e) => setFilterEventId(e.target.value)}
            className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-stone-700"
          >
            <option value="">All events</option>
            <option value="__standalone__">Standalone (no event)</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.label}
              </option>
            ))}
          </select>

          {clients.length > 0 && (
            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-stone-700"
            >
              <option value="">All clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-stone-200 rounded px-2 py-1 bg-white text-stone-700"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="extracted">Extracted</option>
            <option value="approved">Approved</option>
          </select>

          {(filterEventId || filterClientId || filterStatus !== 'all') && (
            <button
              onClick={() => {
                setFilterEventId('')
                setFilterClientId('')
                setFilterStatus('all')
              }}
              className="text-xs text-stone-400 hover:text-stone-600 underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Summary bar */}
      {filtered.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm text-stone-600 bg-white border border-stone-200 rounded-lg px-4 py-3">
          <span>
            <strong>{filtered.length}</strong> receipt{filtered.length !== 1 ? 's' : ''}
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
            <span className="ml-auto font-medium text-stone-800">
              ${(totalBusinessCents / 100).toFixed(2)} business spend
            </span>
          )}
        </div>
      )}

      {/* Receipt list */}
      {filtered.length === 0 ? (
        <div className="text-sm text-stone-400 text-center py-12">
          {receipts.length === 0
            ? 'No receipts yet. Upload your first receipt above.'
            : 'No receipts match the current filters.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <LibraryReceiptBlock key={r.id} receipt={r} />
          ))}
        </div>
      )}
    </div>
  )
}
