'use client'

// Client Status Badge - displays lifecycle status with inline change dropdown
// Statuses: active, dormant, repeat_ready, vip
// Chef can change status directly from the client detail header

import { useState, useTransition } from 'react'
import { updateClientStatus } from '@/lib/clients/actions'

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-900 text-emerald-800',
  dormant: 'bg-stone-700 text-stone-300',
  repeat_ready: 'bg-brand-900 text-brand-800',
  vip: 'bg-purple-900 text-purple-800',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  dormant: 'Dormant',
  repeat_ready: 'Repeat Ready',
  vip: 'VIP',
}

const ALL_STATUSES = ['active', 'repeat_ready', 'vip', 'dormant'] as const

type Props = {
  clientId: string
  initialStatus: string | null
}

export function ClientStatusBadge({ clientId, initialStatus }: Props) {
  const [status, setStatus] = useState(initialStatus ?? 'active')
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const handleChange = (newStatus: string) => {
    setOpen(false)
    const prev = status
    setStatus(newStatus)
    startTransition(async () => {
      try {
        await updateClientStatus(clientId, newStatus)
      } catch {
        setStatus(prev)
      }
    })
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity ${STATUS_STYLES[status] ?? STATUS_STYLES.active}`}
        title="Click to change status"
      >
        {STATUS_LABELS[status] ?? status}
        <svg className="h-3 w-3 opacity-60" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-1 w-36 bg-stone-900 border border-stone-700 rounded-lg shadow-lg z-20 py-1">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleChange(s)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-stone-800 transition-colors flex items-center gap-2 ${s === status ? 'font-semibold' : ''}`}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    s === 'active'
                      ? 'bg-emerald-500'
                      : s === 'dormant'
                        ? 'bg-stone-400'
                        : s === 'repeat_ready'
                          ? 'bg-brand-500'
                          : 'bg-purple-500'
                  }`}
                />
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
