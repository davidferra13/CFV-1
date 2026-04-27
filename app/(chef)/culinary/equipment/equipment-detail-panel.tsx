'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, CheckCircle2, Clock, Wrench, AlertTriangle } from 'lucide-react'
import type { EquipmentItem, EquipmentStatus } from '@/lib/equipment/types'
import { getStatusHistory } from '@/lib/equipment/intelligence-actions'

const STATUS_OPTIONS: { value: EquipmentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'stored', label: 'Stored' },
  { value: 'broken', label: 'Broken' },
  { value: 'needs_replacement', label: 'Needs Replacement' },
  { value: 'borrowed', label: 'Borrowed' },
  { value: 'lent_out', label: 'Lent Out' },
  { value: 'missing', label: 'Missing' },
  { value: 'retired', label: 'Retired' },
]

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  active: 'success',
  stored: 'default',
  broken: 'error',
  needs_replacement: 'warning',
  borrowed: 'info',
  lent_out: 'info',
  retired: 'default',
  missing: 'error',
}

interface Props {
  item: EquipmentItem
  onClose: () => void
  onStatusChange: (id: string, status: EquipmentStatus) => void
  onQuantityChange: (id: string, delta: number) => void
  onConfirm: (id: string) => void
  onDismiss: (id: string) => void
}

export function EquipmentDetailPanel({
  item,
  onClose,
  onStatusChange,
  onQuantityChange,
  onConfirm,
  onDismiss,
}: Props) {
  const [statusHistory, setStatusHistory] = useState<any[]>([])
  const isInferred = item.item_source === 'inferred' && !item.confirmed_at

  useEffect(() => {
    getStatusHistory(item.id)
      .then(setStatusHistory)
      .catch(() => {})
  }, [item.id])

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-stone-900 border-l border-stone-700 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-stone-900/95 backdrop-blur border-b border-stone-800 px-6 py-4 flex items-start justify-between z-10">
          <div>
            <h2 className="text-lg font-semibold text-stone-100">{item.name}</h2>
            {item.canonical_name && item.canonical_name !== item.name && (
              <p className="text-xs text-stone-500">{item.canonical_name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Inferred banner */}
          {isInferred && (
            <div className="bg-brand-500/10 border border-brand-800/50 border-dashed rounded-lg p-4">
              <p className="text-sm text-brand-400 mb-3">
                This item was inferred from your recipes. Is it in your kit?
              </p>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => onConfirm(item.id)} className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Yes, I own this
                </Button>
                <Button variant="ghost" onClick={() => onDismiss(item.id)} className="flex-1">
                  No, dismiss
                </Button>
              </div>
            </div>
          )}

          {/* Status change */}
          <div>
            <label className="block text-sm text-stone-400 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onStatusChange(item.id, opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    item.status === opt.value
                      ? 'bg-brand-500/20 text-brand-400 ring-1 ring-brand-500'
                      : 'bg-stone-800 text-stone-400 hover:bg-stone-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick facts */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-stone-300">Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-500">Category</span>
                <p className="text-stone-200">{item.category || 'Uncategorized'}</p>
              </div>
              <div>
                <span className="text-stone-500">Quantity</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <button
                    onClick={() => onQuantityChange(item.id, -1)}
                    disabled={(item.quantity_owned ?? 1) <= 1}
                    className="w-6 h-6 rounded bg-stone-800 text-stone-400 hover:bg-stone-700 disabled:opacity-30 text-xs flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-stone-200 w-8 text-center">{item.quantity_owned ?? 1}</span>
                  <button
                    onClick={() => onQuantityChange(item.id, 1)}
                    className="w-6 h-6 rounded bg-stone-800 text-stone-400 hover:bg-stone-700 text-xs flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              </div>
              {item.brand && (
                <div>
                  <span className="text-stone-500">Brand</span>
                  <p className="text-stone-200">{item.brand}</p>
                </div>
              )}
              {item.model && (
                <div>
                  <span className="text-stone-500">Model</span>
                  <p className="text-stone-200">{item.model}</p>
                </div>
              )}
              {item.material && (
                <div>
                  <span className="text-stone-500">Material</span>
                  <p className="text-stone-200">{item.material}</p>
                </div>
              )}
              {item.size_label && (
                <div>
                  <span className="text-stone-500">Size</span>
                  <p className="text-stone-200">{item.size_label}</p>
                </div>
              )}
              {item.storage_location && (
                <div className="col-span-2">
                  <span className="text-stone-500">Storage</span>
                  <p className="text-stone-200">{item.storage_location}</p>
                </div>
              )}
              {item.purchase_price_cents != null && (
                <div>
                  <span className="text-stone-500">Purchase Price</span>
                  <p className="text-stone-200">${(item.purchase_price_cents / 100).toFixed(2)}</p>
                </div>
              )}
              {item.purchase_date && (
                <div>
                  <span className="text-stone-500">Purchase Date</span>
                  <p className="text-stone-200">{item.purchase_date}</p>
                </div>
              )}
              {item.last_used_at && (
                <div>
                  <span className="text-stone-500">Last Used</span>
                  <p className="text-stone-200">
                    {new Date(item.last_used_at).toLocaleDateString()}
                  </p>
                </div>
              )}
              {item.item_source !== 'manual' && (
                <div>
                  <span className="text-stone-500">Source</span>
                  <p className="text-stone-200">{item.item_source}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {item.tags && item.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-stone-300 mb-2">Tags</h3>
              <div className="flex gap-1.5 flex-wrap">
                {item.tags.map((tag) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div>
              <h3 className="text-sm font-medium text-stone-300 mb-2">Notes</h3>
              <p className="text-sm text-stone-400 bg-stone-800/50 rounded-lg p-3">{item.notes}</p>
            </div>
          )}

          {/* Status History */}
          {statusHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-stone-300 mb-2">Status History</h3>
              <div className="space-y-2">
                {statusHistory.map((entry: any) => (
                  <div key={entry.id} className="flex items-center gap-2 text-xs">
                    <Clock className="w-3 h-3 text-stone-600 shrink-0" />
                    <span className="text-stone-500">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-stone-400">
                      {entry.old_status} → {entry.new_status}
                    </span>
                    {entry.note && <span className="text-stone-600 truncate">{entry.note}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
