'use client'

import Link from 'next/link'

interface EventHubLinkPanelProps {
  groupToken: string | null
}

/**
 * Panel on the chef's event detail page linking to the hub group.
 */
export function EventHubLinkPanel({ groupToken }: EventHubLinkPanelProps) {
  if (!groupToken) {
    return (
      <div className="rounded-xl border border-stone-700 bg-stone-800/50 p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">💬</span>
          <div>
            <h3 className="text-sm font-semibold text-stone-300">Social Hub</h3>
            <p className="text-xs text-stone-500">
              No hub group exists for this event yet. A group will be created when guests join.
            </p>
          </div>
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
            <h3 className="text-sm font-semibold text-stone-200">Social Hub</h3>
            <p className="text-xs text-stone-400">
              View what guests are discussing about this event
            </p>
          </div>
        </div>
        <Link
          href={`/hub/g/${groupToken}`}
          target="_blank"
          className="rounded-lg bg-[#e88f47] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
        >
          View Hub
        </Link>
      </div>
    </div>
  )
}
