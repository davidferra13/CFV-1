'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { VendorCoordinationEntry } from '@/lib/vendors/vendor-coordination-actions'
import { updateVendorContactStatus } from '@/lib/vendors/vendor-coordination-actions'
import { useState, useTransition } from 'react'

type Props = {
  entry: VendorCoordinationEntry
}

const STATUS_STYLES: Record<
  string,
  { color: string; variant: 'success' | 'warning' | 'error' | 'default'; label: string }
> = {
  confirmed: { color: 'text-emerald-400', variant: 'success', label: 'Confirmed' },
  waiting: { color: 'text-amber-400', variant: 'warning', label: 'Waiting' },
  issue: { color: 'text-red-400', variant: 'error', label: 'Issue' },
  contacted: { color: 'text-stone-400', variant: 'default', label: 'Contacted' },
}

const CHANNEL_LABELS: Record<string, string> = {
  text: 'Text',
  call: 'Call',
  whatsapp: 'WhatsApp',
  email: 'Email',
  in_person: 'In Person',
  other: 'Other',
}

export function VendorContactEntry({ entry }: Props) {
  const [status, setStatus] = useState(entry.status)
  const [isPending, startTransition] = useTransition()

  const statusInfo = STATUS_STYLES[status] || STATUS_STYLES.contacted

  function handleStatusChange(newStatus: string) {
    startTransition(async () => {
      const result = await updateVendorContactStatus(entry.id, newStatus)
      if (result.success) {
        setStatus(newStatus)
      }
    })
  }

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-stone-100">{entry.vendorName}</p>
          <p className="text-xs text-stone-500">
            {CHANNEL_LABELS[entry.channel] || entry.channel} &middot;{' '}
            {new Date(entry.timestamp).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        </div>
        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      </div>

      <p className="text-sm text-stone-300">{entry.notes}</p>

      {entry.followUpDate && (
        <p className="text-xs text-stone-500">
          Follow up: {new Date(entry.followUpDate).toLocaleDateString()}
        </p>
      )}

      {/* Quick status update buttons */}
      <div className="flex gap-1.5 pt-1">
        {['contacted', 'waiting', 'confirmed', 'issue'].map((s) => (
          <button
            key={s}
            type="button"
            disabled={isPending || s === status}
            onClick={() => handleStatusChange(s)}
            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
              s === status
                ? 'bg-brand-600/30 text-brand-300 cursor-default'
                : 'bg-stone-700 text-stone-400 hover:bg-stone-600 hover:text-stone-200'
            }`}
          >
            {STATUS_STYLES[s]?.label || s}
          </button>
        ))}
      </div>
    </div>
  )
}
