// Shopping List Client Components
// Handles "Create from Event" modal and list creation interactions

'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { createShoppingListFromEvent } from '@/lib/shopping/actions'
import { toast } from 'sonner'

export function CreateFromEventButton() {
  const [showModal, setShowModal] = useState(false)
  const [eventId, setEventId] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleCreate() {
    if (!eventId.trim()) {
      toast.error('Please enter an event ID')
      return
    }

    startTransition(async () => {
      try {
        const result = await createShoppingListFromEvent(eventId.trim())
        toast.success('Shopping list created from event')
        setShowModal(false)
        setEventId('')
        router.push(`/shopping/${result.id}`)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to create list from event'
        )
      }
    })
  }

  return (
    <>
      <Button
        variant="secondary"
        className="flex items-center gap-1.5"
        onClick={() => setShowModal(true)}
      >
        <Calendar className="h-4 w-4" />
        From Event
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Create List from Event</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter the event ID to generate a shopping list from its menu and recipes.
            </p>
            <input
              type="text"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              placeholder="Event ID (UUID)"
              className="w-full px-3 py-2 border rounded-lg mb-4 text-sm"
              disabled={isPending}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowModal(false)
                  setEventId('')
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleCreate}
                disabled={isPending || !eventId.trim()}
              >
                {isPending ? 'Creating...' : 'Create List'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
