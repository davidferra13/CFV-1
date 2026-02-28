'use client'

import { useState, useTransition } from 'react'
import { createRemovalRequest } from '@/lib/protection/removal-request-actions'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function RemovalRequestForm({
  clients,
  onClose,
}: {
  clients: { id: string; display_name: string }[]
  onClose: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [clientId, setClientId] = useState('')
  const [reason, setReason] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      try {
        await createRemovalRequest({
          client_id: clientId || undefined,
          reason: reason || undefined,
        })
        onClose()
      } catch (err) {
        toast.error('Failed to create removal request')
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Removal Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">
              Client (optional)
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
            >
              <option value="">General request</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-300 mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why is this content being removed?"
              className="w-full border border-stone-600 rounded px-3 py-2 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Request'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
