'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createCircleForEvent } from '@/lib/hub/chef-circle-actions'

interface EventHubLinkPanelProps {
  groupToken: string | null
  eventId: string
}

/**
 * Panel on the chef's event detail page linking to the hub group.
 * Shows "Create Circle" button if no circle exists.
 */
export function EventHubLinkPanel({ groupToken, eventId }: EventHubLinkPanelProps) {
  const [token, setToken] = useState(groupToken)
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    startTransition(async () => {
      try {
        const result = await createCircleForEvent(eventId)
        setToken(result.groupToken)
      } catch {
        // Ignore
      }
    })
  }

  if (!token) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">💬</span>
            <div>
              <h3 className="text-sm font-semibold text-stone-300">Dinner Circle</h3>
              <p className="text-xs text-stone-500">
                Create a circle to chat with the client about this event
              </p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={isPending}
            className="rounded-lg bg-[#e88f47] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? 'Creating...' : 'Create Circle'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#e88f47]/20 bg-[#e88f47]/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">💬</span>
          <div>
            <h3 className="text-sm font-semibold text-stone-200">Dinner Circle</h3>
            <p className="text-xs text-stone-400">Chat with guests about this event</p>
          </div>
        </div>
        <Link
          href={`/hub/g/${token}`}
          target="_blank"
          className="rounded-lg bg-[#e88f47] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
        >
          View Circle
        </Link>
      </div>
    </div>
  )
}
