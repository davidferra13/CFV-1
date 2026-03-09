'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { DEFAULT_DIETARY_CONFIRMATION_MESSAGE } from '@/lib/events/dietary-confirmation-constants'
import {
  confirmDietaryRequirements,
  getDietaryConfirmation,
  toggleDietaryConfirmationVisibility,
} from '@/lib/events/dietary-confirmation-actions'

type DietaryConfirmationChefProps = {
  eventId: string
}

type ConfirmationState = Awaited<ReturnType<typeof getDietaryConfirmation>> | null

export function DietaryConfirmationChef({ eventId }: DietaryConfirmationChefProps) {
  const [state, setState] = useState<ConfirmationState>(null)
  const [clientMessage, setClientMessage] = useState(DEFAULT_DIETARY_CONFIRMATION_MESSAGE)
  const [chefNotes, setChefNotes] = useState('')
  const [showToClient, setShowToClient] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    startTransition(async () => {
      try {
        const data = await getDietaryConfirmation(eventId)
        setState(data)
        setClientMessage(data.confirmation?.client_message ?? DEFAULT_DIETARY_CONFIRMATION_MESSAGE)
        setChefNotes(data.confirmation?.chef_notes ?? '')
        setShowToClient(data.showToClient)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to load dietary confirmation')
      }
    })
  }, [eventId])

  function handleConfirm() {
    if (!state?.client.id) return
    startTransition(async () => {
      try {
        const next = await confirmDietaryRequirements(
          eventId,
          state.client.id,
          clientMessage,
          chefNotes
        )
        setState(next)
        toast.success('Dietary accommodations confirmed')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to confirm dietary needs')
      }
    })
  }

  function handleVisibility(next: boolean) {
    setShowToClient(next)
    startTransition(async () => {
      try {
        await toggleDietaryConfirmationVisibility(next)
        toast.success(next ? 'Client dietary badge enabled' : 'Client dietary badge hidden')
      } catch (error) {
        setShowToClient((current) => !current)
        toast.error(error instanceof Error ? error.message : 'Failed to update visibility')
      }
    })
  }

  if (!state) {
    return <p className="text-sm text-stone-400">Loading dietary confirmation...</p>
  }

  const items = [
    ...(state.client.allergies ?? []),
    ...(state.client.dietary_restrictions ?? []),
    ...(state.client.dietary_protocols ?? []),
  ].filter(Boolean)

  return (
    <div className="rounded-xl border border-stone-700 bg-stone-900/60 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-stone-100">Dietary Confirmation</h4>
          <p className="mt-1 text-sm text-stone-400">
            Explicitly acknowledge that you reviewed this client&apos;s allergies and dietary needs.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-300">
          <span>Show badge to client</span>
          <Switch checked={showToClient} onCheckedChange={handleVisibility} />
        </label>
      </div>

      {state.confirmation && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success">Dietary Confirmed</Badge>
          <span className="text-xs text-stone-400">
            {new Date(state.confirmation.confirmed_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        </div>
      )}

      <div className="rounded-lg border border-stone-800 bg-stone-950/50 p-3">
        <p className="text-sm font-medium text-stone-200">{state.client.full_name}</p>
        <p className="mt-1 text-sm text-stone-400">
          {items.length > 0 ? items.join(', ') : 'No dietary restrictions on file'}
        </p>
      </div>

      <Textarea
        value={clientMessage}
        onChange={(event) => setClientMessage(event.target.value)}
        rows={3}
        placeholder="Client-facing confirmation message"
      />
      <Textarea
        value={chefNotes}
        onChange={(event) => setChefNotes(event.target.value)}
        rows={3}
        placeholder="Internal notes about accommodations"
      />

      <Button type="button" onClick={handleConfirm} loading={isPending}>
        {state.confirmation ? 'Re-confirm Dietary Accommodations' : 'Confirm Dietary Accommodations'}
      </Button>
    </div>
  )
}
