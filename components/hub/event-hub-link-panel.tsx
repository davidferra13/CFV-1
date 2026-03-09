'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createCircleForEvent } from '@/lib/hub/chef-circle-actions'
import { DownloadableQrCard } from '@/components/qr/downloadable-qr-card'

interface EventHubLinkPanelProps {
  groupToken: string | null
  eventId: string
}

export function EventHubLinkPanel({ groupToken, eventId }: EventHubLinkPanelProps) {
  const [token, setToken] = useState(groupToken)
  const [isPending, startTransition] = useTransition()
  const baseUrl =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://cheflowhq.com'
  const groupUrl = token ? `${baseUrl}/hub/g/${token}` : null

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
                Create a circle to chat with the client about this event.
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">💬</span>
          <div>
            <h3 className="text-sm font-semibold text-stone-200">Dinner Circle</h3>
            <p className="text-xs text-stone-400">
              Share the existing dinner circle with guests using a direct QR invite.
            </p>
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

      {groupUrl && (
        <div className="mt-4">
          <DownloadableQrCard
            url={groupUrl}
            title="Dinner circle invite"
            description="Guests who scan this code land on the current circle page for this event."
            downloadBaseName={`dinner-circle-${token}`}
            printTitle="Dinner circle"
            printSubtitle="ChefFlow guest circle"
            openLabel="Open circle"
          />
        </div>
      )}
    </div>
  )
}
