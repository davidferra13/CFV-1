'use client'

// EventCloneButton — One-click event clone with date picker and optional client selector.
// Opens an inline modal, lets the chef pick a new date and optionally reassign the client,
// then calls cloneEvent(sourceEventId, newDate, newClientId?) from clone-actions.
// Redirects to the new event detail page on success.

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cloneEvent } from '@/lib/events/clone-actions'
import { getClients } from '@/lib/clients/actions'
import { Copy, X, Calendar } from 'lucide-react'

type Props = {
  sourceEventId: string
  sourceEventName: string
}

type ClientOption = {
  id: string
  full_name: string
}

export function EventCloneButton({ sourceEventId, sourceEventName }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const [cloning, setCloning] = useState(false)

  // Load client list when modal opens
  useEffect(() => {
    if (!open) return
    setLoadingClients(true)
    getClients()
      .then((data) => {
        const mapped = (data || []).map((c: any) => ({
          id: c.id,
          full_name: c.full_name ?? c.name ?? 'Unnamed',
        }))
        setClients(mapped)
      })
      .catch(() => {
        // Non-critical — client selector just won't populate
        setClients([])
      })
      .finally(() => setLoadingClients(false))
  }, [open])

  function handleOpen() {
    setOpen(true)
    setNewDate('')
    setSelectedClientId('')
    setError(null)
  }

  function handleClose() {
    setOpen(false)
    setError(null)
  }

  function handleClone() {
    if (!newDate) {
      setError('Please select a date for the new event')
      return
    }
    setCloning(true)
    setError(null)

    startTransition(async () => {
      try {
        const result = await cloneEvent(sourceEventId, newDate, selectedClientId || undefined)
        if (result.success && result.newEventId) {
          setOpen(false)
          router.push(`/events/${result.newEventId}`)
        } else {
          setError(result.error ?? 'Failed to clone event')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to clone event')
      } finally {
        setCloning(false)
      }
    })
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={handleOpen}>
        <Copy className="h-4 w-4" />
        Clone Event
      </Button>
    )
  }

  return (
    <Card className="border-brand-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand-600" />
            Clone Event
          </CardTitle>
          <button
            type="button"
            onClick={handleClose}
            className="text-stone-400 hover:text-stone-400 transition-colors"
            aria-label="Close clone dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Creating a copy of <span className="font-medium text-stone-300">{sourceEventName}</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Date picker */}
        <Input
          label="New Event Date"
          type="date"
          value={newDate}
          onChange={(e) => setNewDate(e.target.value)}
          required
          min={new Date().toISOString().split('T')[0]}
        />

        {/* Optional client reassignment */}
        <div className="w-full">
          <label className="block text-sm font-medium text-stone-300 mb-1.5">
            Assign to Client
            <span className="text-stone-400 font-normal ml-1">(optional)</span>
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            disabled={loadingClients}
            className="block w-full rounded-lg border border-stone-600 bg-surface px-3 py-2 text-sm text-stone-100 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-stone-800 disabled:text-stone-500"
          >
            <option value="">Same as original</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.full_name}
              </option>
            ))}
          </select>
          {loadingClients && <p className="text-xs text-stone-400 mt-1">Loading clients...</p>}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            onClick={handleClone}
            disabled={cloning || !newDate}
            loading={cloning}
          >
            {cloning ? 'Cloning...' : 'Clone Event'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={cloning}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
