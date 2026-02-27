'use client'

import { useState, useTransition } from 'react'
import { createDevice } from '@/lib/devices/actions'
import { PairingDisplay } from './pairing-display'
import { toast } from 'sonner'

interface CreateDeviceModalProps {
  onClose: () => void
  onCreated: () => void
}

export function CreateDeviceModal({ onClose, onCreated }: CreateDeviceModalProps) {
  const [name, setName] = useState('')
  const [deviceType, setDeviceType] = useState<'ipad' | 'android' | 'browser'>('browser')
  const [locationName, setLocationName] = useState('')
  const [kioskFlow, setKioskFlow] = useState<'inquiry' | 'order'>('inquiry')
  const [requireStaffPin, setRequireStaffPin] = useState(true)
  const [idleTimeout, setIdleTimeout] = useState(90)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  // After creation — show pairing display
  const [pairingData, setPairingData] = useState<{
    pairingCode: string
    expiresAt: string
  } | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Device name is required')
      return
    }
    setError('')

    startTransition(async () => {
      try {
        const result = await createDevice({
          name: name.trim(),
          device_type: deviceType,
          location_name: locationName.trim() || undefined,
          kiosk_flow: kioskFlow,
          require_staff_pin: requireStaffPin,
          idle_timeout_seconds: idleTimeout,
        })
        setPairingData({
          pairingCode: result.pairingCode,
          expiresAt: result.expiresAt,
        })
        toast.success('Device created')
        onCreated()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create device')
      }
    })
  }

  // If pairing data is set, show the pairing display instead
  if (pairingData) {
    return (
      <PairingDisplay
        pairingCode={pairingData.pairingCode}
        expiresAt={pairingData.expiresAt}
        onClose={onClose}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-stone-900 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-stone-100">Add Device</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-stone-400 transition-colors hover:bg-stone-800 hover:text-stone-200"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-950 px-4 py-2.5 text-sm text-red-300">{error}</div>
          )}

          {/* Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">Device Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Front desk iPad"
              className="w-full rounded-lg bg-stone-800 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
          </div>

          {/* Device Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">Device Type</label>
            <select
              value={deviceType}
              onChange={(e) => setDeviceType(e.target.value as typeof deviceType)}
              className="w-full rounded-lg bg-stone-800 px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="ipad">iPad</option>
              <option value="android">Android Tablet</option>
              <option value="browser">Browser / Desktop</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">
              Location <span className="text-stone-500">(optional)</span>
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="Main kitchen, Front desk, Pop-up stand"
              className="w-full rounded-lg bg-stone-800 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Kiosk Flow */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">Kiosk Flow</label>
            <select
              value={kioskFlow}
              onChange={(e) => setKioskFlow(e.target.value as typeof kioskFlow)}
              className="w-full rounded-lg bg-stone-800 px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="inquiry">Inquiry Intake</option>
              <option value="order">POS Order Register</option>
            </select>
            <p className="mt-1 text-xs text-stone-500">
              Inquiry captures leads. Order runs the touch POS register flow.
            </p>
          </div>

          {/* Idle Timeout */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-300">
              Idle Timeout (seconds)
            </label>
            <input
              type="number"
              value={idleTimeout}
              onChange={(e) => setIdleTimeout(Math.max(10, parseInt(e.target.value) || 90))}
              min={10}
              max={3600}
              className="w-full rounded-lg bg-stone-800 px-3 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-stone-500">
              Staff session resets after this many seconds of inactivity
            </p>
          </div>

          {/* Require Staff PIN */}
          <label className="flex items-center gap-3 py-1">
            <input
              type="checkbox"
              checked={requireStaffPin}
              onChange={(e) => setRequireStaffPin(e.target.checked)}
              className="h-4 w-4 rounded border-stone-600 bg-stone-800 text-brand-500 focus:ring-brand-500"
            />
            <div>
              <span className="text-sm font-medium text-stone-200">Require Staff PIN</span>
              <p className="text-xs text-stone-500">Staff must enter a PIN to use this device</p>
            </div>
          </label>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg bg-stone-800 py-2.5 text-sm font-medium text-stone-300 transition-colors hover:bg-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="flex-1 rounded-lg bg-brand-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
            >
              {isPending ? 'Creating...' : 'Create & Get Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
