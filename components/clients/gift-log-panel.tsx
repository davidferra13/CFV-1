'use client'

import { useState, useTransition } from 'react'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { getGiftLog, addGiftEntry, deleteGiftEntry } from '@/lib/clients/gifting-actions'
import type { GiftEntry, GiftType, DeliveryMethod } from '@/lib/clients/gifting-actions'

const GIFT_TYPE_CONFIG: Record<GiftType, { label: string; color: string }> = {
  thank_you: { label: 'Thank You', color: 'bg-green-100 text-green-800' },
  birthday: { label: 'Birthday', color: 'bg-purple-100 text-purple-800' },
  holiday: { label: 'Holiday', color: 'bg-red-100 text-red-800' },
  milestone: { label: 'Milestone', color: 'bg-brand-100 text-brand-800' },
  apology: { label: 'Apology', color: 'bg-yellow-100 text-yellow-800' },
  custom: { label: 'Custom', color: 'bg-gray-100 text-gray-800' },
}

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  hand_delivered: 'Hand Delivered',
  shipped: 'Shipped',
  digital: 'Digital',
  with_service: 'With Service',
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function GiftLogPanel({
  clientId,
  initialGifts,
}: {
  clientId: string
  initialGifts: GiftEntry[]
}) {
  const [gifts, setGifts] = useState<GiftEntry[]>(initialGifts)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [giftType, setGiftType] = useState<GiftType>('thank_you')
  const [occasion, setOccasion] = useState('')
  const [description, setDescription] = useState('')
  const [costDollars, setCostDollars] = useState('')
  const [sentAt, setSentAt] = useState(new Date().toISOString().split('T')[0])
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('hand_delivered')
  const [notes, setNotes] = useState('')

  const totalSpentCents = gifts.reduce((sum, g) => sum + g.cost_cents, 0)

  function resetForm() {
    setGiftType('thank_you')
    setOccasion('')
    setDescription('')
    setCostDollars('')
    setSentAt(new Date().toISOString().split('T')[0])
    setDeliveryMethod('hand_delivered')
    setNotes('')
    setShowForm(false)
  }

  function handleAdd() {
    setError(null)
    const costCents = Math.round(parseFloat(costDollars || '0') * 100)
    if (costCents < 0) {
      setError('Cost cannot be negative')
      return
    }
    if (!description.trim()) {
      setError('Description is required')
      return
    }

    const previousGifts = [...gifts]

    startTransition(async () => {
      try {
        await addGiftEntry({
          client_id: clientId,
          gift_type: giftType,
          occasion,
          description: description.trim(),
          cost_cents: costCents,
          sent_at: new Date(sentAt).toISOString(),
          delivery_method: deliveryMethod,
          notes: notes.trim() || undefined,
        })
        // Refresh the list
        const updated = await getGiftLog(clientId)
        setGifts(updated)
        resetForm()
      } catch (err: any) {
        setGifts(previousGifts)
        setError(err.message || 'Failed to add gift')
      }
    })
  }

  function handleDelete(id: string) {
    setError(null)
    const previousGifts = [...gifts]
    setGifts(gifts.filter((g) => g.id !== id))

    startTransition(async () => {
      try {
        await deleteGiftEntry(id)
      } catch (err: any) {
        setGifts(previousGifts)
        setError(err.message || 'Failed to delete gift')
      }
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Gift History</h3>
          <p className="text-sm text-gray-500">
            {gifts.length} gift{gifts.length !== 1 ? 's' : ''} logged,{' '}
            {formatCents(totalSpentCents)} total
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showForm ? 'Cancel' : '+ Log Gift'}
        </button>
      </div>

      {error && <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={giftType}
                onChange={(e) => setGiftType(e.target.value as GiftType)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                {Object.entries(GIFT_TYPE_CONFIG).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Delivery</label>
              <select
                value={deliveryMethod}
                onChange={(e) => setDeliveryMethod(e.target.value as DeliveryMethod)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              >
                {Object.entries(DELIVERY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description *</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bottle of wine, handwritten card"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Occasion</label>
              <input
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                placeholder="e.g. 10th dinner"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costDollars}
                onChange={(e) => setCostDollars(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Date Sent</label>
              <input
                type="date"
                value={sentAt}
                onChange={(e) => setSentAt(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional details"
              className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={isPending}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Gift'}
          </button>
        </div>
      )}

      {gifts.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">No gifts logged yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                <th className="pb-2 pr-3">Date</th>
                <th className="pb-2 pr-3">Type</th>
                <th className="pb-2 pr-3">Description</th>
                <th className="pb-2 pr-3">Cost</th>
                <th className="pb-2 pr-3">Delivery</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {gifts.map((gift) => (
                <tr key={gift.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 text-gray-600 whitespace-nowrap">
                    {formatDate(gift.sent_at)}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${GIFT_TYPE_CONFIG[gift.gift_type]?.color || 'bg-gray-100 text-gray-800'}`}
                    >
                      {GIFT_TYPE_CONFIG[gift.gift_type]?.label || gift.gift_type}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-gray-900">
                    {gift.description}
                    {gift.occasion && <span className="ml-1 text-gray-400">({gift.occasion})</span>}
                  </td>
                  <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">
                    {formatCents(gift.cost_cents)}
                  </td>
                  <td className="py-2 pr-3 text-gray-500 text-xs">
                    {DELIVERY_LABELS[gift.delivery_method] || gift.delivery_method}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => setDeleteConfirmId(gift.id)}
                      disabled={isPending}
                      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        open={!!deleteConfirmId}
        onCancel={() => setDeleteConfirmId(null)}
        title="Delete gift?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (deleteConfirmId) handleDelete(deleteConfirmId)
          setDeleteConfirmId(null)
        }}
      />
    </div>
  )
}
