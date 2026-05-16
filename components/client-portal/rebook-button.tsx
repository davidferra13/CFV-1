'use client'

import Link from 'next/link'
import { ArrowRight } from '@/components/ui/icons'

type RebookButtonProps = {
  chefName: string | null
  chefBusinessName: string | null
  rebookHref: string
  eventId: string
}

/**
 * "Book Again with [Chef]" button on completed events in client portal.
 * Links to the public inquiry form pre-filled with past event data.
 */
export function RebookButton({
  chefName,
  chefBusinessName,
  rebookHref,
  eventId,
}: RebookButtonProps) {
  const displayName = chefBusinessName || chefName || 'your chef'
  const href = `${rebookHref}?rebook=${eventId}`

  return (
    <Link
      href={href}
      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
    >
      Book again with {displayName}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}
