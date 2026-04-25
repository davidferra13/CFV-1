'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { broadcastOpenSlot } from '@/lib/hub/open-slot-actions'

interface OpenSlotFormProps {
  circleId: string
  menus: Array<{ id: string; name: string }>
  onClose: () => void
}

export function OpenSlotForm({ circleId, menus, onClose }: OpenSlotFormProps) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [menuId, setMenuId] = useState('')
  const [menuName, setMenuName] = useState('')
  const [pricePerHead, setPricePerHead] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleMenuChange = (selectedId: string) => {
    setMenuId(selectedId)
    const menu = menus.find((m) => m.id === selectedId)
    if (menu) setMenuName(menu.name)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!date || !time || !menuName || !pricePerHead || !maxGuests) {
      toast.error('Fill in all required fields')
      return
    }

    startTransition(async () => {
      try {
        const result = await broadcastOpenSlot({
          circleId,
          date,
          time,
          menuName: menuName,
          menuId: menuId || undefined,
          pricePerHead: parseFloat(pricePerHead),
          maxGuests: parseInt(maxGuests, 10),
          message: message || undefined,
        })

        if (result.success) {
          toast.success('Open slot broadcast sent!')
          onClose()
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to broadcast')
        }
      } catch {
        toast.error('Failed to broadcast open slot')
      }
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-stone-600 bg-stone-800 p-4"
    >
      <h3 className="text-sm font-semibold text-stone-200">Broadcast Open Slot</h3>
      <p className="text-xs text-stone-400">
        Let your circle know you're available. They'll get an email + in-circle notification.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-300">Date *</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-300">Time *</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-300">Menu *</label>
        {menus.length > 0 ? (
          <select
            value={menuId}
            onChange={(e) => handleMenuChange(e.target.value)}
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          >
            <option value="">Select a menu...</option>
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder="Menu name"
            required
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-300">Price/head ($) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={pricePerHead}
            onChange={(e) => setPricePerHead(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-stone-300">Max guests *</label>
          <input
            type="number"
            min="1"
            value={maxGuests}
            onChange={(e) => setMaxGuests(e.target.value)}
            required
            className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-stone-300">
          Personal note (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          placeholder="Hey everyone, I just got some amazing ingredients..."
          className="w-full rounded-lg border border-stone-600 bg-stone-700 px-3 py-2 text-sm text-stone-100"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isPending ? 'Sending...' : 'Broadcast to Circle'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-stone-700 px-4 py-2 text-sm text-stone-300 hover:bg-stone-600"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
