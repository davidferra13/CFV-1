'use client'

import { useState } from 'react'
import { Receipt, Calendar, MapPin, Check, Clock, Eye } from '@/components/ui/icons'
import { Card, CardContent } from '@/components/ui/card'
import type { ClientReceipt } from '@/lib/receipts/client-receipt-actions'

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-stone-700 text-stone-300' },
  processing: { label: 'Processing', color: 'bg-blue-950/50 text-blue-400' },
  extracted: { label: 'Extracted', color: 'bg-amber-950/50 text-amber-400' },
  approved: { label: 'Approved', color: 'bg-emerald-950/50 text-emerald-400' },
}

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ReceiptsClient({ receipts }: { receipts: ClientReceipt[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  if (receipts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Receipt className="w-10 h-10 text-stone-600 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">No receipts yet.</p>
          <p className="text-stone-500 text-xs mt-1">
            Receipts from your events will appear here once your chef uploads them.
          </p>
        </CardContent>
      </Card>
    )
  }

  const selected = receipts.find((r) => r.id === selectedId)

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-stone-400">
        <span>
          {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
        </span>
        {receipts.some((r) => r.totalCents != null) && (
          <span>
            Total: {formatCents(receipts.reduce((sum, r) => sum + (r.totalCents || 0), 0))}
          </span>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {receipts.map((r) => {
          const badge = STATUS_BADGE[r.status] || STATUS_BADGE.pending
          return (
            <Card
              key={r.id}
              className="cursor-pointer hover:border-stone-600 transition-colors"
              onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
            >
              <CardContent className="pt-4 space-y-3">
                {/* Receipt image thumbnail */}
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-stone-800">
                  <img
                    src={r.photoUrl}
                    alt={r.storeName || 'Receipt'}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-stone-100 truncate">
                      {r.storeName || 'Receipt'}
                    </p>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {r.totalCents != null && (
                    <p className="text-lg font-bold text-stone-100">{formatCents(r.totalCents)}</p>
                  )}

                  {r.eventName && (
                    <p className="text-xs text-stone-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {r.eventName}
                      {r.eventDate && ` (${formatDate(r.eventDate)})`}
                    </p>
                  )}

                  {r.storeLocation && (
                    <p className="text-xs text-stone-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {r.storeLocation}
                    </p>
                  )}

                  <p className="text-xs text-stone-600">
                    {r.purchaseDate ? formatDate(r.purchaseDate) : formatDate(r.createdAt)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="max-w-2xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selected.photoUrl}
              alt={selected.storeName || 'Receipt'}
              className="w-full rounded-lg"
            />
            <div className="mt-3 text-center">
              <p className="text-sm text-stone-300">{selected.storeName}</p>
              {selected.totalCents != null && (
                <p className="text-lg font-bold text-stone-100">
                  {formatCents(selected.totalCents)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
