'use client'

import { useState, useTransition } from 'react'
import { setStaffPin, removeStaffPin, listStaffWithPinStatus } from '@/lib/devices/actions'
import { toast } from 'sonner'

interface StaffWithPin {
  id: string
  name: string
  role: string
  has_pin: boolean
}

interface StaffPinManagerProps {
  initialStaff: StaffWithPin[]
}

export function StaffPinManager({ initialStaff }: StaffPinManagerProps) {
  const [staff, setStaff] = useState(initialStaff)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  async function refresh() {
    try {
      const updated = await listStaffWithPinStatus()
      setStaff(updated)
    } catch {
      // Ignore
    }
  }

  function handleSetPin(staffId: string) {
    if (!/^\d{4,6}$/.test(pinInput)) {
      setError('PIN must be 4-6 digits')
      return
    }
    setError('')

    startTransition(async () => {
      try {
        await setStaffPin(staffId, pinInput)
        toast.success('PIN set')
        setPinInput('')
        setEditingId(null)
        await refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to set PIN')
      }
    })
  }

  function handleRemovePin(staffId: string, name: string) {
    const confirmed = window.confirm(
      `Remove PIN for ${name}? They won't be able to use kiosk devices.`
    )
    if (!confirmed) return

    startTransition(async () => {
      try {
        await removeStaffPin(staffId)
        toast.success('PIN removed')
        await refresh()
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove PIN')
      }
    })
  }

  if (staff.length === 0) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-6 text-center">
        <p className="text-stone-400">No active staff members</p>
        <p className="mt-1 text-sm text-stone-500">
          Add staff members in Settings → Staff to set up PINs
        </p>
      </div>
    )
  }

  const roleLabels: Record<string, string> = {
    sous_chef: 'Sous Chef',
    kitchen_assistant: 'Kitchen Assistant',
    service_staff: 'Service Staff',
    server: 'Server',
    bartender: 'Bartender',
    dishwasher: 'Dishwasher',
    other: 'Other',
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-stone-800 bg-stone-800/60">
            <th className="px-4 py-3 text-left font-medium text-stone-400">Staff Member</th>
            <th className="px-4 py-3 text-left font-medium text-stone-400">Role</th>
            <th className="px-4 py-3 text-left font-medium text-stone-400">PIN Status</th>
            <th className="px-4 py-3 text-left font-medium text-stone-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((s) => (
            <tr
              key={s.id}
              className="border-b border-stone-800 transition-colors hover:bg-stone-800/50"
            >
              <td className="px-4 py-3 font-medium text-stone-100">{s.name}</td>
              <td className="px-4 py-3 text-stone-400">{roleLabels[s.role] || s.role}</td>
              <td className="px-4 py-3">
                {s.has_pin ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green-800 bg-green-950 px-2.5 py-0.5 text-xs font-medium text-green-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                    Set
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-700 bg-stone-800 px-2.5 py-0.5 text-xs font-medium text-stone-400">
                    Not set
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                {editingId === s.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d*"
                      maxLength={6}
                      value={pinInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        setPinInput(val)
                        setError('')
                      }}
                      placeholder="4-6 digits"
                      className="w-24 rounded bg-stone-800 px-2 py-1.5 text-center font-mono text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSetPin(s.id)
                        if (e.key === 'Escape') {
                          setEditingId(null)
                          setPinInput('')
                          setError('')
                        }
                      }}
                    />
                    <button
                      onClick={() => handleSetPin(s.id)}
                      disabled={isPending}
                      className="rounded px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-950 disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setPinInput('')
                        setError('')
                      }}
                      className="rounded px-2 py-1 text-xs text-stone-400 hover:bg-stone-800"
                    >
                      Cancel
                    </button>
                    {error && editingId === s.id && (
                      <span className="text-xs text-red-400">{error}</span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setEditingId(s.id)
                        setPinInput('')
                        setError('')
                      }}
                      className="rounded px-2 py-1 text-xs font-medium text-brand-400 transition-colors hover:bg-brand-950"
                    >
                      {s.has_pin ? 'Change PIN' : 'Set PIN'}
                    </button>
                    {s.has_pin && (
                      <button
                        onClick={() => handleRemovePin(s.id, s.name)}
                        disabled={isPending}
                        className="rounded px-2 py-1 text-xs text-red-400 transition-colors hover:bg-red-950 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
