'use client'

import { useTransition, useState } from 'react'
import { confirmStagedClient, dismissStagedClient } from '@/lib/comms/staging-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type StagedClient = {
  id: string
  name: string
  email: string | null
  phone: string | null
  created_at: string
  staged_from_signal_id: string | null
}

export function StagedSignalsPanel({ clients }: { clients: StagedClient[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const visible = clients.filter((c) => !dismissed.has(c.id))

  if (visible.length === 0) return null

  function handleConfirm(clientId: string) {
    setError(null)
    startTransition(async () => {
      const result = await confirmStagedClient(clientId)
      if (!result.success) {
        setError(result.error || 'Failed to confirm')
      }
    })
  }

  function handleDismiss(clientId: string) {
    setError(null)
    const prev = new Set(dismissed)
    prev.add(clientId)
    setDismissed(prev)
    startTransition(async () => {
      const result = await dismissStagedClient(clientId)
      if (!result.success) {
        prev.delete(clientId)
        setDismissed(new Set(prev))
        setError(result.error || 'Failed to dismiss')
      }
    })
  }

  return (
    <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="warning">Staged</Badge>
        <span className="text-sm text-stone-300 font-medium">
          {visible.length} new contact{visible.length !== 1 ? 's' : ''} detected from messages
        </span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="space-y-2">
        {visible.map((client) => (
          <div
            key={client.id}
            className="flex items-center justify-between gap-4 rounded-md border border-stone-700 bg-stone-900 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-100 truncate">{client.name}</p>
              <p className="text-xs text-stone-400 truncate">
                {client.email || client.phone || 'No contact info'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                onClick={() => handleConfirm(client.id)}
                disabled={isPending}
              >
                Confirm
              </Button>
              <Button variant="ghost" onClick={() => handleDismiss(client.id)} disabled={isPending}>
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-stone-500">
        Confirmed contacts are added to your client list. Dismissed contacts are removed.
      </p>
    </div>
  )
}
